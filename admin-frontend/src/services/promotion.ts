import { http } from './http'

export type CouponTemplate = {
  id: number
  name: string
  scope_type: string
  scope_ids: number[]
  owner_merchant_id?: number | null
  created_by_admin_id?: number | null
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

export type CouponPayload = {
  name: string
  scope_type: string
  scope_ids: number[]
  discount_type: string
  discount_value: number
  min_amount_cent: number
  total_quantity: number
  per_user_limit: number
}

export type FullDiscount = {
  id: number
  name: string
  scope_type: string
  scope_ids: number[]
  owner_merchant_id?: number | null
  created_by_admin_id?: number | null
  min_amount_cent: number
  discount_amount_cent: number
  status: string
  valid_from?: string | null
  valid_to?: string | null
}

export type FullDiscountPayload = {
  name: string
  scope_type: string
  scope_ids: number[]
  min_amount_cent: number
  discount_amount_cent: number
}

export type GroupBuyGroup = {
  id: number
  activity_id: number
  leader_user_id: number
  status: string
  joined_count: number
  group_size: number
  expire_at: string
  success_at?: string | null
}

export type GroupBuyActivity = {
  id: number
  merchant_id: number
  product_id: number
  sku_id: number
  name: string
  group_size: number
  group_price_cent: number
  status: string
  valid_from?: string | null
  valid_to?: string | null
  active_groups: GroupBuyGroup[]
}

export type GroupBuyActivityPayload = {
  product_id: number
  sku_id: number
  name: string
  group_size: number
  group_price_cent: number
  valid_from?: string | null
  valid_to?: string | null
}

export const adminPromotionService = {
  listCoupons() {
    return http.get<unknown, { data: CouponTemplate[] }>('/admin/promotions/coupons')
  },

  createCoupon(payload: CouponPayload) {
    return http.post<unknown, { data: CouponTemplate }>('/admin/promotions/coupons', payload)
  },

  updateCoupon(couponTemplateId: number, payload: Partial<CouponPayload>) {
    return http.put<unknown, { data: CouponTemplate }>(`/admin/promotions/coupons/${couponTemplateId}`, payload)
  },

  disableCoupon(couponTemplateId: number) {
    return http.post<unknown, { data: CouponTemplate }>(`/admin/promotions/coupons/${couponTemplateId}/disable`)
  },

  expireUserCoupons() {
    return http.post<unknown, { data: { expired_count: number } }>('/admin/promotions/coupons/expire')
  },

  batchGrant(couponTemplateId: number, userIds: number[]) {
    return http.post<unknown, { data: { granted_count: number; skipped_user_ids: number[] } }>(
      `/admin/promotions/coupons/${couponTemplateId}/batch-grant`,
      { user_ids: userIds },
    )
  },

  listFullDiscounts() {
    return http.get<unknown, { data: FullDiscount[] }>('/admin/promotions/full-discounts')
  },

  createFullDiscount(payload: FullDiscountPayload) {
    return http.post<unknown, { data: FullDiscount }>('/admin/promotions/full-discounts', payload)
  },

  updateFullDiscount(activityId: number, payload: Partial<FullDiscountPayload>) {
    return http.put<unknown, { data: FullDiscount }>(`/admin/promotions/full-discounts/${activityId}`, payload)
  },

  disableFullDiscount(activityId: number) {
    return http.post<unknown, { data: FullDiscount }>(`/admin/promotions/full-discounts/${activityId}/disable`)
  },

  listGroupBuys() {
    return http.get<unknown, { data: GroupBuyActivity[] }>('/admin/promotions/group-buy')
  },

  createGroupBuy(payload: GroupBuyActivityPayload) {
    return http.post<unknown, { data: GroupBuyActivity }>('/admin/promotions/group-buy', payload)
  },

  disableGroupBuy(activityId: number) {
    return http.post<unknown, { data: GroupBuyActivity }>(`/admin/promotions/group-buy/${activityId}/disable`)
  },
}
