import { http } from './http'
import type { Address } from './address'

export type CartItem = {
  sku_id: number
  product_id: number
  product_name: string
  sku_name: string
  price_cent: number
  quantity: number
  checked: boolean
  invalid_reason?: string | null
}

export type CheckoutResult = {
  items: CartItem[]
  addresses: Address[]
  total_amount_cent: number
  discount_amount_cent: number
  pay_amount_cent: number
}

export type OrderItem = {
  product_id: number
  sku_id: number
  product_name: string
  sku_name: string
  unit_price_cent: number
  quantity: number
  total_amount_cent: number
}

export type Order = {
  id: number
  order_no: string
  payment_id: number
  merchant_id: number
  status: string
  total_amount_cent: number
  pay_amount_cent: number
  source_post_id?: number | null
  source_user_id?: number | null
  logistics_company?: string | null
  tracking_no?: string | null
  shipped_at?: string | null
  received_at?: string | null
  items: OrderItem[]
}

export type Review = {
  id: number
  status: string
}

export type Refund = {
  id: number
  order_id: number
  user_id: number
  refund_amount_cent: number
  reason_type: string
  reason: string
  status: string
  origin_order_status: string
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export const orderService = {
  listCart() {
    return http.get<unknown, { data: CartItem[] }>('/cart')
  },

  addCartItem(payload: { sku_id: number; quantity: number }) {
    return http.post<unknown, { data: CartItem[] }>('/cart', payload)
  },

  checkout() {
    return http.post<unknown, { data: CheckoutResult }>('/cart/checkout', {})
  },

  createOrder(payload: {
    client_order_token: string
    shipping_address_id?: number | null
    coupon_id?: number | null
    source_post_id?: number | null
  }) {
    return http.post<unknown, { data: { payment_id: number; order_ids: number[]; pay_amount_cent: number } }>(
      '/orders',
      payload,
    )
  },

  pay(paymentId: number) {
    return http.post(`/payments/${paymentId}/pay`)
  },

  listOrders(page = 1, pageSize = 12) {
    return http.get<unknown, { data: PageResult<Order> }>('/orders', {
      params: { page, page_size: pageSize },
    })
  },

  confirmOrder(orderId: number) {
    return http.post<unknown, { data: Order }>(`/orders/${orderId}/confirm`)
  },

  reviewOrder(orderId: number, payload: { product_id: number; score: number; content: string }) {
    return http.post<unknown, { data: Review }>(`/orders/${orderId}/reviews`, payload)
  },

  applyRefund(orderId: number, payload: { reason_type?: string; reason: string; refund_amount_cent?: number }) {
    return http.post<unknown, { data: Refund }>(`/orders/${orderId}/refunds`, payload)
  },
}
