import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import {
  DebugLogs,
  StatusTag,
  formatError,
  pickData,
  type ApiLog,
  yuan,
} from '../workbench/adminShared'
import {
  SESSION,
  type Order,
  type OrderDetail,
  type PageResult,
} from './shared'

const { Title, Text } = Typography

export function AdminOrdersPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null)

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      const data = pickData(response)
      setLogs((items) => [{ title, ok: true, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      return data as T
    } catch (error) {
      const data = formatError(error)
      setLogs((items) => [{ title, ok: false, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.error(`${title}失败`)
      return null
    }
  }

  async function loadOrders(values?: { status?: string }) {
    const data = await run<PageResult<Order>>('订单列表', () =>
      http.get('/admin/orders', { params: values, headers: { 'X-Admin-Session': SESSION } }),
    )
    setOrders(data?.list ?? [])
  }

  async function loadOrderDetail(orderId: number) {
    const data = await run<OrderDetail>('订单详情', () =>
      http.get(`/admin/orders/${orderId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setSelectedOrderDetail(data)
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  const orderColumns: ColumnsType<Order> = [
    { title: '订单', dataIndex: 'order_no', render: (value, row) => <span>{value}<br /><Text type="secondary">#{row.id}</Text></span> },
    { title: '用户/店铺', render: (_, row) => `用户 #${row.user_id} / 店铺 #${row.merchant_id}` },
    { title: '金额', dataIndex: 'pay_amount_cent', render: (value) => `￥${yuan(value)}` },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    { title: '操作', render: (_, row) => <Button onClick={() => loadOrderDetail(row.id)}>详情</Button> },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>全平台订单</Title>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="全平台订单">
            <Form layout="inline" onFinish={loadOrders}>
              <Form.Item label="状态" name="status"><Select allowClear style={{ width: 160 }} options={[
                { value: 'pending_payment', label: '待支付' },
                { value: 'pending_shipment', label: '待发货' },
                { value: 'shipping', label: '待收货' },
                { value: 'completed', label: '已完成' },
              ]} /></Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadOrders()}>刷新</Button>
              <Button onClick={() => run('导出订单 CSV', () => http.get('/admin/orders/export', { responseType: 'text', headers: { 'X-Admin-Session': SESSION } }))}>导出 CSV</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={orders}
              pagination={{ pageSize: 8 }}
              columns={orderColumns}
            />
          </Card>
        </Col>
      </Row>

      <Drawer
        title={selectedOrderDetail ? `订单详情 #${selectedOrderDetail.id}` : '订单详情'}
        width={720}
        open={Boolean(selectedOrderDetail)}
        onClose={() => setSelectedOrderDetail(null)}
      >
        {selectedOrderDetail ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Tag color="blue">支付单 #{selectedOrderDetail.payment_id}</Tag>
              <Tag color="purple">店铺 #{selectedOrderDetail.merchant_id}</Tag>
              <StatusTag status={selectedOrderDetail.status} />
              <Text>实付 ￥{yuan(selectedOrderDetail.pay_amount_cent)}</Text>
              <Text type="secondary">订单金额 ￥{yuan(selectedOrderDetail.total_amount_cent)}</Text>
            </Space>
            {selectedOrderDetail.shipping_address ? (
              <Text>
                收货：
                {selectedOrderDetail.shipping_address.receiver_name} {selectedOrderDetail.shipping_address.receiver_mobile}，
                {selectedOrderDetail.shipping_address.province}{selectedOrderDetail.shipping_address.city}
                {selectedOrderDetail.shipping_address.district ?? ''}{selectedOrderDetail.shipping_address.street ?? ''}
                {selectedOrderDetail.shipping_address.detail_address}
              </Text>
            ) : <Text type="secondary">未保存收货地址快照</Text>}
            {selectedOrderDetail.logistics_company ? (
              <Text type="secondary">物流：{selectedOrderDetail.logistics_company} / {selectedOrderDetail.tracking_no}</Text>
            ) : null}
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={selectedOrderDetail.items}
              columns={[
                { title: '明细', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '商品', render: (_, item) => `${item.product_name} / 商品 #${item.product_id}` },
                { title: 'SKU', render: (_, item) => `${item.sku_name} / SKU #${item.sku_id}` },
                { title: '单价', dataIndex: 'unit_price_cent', render: (value) => `￥${yuan(value)}` },
                { title: '数量', dataIndex: 'quantity' },
                { title: '小计', dataIndex: 'total_amount_cent', render: (value) => `￥${yuan(value)}` },
              ]}
            />
          </Space>
        ) : null}
      </Drawer>

      <DebugLogs logs={logs} />
    </main>
  )
}
