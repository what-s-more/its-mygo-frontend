import { http } from './http'
import type { ProductListItem } from './product'

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
  product?: ProductListItem | null
  active_groups: GroupBuyGroup[]
}

export type GroupBuyOrderResult = {
  group: GroupBuyGroup
  order: {
    payment_id: number
    order_ids: number[]
    pay_amount_cent: number
  }
}

export const groupBuyService = {
  listActivities(params?: { merchant_id?: number }) {
    return http.get<unknown, { data: GroupBuyActivity[] }>('/group-buy/activities', { params })
  },

  startGroup(payload: {
    activity_id: number
    quantity?: number
    shipping_address_id?: number | null
    points_used?: number
    client_order_token: string
  }) {
    return http.post<unknown, { data: GroupBuyOrderResult }>('/group-buy/groups/start', {
      quantity: 1,
      ...payload,
    })
  },

  joinGroup(payload: {
    group_id: number
    quantity?: number
    shipping_address_id?: number | null
    points_used?: number
    client_order_token: string
  }) {
    return http.post<unknown, { data: GroupBuyOrderResult }>('/group-buy/groups/join', {
      quantity: 1,
      ...payload,
    })
  },
}
