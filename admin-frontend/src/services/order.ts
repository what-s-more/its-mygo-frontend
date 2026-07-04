import { http } from './http'

export type AdminOrder = {
  id: number
  order_no: string
  status: string
  pay_amount_cent: number
}

export type Review = {
  id: number
  order_id: number
  product_id: number
  score: number
  content: string
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

export const adminOrderService = {
  shipOrder(orderId: number, payload: { logistics_company: string; tracking_no: string }) {
    return http.post(`/admin/orders/${orderId}/ship`, payload)
  },

  auditReview(reviewId: number, approved: boolean) {
    return http.post<unknown, { data: Review }>(`/admin/reviews/${reviewId}/audit`, { approved })
  },

  listRefunds(params?: { status?: string; order_id?: number; user_id?: number; merchant_id?: number }) {
    return http.get<unknown, { data: { list: Refund[]; total: number } }>('/admin/refunds', { params })
  },

  approveRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/approve`)
  },

  rejectRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/reject`)
  },

  receiveRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/receive`)
  },

  finishRefund(refundId: number) {
    return http.post(`/admin/refunds/${refundId}/refund`)
  },
}
