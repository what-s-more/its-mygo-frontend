import { http } from './http'

export type ProductListItem = {
  id: number
  name: string
  cover_url?: string | null
  price_cent: number
  market_price_cent?: number | null
  merchant_id: number
  merchant_name: string
  sales_count: number
  tags: string[]
}

export type ProductDetail = {
  id: number
  name: string
  description: string
  cover_url?: string | null
  category_id?: number | null
  category_name?: string | null
  status: string
  sales_count: number
  images: string[]
  detail_images: string[]
  merchant: { id: number; name: string }
  skus: Array<{ id: number; name: string; price_cent: number; market_price_cent?: number | null; stock: number }>
  review_summary: { count: number; average_score?: number | null }
}

export type Merchant = {
  id: number
  name: string
  logo_url?: string | null
  announcement?: string | null
}

export type MerchantFollowStatus = {
  merchant_id: number
  followed: boolean
  follower_count: number
}

export type MerchantFollowItem = {
  merchant: Merchant
  followed_at: string
  follower_count: number
}

export type ProductFavoriteStatus = {
  product_id: number
  favorited: boolean
  favorite_count: number
}

export type ProductFavoriteItem = {
  product: ProductListItem
  favorited_at: string
  favorite_count: number
}

export type ProductReview = {
  id: number
  user_id: number
  user_nickname?: string | null
  user_avatar_url?: string | null
  order_id: number
  product_id: number
  score: number
  content: string
  image_urls: string[]
  status: string
}

export type Category = {
  id: number
  name: string
  parent_id?: number | null
  sort_order: number
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export const productService = {
  listProducts(params?: {
    keyword?: string
    category_id?: number
    merchant_id?: number
    min_price_cent?: number
    max_price_cent?: number
    sort_by?: string
    sort_order?: string
    page?: number
    page_size?: number
  }) {
    return http.get<unknown, { data: PageResult<ProductListItem> }>('/products', { params })
  },

  getMerchant(merchantId: number) {
    return http.get<unknown, { data: Merchant }>(`/merchants/${merchantId}`)
  },

  listMerchantProducts(
    merchantId: number,
    params?: {
      min_price_cent?: number
      max_price_cent?: number
      sort_by?: string
      sort_order?: string
      page?: number
      page_size?: number
    },
  ) {
    return http.get<unknown, { data: PageResult<ProductListItem> }>(`/merchants/${merchantId}/products`, { params })
  },

  getMerchantFollowStatus(merchantId: number) {
    return http.get<unknown, { data: MerchantFollowStatus }>(`/merchants/${merchantId}/follow`)
  },

  followMerchant(merchantId: number) {
    return http.post<unknown, { data: MerchantFollowStatus }>(`/merchants/${merchantId}/follow`)
  },

  unfollowMerchant(merchantId: number) {
    return http.delete<unknown, { data: MerchantFollowStatus }>(`/merchants/${merchantId}/follow`)
  },

  listFollowedMerchants(params?: { page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<MerchantFollowItem> }>('/users/followed-merchants', { params })
  },

  getProductFavoriteStatus(productId: number) {
    return http.get<unknown, { data: ProductFavoriteStatus }>(`/products/${productId}/favorite`)
  },

  favoriteProduct(productId: number) {
    return http.post<unknown, { data: ProductFavoriteStatus }>(`/products/${productId}/favorite`)
  },

  unfavoriteProduct(productId: number) {
    return http.delete<unknown, { data: ProductFavoriteStatus }>(`/products/${productId}/favorite`)
  },

  listFavoriteProducts(params?: { page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<ProductFavoriteItem> }>('/users/favorite-products', { params })
  },

  getProduct(productId: number) {
    return http.get<unknown, { data: ProductDetail }>(`/products/${productId}`)
  },

  listProductReviews(productId: number, params?: { page?: number; page_size?: number; score?: number; has_image?: boolean }) {
    return http.get<unknown, { data: PageResult<ProductReview> }>(`/products/${productId}/reviews`, { params })
  },

  listCategories() {
    return http.get<unknown, { data: Category[] }>('/categories')
  },
}
