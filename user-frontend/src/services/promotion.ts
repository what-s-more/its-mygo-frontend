import { http } from './http'

export type CouponTemplate = {
  id: number
  name: string
  scope_type: string
  scope_ids: number[]
  discount_type: string
  discount_value: number
  min_amount_cent: number
  total_quantity: number
  claimed_quantity: number
  per_user_limit: number
  status: string
  valid_from?: string | null
  valid_to?: string | null
}

export type UserCoupon = {
  id: number
  user_id: number
  coupon_template_id: number
  status: string
  order_id?: number | null
  claimed_at: string
  used_at?: string | null
  template: CouponTemplate
}

export const promotionService = {
  listCoupons() {
    return http.get<unknown, { data: CouponTemplate[] }>('/promotions/coupons')
  },

  claimCoupon(couponTemplateId: number) {
    return http.post<unknown, { data: UserCoupon }>(`/promotions/coupons/${couponTemplateId}/claim`)
  },

  listMyCoupons(status?: string) {
    return http.get<unknown, { data: UserCoupon[] }>('/promotions/my-coupons', { params: { status } })
  },
}
