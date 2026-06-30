import { useEffect, useState } from 'react'
import { App, Button, Card, Descriptions, Space, Statistic, Table, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { addressService, type Address } from '../../services/address'
import { orderService, type CartItem, type CheckoutResult } from '../../services/order'
import { promotionService, type UserCoupon } from '../../services/promotion'
import { DataPanel, type ApiResult } from '../../components/DataPanel'

const { Text } = Typography

function yuan(v?: number | null) {
  return ((v ?? 0) / 100).toFixed(2)
}

export function CartPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [cart, setCart] = useState<CartItem[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<ApiResult | null>(null)

  async function loadCart() {
    try {
      const r = await orderService.listCart()
      setCart(r.data)
      setLastResult({ title: '购物车', ok: true, data: r.data })
    } catch (e) {
      setLastResult({ title: '购物车', ok: false, data: e })
    }
  }

  async function loadAddresses() {
    try {
      const r = await addressService.listAddresses()
      setAddresses(r.data)
    } catch { /* ignore */ }
  }

  async function loadMyCoupons() {
    try {
      const r = await promotionService.listMyCoupons()
      setCoupons(r.data)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    void loadCart()
    void loadAddresses()
    void loadMyCoupons()
  }, [])

  async function handleCheckout() {
    try {
      const r = await orderService.checkout()
      setCheckout(r.data)
      setLastResult({ title: '结算预览', ok: true, data: r.data })
    } catch (e) {
      setLastResult({ title: '结算预览', ok: false, data: e })
      message.error('获取结算信息失败')
    }
  }

  async function handleSubmit() {
    try {
      const r = await orderService.createOrder({
        client_order_token: `order_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        shipping_address_id: selectedAddressId,
        coupon_id: selectedCouponId,
      })
      setLastResult({ title: '提交订单', ok: true, data: r.data })
      message.success('订单已提交')
      await orderService.pay(r.data.payment_id)
      message.success('模拟支付完成')
      await loadCart()
    } catch (e) {
      setLastResult({ title: '提交订单', ok: false, data: e })
      message.error('提交订单失败')
    }
  }

  const total = cart.reduce((sum, item) => sum + item.price_cent * item.quantity, 0)

  return (
    <div className="shop-page">
      <Card title="购物车" extra={<Space><Button onClick={() => void loadCart()}>刷新</Button><Button onClick={() => void handleCheckout()}>结算预览</Button><Button onClick={() => navigate('/orders')}>查看订单</Button></Space>}>
        <Table
          dataSource={cart}
          rowKey="sku_id"
          pagination={false}
          columns={[
            { title: '商品', dataIndex: 'product_name' },
            { title: '规格', dataIndex: 'sku_name' },
            { title: '单价', render: (_, item) => `￥${yuan(item.price_cent)}` },
            { title: '数量', dataIndex: 'quantity' },
            { title: '状态', render: (_, item) => item.invalid_reason || (item.checked ? '已选中' : '未选中') },
          ]}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Statistic title="合计" value={yuan(total)} prefix="￥" />
        </div>
      </Card>

      {checkout && (
        <Card title="结算确认" style={{ marginTop: 16 }}>
          <Descriptions column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="商品合计">￥{yuan(checkout.total_amount_cent)}</Descriptions.Item>
            <Descriptions.Item label="优惠">￥{yuan(checkout.discount_amount_cent)}</Descriptions.Item>
            <Descriptions.Item label="应付"><Text strong style={{ color: '#d92d20', fontSize: 18 }}>￥{yuan(checkout.pay_amount_cent)}</Text></Descriptions.Item>
          </Descriptions>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <select style={{ width: '100%', padding: '8px' }} value={selectedAddressId ?? ''} onChange={(e) => setSelectedAddressId(Number(e.target.value) || null)}>
              <option value="">选择收货地址</option>
              {addresses.map((a) => <option key={a.id} value={a.id}>{a.receiver_name} {a.city} {a.detail_address}</option>)}
            </select>
            <select style={{ width: '100%', padding: '8px' }} value={selectedCouponId ?? ''} onChange={(e) => setSelectedCouponId(Number(e.target.value) || null)}>
              <option value="">选择优惠券（可选）</option>
              {coupons.filter((c) => c.status === 'active').map((c) => <option key={c.id} value={c.id}>{c.template.name}（满￥{yuan(c.template.min_amount_cent)}减￥{yuan(c.template.discount_value)}）</option>)}
            </select>
            <Button type="primary" size="large" onClick={() => void handleSubmit()} disabled={cart.length === 0}>
              提交订单并模拟支付
            </Button>
          </Space>
        </Card>
      )}

      <DataPanel result={lastResult} />
    </div>
  )
}
