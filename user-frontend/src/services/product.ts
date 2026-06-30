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
  skus: Array<{ id: number; name: string; price_cent: number; stock: number }>
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export const productService = {
  listProducts(page = 1, pageSize = 12) {
    return http.get<unknown, { data: PageResult<ProductListItem> }>('/products', {
      params: { page, page_size: pageSize },
    })
  },

  getProduct(productId: number) {
    return http.get<unknown, { data: ProductDetail }>(`/products/${productId}`)
  },
}
