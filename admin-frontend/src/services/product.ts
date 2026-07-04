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

export type Merchant = {
  id: number
  name: string
}

export type ProductDetail = {
  id: number
  name: string
  status: string
  merchant: Merchant
  skus: Array<{ id: number; name: string; price_cent: number; stock: number }>
}

export type StockLog = {
  id: number
  product_id: number
  sku_id: number
  before_stock: number
  change_quantity: number
  after_stock: number
  change_type: string
  remark: string
  admin_id?: number | null
}

export const adminProductService = {
  createMerchant(payload: MerchantCreatePayload) {
    return http.post<unknown, { data: Merchant }>('/admin/merchants', payload)
  },

  createProduct(payload: ProductCreatePayload) {
    return http.post<unknown, { data: ProductDetail }>('/admin/products', payload)
  },

  publishProduct(productId: number) {
    return http.post<unknown, { data: ProductDetail }>(`/admin/products/${productId}/publish`)
  },

  unpublishProduct(productId: number) {
    return http.post<unknown, { data: ProductDetail }>(`/admin/products/${productId}/unpublish`)
  },

  submitAudit(productId: number) {
    return http.post<unknown, { data: ProductDetail }>(`/admin/products/${productId}/submit-audit`)
  },

  auditProduct(productId: number, approved: boolean) {
    return http.post<unknown, { data: ProductDetail }>(`/admin/products/${productId}/audit`, { approved })
  },

  updateSku(productId: number, skuId: number, payload: { stock?: number; price_cent?: number }) {
    return http.patch<unknown, { data: ProductDetail }>(`/admin/products/${productId}/skus/${skuId}`, payload)
  },

  listStockLogs(productId: number, skuId: number) {
    return http.get<unknown, { data: { list: StockLog[]; total: number } }>(
      `/admin/products/${productId}/skus/${skuId}/stock-logs`,
    )
  },

  batchPublish(productIds: number[]) {
    return http.post<unknown, { data: ProductDetail[] }>('/admin/products/batch-publish', { product_ids: productIds })
  },

  batchUnpublish(productIds: number[]) {
    return http.post<unknown, { data: ProductDetail[] }>('/admin/products/batch-unpublish', {
      product_ids: productIds,
    })
  },
}
