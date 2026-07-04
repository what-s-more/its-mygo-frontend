import { FormEvent, useState } from 'react'

import { adminProductService, type ProductDetail, type StockLog } from '../../services/product'

export function ProductAdminPage() {
  const [merchantName, setMerchantName] = useState('')
  const [productName, setProductName] = useState('')
  const [price, setPrice] = useState('99')
  const [productId, setProductId] = useState('')
  const [skuId, setSkuId] = useState('')
  const [stock, setStock] = useState('20')
  const [batchIds, setBatchIds] = useState('')
  const [message, setMessage] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')
  const [stockLogs, setStockLogs] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setCreatedInfo('')
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
      const publishResponse = await adminProductService.publishProduct(productResponse.data.id)
      const firstSku = publishResponse.data.skus[0]
      setMessage('商品已创建并上架')
      setCreatedInfo(
        `店铺ID：${merchantId}；商品ID：${publishResponse.data.id}；SKU ID：${firstSku?.id ?? '无'}`,
      )
    } catch {
      setMessage('创建失败，请检查管理员登录状态和表单内容')
    }
  }

  function parseProductIds() {
    return batchIds
      .split(/[,\uFF0C;；\s]+/)
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0)
  }

  async function handleSubmitAudit() {
    setMessage('')
    try {
      const response = await adminProductService.submitAudit(Number(productId))
      setMessage(`已提交审核，当前状态：${response.data.status}`)
    } catch {
      setMessage('提交审核失败')
    }
  }

  async function handleAudit(approved: boolean) {
    setMessage('')
    try {
      const response = await adminProductService.auditProduct(Number(productId), approved)
      setMessage(`审核完成，当前状态：${response.data.status}`)
    } catch {
      setMessage('审核失败，请确认当前账号为平台运营且商品处于待审核')
    }
  }

  async function handleStockUpdate() {
    setMessage('')
    try {
      const response = await adminProductService.updateSku(Number(productId), Number(skuId), {
        stock: Number(stock),
      })
      setMessage(`库存已更新，当前商品状态：${response.data.status}`)
    } catch {
      setMessage('库存更新失败')
    }
  }

  async function handleLoadStockLogs() {
    setStockLogs('')
    try {
      const response = await adminProductService.listStockLogs(Number(productId), Number(skuId))
      setStockLogs(
        response.data.list
          .map((log) => `#${log.id} ${log.before_stock} -> ${log.after_stock} (${log.change_quantity})`)
          .join('；') || '暂无库存流水',
      )
    } catch {
      setStockLogs('库存流水查询失败')
    }
  }

  async function handleBatchPublish(publish: boolean) {
    setMessage('')
    try {
      const ids = parseProductIds()
      const response = publish
        ? await adminProductService.batchPublish(ids)
        : await adminProductService.batchUnpublish(ids)
      setMessage(`批量操作完成：${response.data.map((item: ProductDetail) => `${item.id}:${item.status}`).join('，')}`)
    } catch {
      setMessage('批量操作失败，请检查商品ID和权限')
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
      <section>
        <h2>商品审核 / 库存 / 批量操作测试</h2>
        <label>
          商品 ID
          <input value={productId} onChange={(event) => setProductId(event.target.value)} />
        </label>
        <label>
          SKU ID
          <input value={skuId} onChange={(event) => setSkuId(event.target.value)} />
        </label>
        <label>
          新库存
          <input value={stock} onChange={(event) => setStock(event.target.value)} />
        </label>
        <button type="button" onClick={handleSubmitAudit}>
          提交审核
        </button>
        <button type="button" onClick={() => handleAudit(true)}>
          审核通过
        </button>
        <button type="button" onClick={() => handleAudit(false)}>
          审核拒绝
        </button>
        <button type="button" onClick={handleStockUpdate}>
          更新库存
        </button>
        <button type="button" onClick={handleLoadStockLogs}>
          查看库存流水
        </button>
        <label>
          批量商品 ID，可用中文逗号、英文逗号或空格分隔
          <input value={batchIds} onChange={(event) => setBatchIds(event.target.value)} />
        </label>
        <button type="button" onClick={() => handleBatchPublish(true)}>
          批量上架
        </button>
        <button type="button" onClick={() => handleBatchPublish(false)}>
          批量下架
        </button>
        {stockLogs && <p>{stockLogs}</p>}
      </section>
      {message && <p>{message}</p>}
      {createdInfo && <p>{createdInfo}</p>}
      <p>提示：创建成功后，用户端商品列表会显示该商品，可直接加入购物车测试。</p>
    </main>
  )
}
