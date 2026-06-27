import { useEffect, useState } from 'react'

import { orderService, type Order } from '../../services/order'

export function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [message, setMessage] = useState('')

  async function loadOrders() {
    const response = await orderService.listOrders()
    setOrders(response.data.list)
  }

  useEffect(() => {
    loadOrders().catch(() => setOrders([]))
  }, [])

  async function handleConfirm(orderId: number) {
    setMessage('')
    try {
      await orderService.confirmOrder(orderId)
      await loadOrders()
      setMessage('已确认收货')
    } catch {
      setMessage('确认收货失败')
    }
  }

  async function handleReview(order: Order) {
    const firstItem = order.items[0]
    if (!firstItem) return
    setMessage('')
    try {
      const response = await orderService.reviewOrder(order.id, {
        product_id: firstItem.product_id,
        score: 5,
        content: '默认好评',
      })
      setMessage(`评价已提交，评价ID：${response.data.id}，等待管理端审核`)
    } catch {
      setMessage('评价失败')
    }
  }

  async function handleRefund(orderId: number) {
    setMessage('')
    try {
      const response = await orderService.applyRefund(orderId, { reason: '测试售后申请' })
      await loadOrders()
      setMessage(`售后申请已提交，售后ID：${response.data.id}`)
    } catch {
      setMessage('售后申请失败')
    }
  }

  return (
    <main>
      <h1>我的订单</h1>
      {orders.length > 0 ? (
        <ul>
          {orders.map((order) => (
            <li key={order.id}>
              {order.order_no} - {order.status} - ¥{(order.pay_amount_cent / 100).toFixed(2)}
              <span> 订单ID：{order.id}</span>
              <span> 支付单ID：{order.payment_id}</span>
              <span> 商品ID：{order.items[0]?.product_id ?? '无'}</span>
              <button type="button" onClick={() => handleConfirm(order.id)}>
                确认收货
              </button>
              <button type="button" onClick={() => handleReview(order)}>
                默认好评
              </button>
              <button type="button" onClick={() => handleRefund(order.id)}>
                申请售后
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无订单</p>
      )}
      {message && <p>{message}</p>}
    </main>
  )
}
