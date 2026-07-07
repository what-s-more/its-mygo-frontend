export const SESSION = 'merchant'

export type PageResult<T> = { list: T[]; total: number }

export type AdminProfile = {
  id: number
  username: string
  real_name: string
  role: string
  merchant_id?: number | null
}

export type MerchantProfile = {
  id: number
  name: string
  logo_url?: string | null
  announcement?: string | null
}

export type Category = {
  id: number
  name: string
  parent_id?: number | null
  sort_order: number
}

export type CategoryTreeItem = Category & { label: string; depth: number; parentName?: string }

export type Product = {
  id: number
  name: string
  description?: string
  cover_url?: string | null
  images?: string[]
  detail_images?: string[]
  category_id?: number | null
  status: string
  merchant: { id: number; name: string }
  skus: Array<{
    id: number
    name: string
    price_cent: number
    market_price_cent?: number | null
    stock: number
  }>
}

export type Order = {
  id: number
  order_no: string
  user_id: number
  merchant_id: number
  status: string
  pay_amount_cent: number
}

export type OrderDetail = Order & {
  payment_id: number
  total_amount_cent: number
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
  shipped_at?: string | null
  received_at?: string | null
  items: Array<{
    id: number
    product_id: number
    sku_id: number
    product_name: string
    sku_name: string
    unit_price_cent: number
    quantity: number
    total_amount_cent: number
  }>
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
  logs: Array<{ id: number; action: string; message: string }>
}

export type Coupon = {
  id: number
  name: string
  scope_type: string
  scope_ids?: number[]
  owner_merchant_id?: number | null
  created_by_admin_id?: number | null
  discount_value: number
  min_amount_cent: number
  status: string
  total_quantity: number
  claimed_quantity: number
}

export type FullDiscount = {
  id: number
  name: string
  scope_type: string
  scope_ids?: number[]
  owner_merchant_id?: number | null
  created_by_admin_id?: number | null
  min_amount_cent: number
  discount_amount_cent: number
  status: string
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
  active_groups: Array<{
    id: number
    joined_count: number
    group_size: number
    status: string
    expire_at: string
  }>
}

export type CommunityPost = {
  id: number
  type: string
  section: string
  title: string
  content: string
  image_urls: string[]
  product_ids: number[]
  topic_tags: string[]
  status: string
  author?: { id: number; nickname: string; avatar_url?: string | null }
  like_count: number
  comment_count: number
  created_at: string
}

export type CommunityComment = {
  id: number
  post_id: number
  author?: { id: number; nickname: string; avatar_url?: string | null }
  content: string
  status: string
  created_at: string
}

export function assetUrl(url?: string | null) {
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `http://localhost:8000${url}`
}

export function pageList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

export function directList<T>(data: unknown) {
  if (Array.isArray(data)) return data as T[]
  const list = (data as PageResult<T> | null)?.list
  if (Array.isArray(list)) return list as T[]
  return [] as T[]
}
