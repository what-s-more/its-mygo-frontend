import { FormEvent, useState } from 'react'

import { adminProductService } from '../../services/product'

export function ProductAdminPage() {
  const [merchantName, setMerchantName] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('99')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    try {
      const merchantResponse = await adminProductService.createMerchant({ name: merchantName })
      const merchantId = merchantResponse.data.id
      const productResponse = await adminProductService.createProduct({
        merchant_id: merchantId,
        name: productName,
        description: '管理端快速创建的测试商品',
        image_urls: [],
        skus: [{ name: '默认规格', price_cent: Number(price) * 100, stock: 10 }],
      })
      await adminProductService.publishProduct(productResponse.data.id)
      setMessage('商品已创建并上架')
    } catch {
      setMessage('创建失败，请检查管理员登录状态和表单内容')
    }
  }

  return (
    <main>
      <h1>商品管理</h1>
      <form onSubmit={handleSubmit}>
        <label>
          店铺名称
          <input value={merchantName} onChange={(event) => setMerchantName(event.target.value)} />
        </label>
        <label>
          商品名称
          <input value={productName} onChange={(event) => setProductName(event.target.value)} />
        </label>
        <label>
          价格
          <input value={price} onChange={(event) => setPrice(event.target.value)} />
        </label>
        <button type="submit">创建并上架</button>
      </form>
      {message && <p>{message}</p>}
    </main>
  )
}
