import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { orderService, type CheckoutResult } from '../../services/order'

export function CheckoutPage() {
  const navigate = useNavigate()
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [couponId, setCouponId] = useState('')
  const [message, setMessage] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')

  useEffect(() => {
    orderService
      .checkout()
      .then((response) => {
        setCheckout(response.data)
        setSelectedAddressId(response.data.addresses.find((address) => address.is_default)?.id ?? null)
      })
      .catch(() => setCheckout(null))
  }, [])

  async function handleSubmit() {
    setMessage('')
    setCreatedInfo('')
    try {
      const orderResponse = await orderService.createOrder({
        client_order_token: crypto.randomUUID(),
        shipping_address_id: selectedAddressId,
        coupon_id: couponId ? Number(couponId) : null,
      })
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
          <p>
            商品总额：¥{(checkout.total_amount_cent / 100).toFixed(2)}；当前预估优惠：¥
            {(checkout.discount_amount_cent / 100).toFixed(2)}
          </p>
          <section>
            <h2>收货地址</h2>
            <button type="button" onClick={() => navigate('/addresses')}>
              新增收货地址
            </button>
            {checkout.addresses.length > 0 ? (
              checkout.addresses.map((address) => (
                <label key={address.id}>
                  <input
                    type="radio"
                    name="shipping_address"
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                  />
                  {address.receiver_name} {address.receiver_mobile} - {address.province}
                  {address.city}
                  {address.district ?? ''}
                  {address.detail_address}
                </label>
              ))
            ) : (
              <p>暂无地址，可先到地址页新增。当前阶段仍允许无地址下单。</p>
            )}
          </section>
          <label>
            用户券 ID
            <input value={couponId} onChange={(event) => setCouponId(event.target.value)} placeholder="可留空" />
          </label>
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
