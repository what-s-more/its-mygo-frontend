import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, List, Modal, Popconfirm, Space, Tag, Typography } from 'antd'
import { orderService, type Order } from '../../services/order'
import { DataPanel } from '../../components/DataPanel'
import { usePage } from '../../hooks/usePage'

const { Text, Paragraph } = Typography

function yuan(v?: number | null) {
  return ((v ?? 0) / 100).toFixed(2)
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending_payment: { label: '待支付', color: 'orange' },
  paid: { label: '待发货', color: 'blue' },
  shipped: { label: '待收货', color: 'cyan' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'default' },
}

export function OrderPage() {
  const { message } = App.useApp()
  const [reviewOpen, setReviewOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = useCallback(
    (page: number, pageSize: number) => orderService.listOrders(page, pageSize),
    [],
  )
  const { page, pageSize, total, list, loading, load, changePage, lastResult, setLastResult } = usePage<Order>(fetchOrders, 10)

  useEffect(() => {
    void load(1)
  }, [load])

  async function confirmOrder(orderId: number) {
    try {
      await orderService.confirmOrder(orderId)
      message.success('已确认收货')
      await load(page)
    } catch (e) {
      setLastResult({ title: '确认收货', ok: false, data: e })
      message.error('确认收货失败')
    }
  }

  async function reviewOrder() {
    if (!selectedOrder?.items[0]) return
    try {
      await orderService.reviewOrder(selectedOrder.id, {
        product_id: selectedOrder.items[0].product_id,
        score: 5,
        content: '商品符合预期，测试评价。',
      })
      message.success('评价已提交，等待审核')
      setReviewOpen(false)
    } catch (e) {
      setLastResult({ title: '评价', ok: false, data: e })
      message.error('评价失败')
    }
  }

  async function refundOrder() {
    if (!selectedOrder) return
    try {
      await orderService.applyRefund(selectedOrder.id, {
        reason_type: 'other',
        reason: '测试售后申请',
        refund_amount_cent: selectedOrder.pay_amount_cent,
      })
      message.success('售后申请已提交')
      setRefundOpen(false)
      await load(page)
    } catch (e) {
      setLastResult({ title: '售后', ok: false, data: e })
      message.error('售后申请失败')
    }
  }

  return (
    <div className="shop-page">
      <Card title="我的订单" extra={<Button onClick={() => void load(page)}>刷新</Button>}>
        <List
          dataSource={list}
          loading={loading}
          renderItem={(order) => {
            const st = statusMap[order.status] ?? { label: order.status, color: 'default' }
            return (
              <List.Item
                actions={[
                  order.status === 'shipped' ? (
                    <Popconfirm key="confirm" title="确认收货？" onConfirm={() => void confirmOrder(order.id)}>
                      <Button type="primary" size="small">确认收货</Button>
                    </Popconfirm>
                  ) : null,
                  order.status === 'completed' ? (
                    <Button key="review" size="small" onClick={() => { setSelectedOrder(order); setReviewOpen(true) }}>评价</Button>
                  ) : null,
                  ['completed', 'paid', 'shipped'].includes(order.status) ? (
                    <Button key="refund" size="small" danger onClick={() => { setSelectedOrder(order); setRefundOpen(true) }}>申请售后</Button>
                  ) : null,
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={<Space><Text strong>{order.order_no}</Text><Tag color="blue">订单 #{order.id}</Tag><Tag color="blue">支付单 #{order.payment_id}</Tag><Tag color={st.color}>{st.label}</Tag></Space>}
                  description={
                    <Space direction="vertical" size={2}>
                      <Text>{order.items.map((i) => `${i.product_name} x${i.quantity}`).join('、')}</Text>
                      {order.logistics_company && <Text type="secondary">物流：{order.logistics_company} / {order.tracking_no}</Text>}
                      <Text strong style={{ color: '#d92d20', fontSize: 18 }}>￥{yuan(order.pay_amount_cent)}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: changePage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      <Modal title="确认评价" open={reviewOpen} onOk={() => void reviewOrder()} onCancel={() => setReviewOpen(false)} okText="提交评价">
        <Paragraph>将为订单 {selectedOrder?.order_no} 提交默认好评（5分）。</Paragraph>
      </Modal>

      <Modal title="申请售后" open={refundOpen} onOk={() => void refundOrder()} onCancel={() => setRefundOpen(false)} okText="提交申请" okButtonProps={{ danger: true }}>
        <Paragraph>将为订单 {selectedOrder?.order_no} 申请全额退款 ￥{yuan(selectedOrder?.pay_amount_cent)}。</Paragraph>
      </Modal>

      <DataPanel result={lastResult} />
    </div>
  )
}
