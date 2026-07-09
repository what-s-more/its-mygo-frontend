import { productService } from '../services/product'

export type ProductCoverSource = {
  product_id: number
  cover_url?: string | null
}

export async function fillMissingProductCovers<T extends ProductCoverSource>(items: T[]): Promise<T[]> {
  const missingProductIds = Array.from(
    new Set(items.filter((item) => !item.cover_url).map((item) => item.product_id).filter((id) => id > 0)),
  )
  if (missingProductIds.length === 0) return items

  const coverEntries = await Promise.all(
    missingProductIds.map(async (productId) => {
      try {
        const response = await productService.getProduct(productId)
        const product = response.data
        return [productId, product.cover_url || product.images?.[0] || null] as const
      } catch {
        return [productId, null] as const
      }
    }),
  )
  const coverMap = new Map(coverEntries)

  return items.map((item) => {
    if (item.cover_url) return item
    const coverUrl = coverMap.get(item.product_id)
    return coverUrl ? { ...item, cover_url: coverUrl } : item
  })
}
