import { http } from './http'

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
  items: OrderItem[]
}

export type Review = {
  id: number
  status: string
}

export type Refund = {
  id: number
  status: string
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

  createOrder(payload: { client_order_token: string }) {
    return http.post<unknown, { data: { payment_id: number; order_ids: number[]; pay_amount_cent: number } }>(
      '/orders',
      payload,
    )
  },

  pay(paymentId: number) {
    return http.post(`/payments/${paymentId}/pay`)
  },

  listOrders() {
    return http.get<unknown, { data: PageResult<Order> }>('/orders')
  },

  confirmOrder(orderId: number) {
    return http.post<unknown, { data: Order }>(`/orders/${orderId}/confirm`)
  },

  reviewOrder(orderId: number, payload: { product_id: number; score: number; content: string }) {
    return http.post<unknown, { data: Review }>(`/orders/${orderId}/reviews`, payload)
  },

  applyRefund(orderId: number, payload: { reason: string }) {
    return http.post<unknown, { data: Refund }>(`/orders/${orderId}/refunds`, payload)
  },
}
