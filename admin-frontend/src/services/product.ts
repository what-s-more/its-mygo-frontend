import { http } from './http'

export type MerchantCreatePayload = {
  name: string
  logo_url?: string
  announcement?: string
}

export type ProductCreatePayload = {
  merchant_id: number
  category_id?: number | null
  name: string
  description: string
  image_urls: string[]
  skus: Array<{
    name: string
    price_cent: number
    market_price_cent?: number | null
    stock: number
    spec_values?: Record<string, string>
  }>
}

export const adminProductService = {
  createMerchant(payload: MerchantCreatePayload) {
    return http.post('/admin/merchants', payload)
  },

  createProduct(payload: ProductCreatePayload) {
    return http.post('/admin/products', payload)
  },

  publishProduct(productId: number) {
    return http.post(`/admin/products/${productId}/publish`)
  },
}
