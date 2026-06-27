import { useEffect, useState } from 'react'

import { productService, type ProductListItem } from '../../services/product'
import { orderService } from '../../services/order'

export function ProductPage() {
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    productService.listProducts().then((response) => setProducts(response.data.list)).catch(() => setProducts([]))
  }, [])

  async function handleAddCart(product: ProductListItem) {
    setMessage('')
    try {
      const detailResponse = await productService.getProduct(product.id)
      const skuId = detailResponse.data.skus[0]?.id
      if (!skuId) {
        setMessage('商品暂无可购买规格')
        return
      }
      await orderService.addCartItem({ sku_id: skuId, quantity: 1 })
      setMessage('已加入购物车')
    } catch {
      setMessage('加入购物车失败，请先登录')
    }
  }

  return (
    <main>
      <h1>商品列表</h1>
      {products.length > 0 ? (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              {product.name} - ¥{(product.price_cent / 100).toFixed(2)}
              <span> 商品ID：{product.id}</span>
              <span> 店铺：{product.merchant_name}</span>
              <button type="button" onClick={() => handleAddCart(product)}>
                加入购物车
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无商品</p>
      )}
      {message && <p>{message}</p>}
    </main>
  )
}
