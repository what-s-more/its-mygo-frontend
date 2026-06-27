import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { orderService, type CheckoutResult } from '../../services/order'

export function CheckoutPage() {
  const navigate = useNavigate()
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [message, setMessage] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')

  useEffect(() => {
    orderService.checkout().then((response) => setCheckout(response.data)).catch(() => setCheckout(null))
  }, [])

  async function handleSubmit() {
    setMessage('')
    setCreatedInfo('')
    try {
      const orderResponse = await orderService.createOrder({ client_order_token: crypto.randomUUID() })
      await orderService.pay(orderResponse.data.payment_id)
      setCreatedInfo(`支付单ID：${orderResponse.data.payment_id}，订单ID：${orderResponse.data.order_ids.join(',')}`)
      setMessage('订单已提交并完成模拟支付，可进入订单页查看。')
    } catch {
      setMessage('提交订单失败')
    }
  }

  return (
    <main>
      <h1>结算</h1>
      {checkout ? (
        <>
          <p>应付：¥{(checkout.pay_amount_cent / 100).toFixed(2)}</p>
          <ul>
            {checkout.items.map((item) => (
              <li key={item.sku_id}>
                {item.product_name} x {item.quantity}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>暂无可结算商品</p>
      )}
      <button type="button" disabled={!checkout || checkout.items.length === 0} onClick={handleSubmit}>
        提交并模拟支付
      </button>
      <button type="button" onClick={() => navigate('/orders')}>
        查看订单
      </button>
      {createdInfo && <p>{createdInfo}</p>}
      {message && <p>{message}</p>}
    </main>
  )
}
