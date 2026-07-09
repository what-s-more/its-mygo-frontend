import { http } from './http'
import type { Address } from './address'

export type CartItem = {
  sku_id: number
  product_id: number
  merchant_id: number
  merchant_name: string
  merchant_logo_url?: string | null
  product_name: string
  sku_name: string
  price_cent: number
  quantity: number
  checked: boolean
  cover_url?: string | null
  source_post_id?: number | null
  source_label?: string | null
  invalid_reason?: string | null
}

export type CheckoutResult = {
  items: CartItem[]
  addresses: Address[]
  available_full_discounts: Array<{
    id: number
    name: string
    scope_type: string
    scope_ids: number[]
    min_amount_cent: number
    discount_amount_cent: number
    applicable_amount_cent: number
    available: boolean
    unavailable_reason?: string | null
    selected: boolean
  }>
  available_coupons: Array<{
    id: number
    coupon_template_id: number
    name: string
    scope_type: string
    scope_ids: number[]
    discount_type: string
    discount_value: number
    min_amount_cent: number
    applicable_amount_cent: number
    discount_amount_cent: number
    status: string
    available: boolean
    unavailable_reason?: string | null
    selected: boolean
  }>
  selected_full_discount_id?: number | null
  selected_coupon_id?: number | null
  total_amount_cent: number
  discount_amount_cent: number
  full_discount_amount_cent: number
  coupon_discount_amount_cent: number
  points_discount_amount_cent: number
  points_used: number
  max_points_usable: number
  pay_amount_cent: number
}

export type OrderItem = {
  id: number
  product_id: number
  sku_id: number
  product_name: string
  sku_name: string
  cover_url?: string | null
  unit_price_cent: number
  quantity: number
  total_amount_cent: number
}

export type Order = {
  id: number
  order_no: string
  payment_id: number
  merchant_id: number
  merchant_name: string
  merchant_logo_url?: string | null
  status: string
  order_type?: string
  total_amount_cent: number
  pay_amount_cent: number
  full_discount_amount_cent: number
  coupon_discount_amount_cent: number
  points_discount_amount_cent: number
  points_used: number
  source_post_id?: number | null
  source_user_id?: number | null
  group_buy_activity_id?: number | null
  group_buy_group_id?: number | null
  shipping_address?: {
    receiver_name: string
    receiver_mobile: string
    province: string
    city: string
    district?: string | null
    street?: string | null
    detail_address: string
    postal_code?: string | null
    address_tag?: string | null
  } | null
  logistics_company?: string | null
  tracking_no?: string | null
  created_at?: string | null
  shipped_at?: string | null
  received_at?: string | null
  items: OrderItem[]
}

export type Payment = {
  id: number
  payment_no: string
  status: string
  pay_amount_cent: number
  points_used: number
  points_discount_amount_cent: number
  channel: string
  alipay_trade_no?: string | null
  alipay_qr_code?: string | null
  alipay_buyer_logon_id?: string | null
  order_ids: number[]
  paid_at?: string | null
}

export type AlipayPrecreateResult = {
  payment: Payment
  qr_code: string
  payment_no: string
  expire_minutes: number
}

export type Review = {
  id: number
  status: string
}

export type Refund = {
  id: number
  order_id: number
  order_item_id?: number | null
  product_id?: number | null
  sku_id?: number | null
  user_id: number
  quantity: number
  refund_amount_cent: number
  reason_type: string
  reason: string
  image_urls: string[]
  status: string
  origin_order_status: string
  created_at?: string | null
  updated_at?: string | null
  logs: {
    id: number
    operator_type: string
    operator_id?: number | null
    action: string
    message: string
    created_at?: string | null
  }[]
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

  addCartItem(payload: { sku_id: number; quantity: number; source_post_id?: number | null }) {
    return http.post<unknown, { data: CartItem[] }>('/cart', payload)
  },

  updateCartItem(skuId: number, payload: { quantity: number; checked?: boolean }) {
    return http.put<unknown, { data: CartItem[] }>(`/cart/${skuId}`, {
      checked: true,
      ...payload,
    })
  },

  deleteCartItem(skuId: number) {
    return http.delete<unknown, { data: CartItem[] }>(`/cart/${skuId}`)
  },

  batchUpdateCartItems(payload: { sku_ids: number[]; checked: boolean }) {
    return http.patch<unknown, { data: CartItem[] }>('/cart/batch', payload)
  },

  batchDeleteCartItems(payload: { sku_ids?: number[] | null } = {}) {
    return http.delete<unknown, { data: CartItem[] }>('/cart', { data: payload })
  },

  checkout(payload: { full_discount_id?: number | null; coupon_id?: number | null; points_used?: number } = {}) {
    return http.post<unknown, { data: CheckoutResult }>('/cart/checkout', payload)
  },

  createOrder(payload: {
    client_order_token: string
    shipping_address_id?: number | null
    full_discount_id?: number | null
    coupon_id?: number | null
    points_used?: number
    source_post_id?: number | null
  }) {
    return http.post<unknown, { data: { payment_id: number; order_ids: number[]; pay_amount_cent: number } }>(
      '/orders',
      payload,
    )
  },

  precreateAlipay(paymentId: number, force = false) {
    return http.post<unknown, { data: AlipayPrecreateResult }>(`/payments/${paymentId}/alipay/precreate`, undefined, {
      params: { force },
    })
  },

  syncAlipay(paymentId: number) {
    return http.post<unknown, { data: Payment }>(`/payments/${paymentId}/alipay/sync`)
  },

  getPayment(paymentId: number) {
    return http.get<unknown, { data: Payment }>(`/payments/${paymentId}`)
  },

  listOrders(params?: { status?: string; page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<Order> }>('/orders', { params })
  },

  getOrder(orderId: number) {
    return http.get<unknown, { data: Order }>(`/orders/${orderId}`)
  },

  cancelOrder(orderId: number) {
    return http.post<unknown, { data: Order }>(`/orders/${orderId}/cancel`)
  },

  confirmOrder(orderId: number) {
    return http.post<unknown, { data: Order }>(`/orders/${orderId}/confirm`)
  },

  reviewOrder(orderId: number, payload: { product_id: number; score: number; content: string; image_urls?: string[] }) {
    return http.post<unknown, { data: Review }>(`/orders/${orderId}/reviews`, payload)
  },

  applyRefund(orderId: number, payload: { order_item_id: number; quantity: number; reason_type?: string; reason: string; image_urls?: string[] }) {
    return http.post<unknown, { data: Refund }>(`/orders/${orderId}/refunds`, payload)
  },

  listRefunds(params?: { status?: string }) {
    return http.get<unknown, { data: PageResult<Refund> }>('/orders/refunds', { params })
  },

  getRefund(refundId: number) {
    return http.get<unknown, { data: Refund }>(`/orders/refunds/${refundId}`)
  },
}
