import { Button, Card, Drawer, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd'
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
import { SESSION, type Order, type OrderDetail, type PageResult, pageList } from './shared'

const { Title, Text } = Typography

function downloadTextFile(content: string, filename: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function csvFilename(prefix: string) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
  return `${prefix}-${timestamp}.csv`
}

export function MerchantOrdersPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null)
  const [shippingForm] = Form.useForm()
  const [orderFilterForm] = Form.useForm()

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
    const formValues = values ?? orderFilterForm.getFieldsValue()
    const data = await run<PageResult<Order>>('本店订单', () =>
      http.get('/admin/orders', {
        params: { status: formValues.status || undefined },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setOrders(pageList<Order>(data))
  }

  async function loadOrderDetail(orderId: number) {
    const data = await run<OrderDetail>('订单详情', () =>
      http.get(`/admin/orders/${orderId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setSelectedOrderDetail(data)
  }

  async function exportOrdersCsv() {
    try {
      const content = await http.get<unknown, string>('/admin/orders/export', {
        responseType: 'text',
        headers: { 'X-Admin-Session': SESSION },
      })
      downloadTextFile(String(content), csvFilename('merchant-orders'))
      setLogs((items) => [{ title: '导出本店订单 CSV', ok: true, data: 'CSV 文件已下载', time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.success('本店订单 CSV 已下载')
    } catch (error) {
      const data = formatError(error)
      setLogs((items) => [{ title: '导出本店订单 CSV', ok: false, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.error('导出本店订单 CSV 失败')
    }
  }

  async function shipOrder(orderId: number) {
    const values = shippingForm.getFieldsValue()
    await run('订单发货', () =>
      http.post(
        `/admin/orders/${orderId}/ship`,
        {
          logistics_company: values.logistics_company || '商家配送',
          tracking_no: values.tracking_no || `NO${Date.now()}`,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadOrders()
    if (selectedOrderDetail?.id === orderId) {
      await loadOrderDetail(orderId)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  const orderColumns: ColumnsType<Order> = [
    {
      title: '订单',
      dataIndex: 'order_no',
      render: (value, record) => (
        <span>
          {value}
          <br />
          <Text type="secondary">#{record.id}</Text>
        </span>
      ),
    },
    { title: '用户', dataIndex: 'user_id', render: (value) => `#${value}` },
    { title: '金额', dataIndex: 'pay_amount_cent', render: (value) => `￥${yuan(value)}` },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button onClick={() => loadOrderDetail(record.id)}>详情</Button>
          <Button disabled={record.status !== 'pending_shipment'} onClick={() => shipOrder(record.id)}>
            发货
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>本店订单</Title>
        </div>
      </section>

      <Card
        title="本店订单"
        extra={(
          <Space>
            <Button onClick={() => loadOrders()}>刷新订单</Button>
            <Button onClick={exportOrdersCsv}>导出 CSV</Button>
          </Space>
        )}
      >
        <Form
          form={orderFilterForm}
          layout="inline"
          onFinish={loadOrders}
          initialValues={{ status: '' }}
          style={{ marginBottom: 16 }}
        >
          <Form.Item label="订单状态" name="status">
            <Select
              allowClear
              style={{ width: 140 }}
              options={[
                { value: 'pending_shipment', label: '待发货' },
                { value: 'shipping', label: '待收货' },
                { value: 'completed', label: '已完成' },
                { value: 'cancelled', label: '已取消' },
                { value: 'after_sale', label: '售后中' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form>
        <Table rowKey="id" columns={orderColumns} dataSource={orders} pagination={{ pageSize: 8 }} />
      </Card>

      <Drawer
        title={selectedOrderDetail ? `订单详情 #${selectedOrderDetail.id}` : '订单详情'}
        width={720}
        open={Boolean(selectedOrderDetail)}
        onClose={() => setSelectedOrderDetail(null)}
      >
        {selectedOrderDetail ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Space wrap>
              <Tag color="blue">支付单 #{selectedOrderDetail.payment_id}</Tag>
              <StatusTag status={selectedOrderDetail.status} />
              <Text>实付 ￥{yuan(selectedOrderDetail.pay_amount_cent)}</Text>
              <Text type="secondary">订单金额 ￥{yuan(selectedOrderDetail.total_amount_cent)}</Text>
            </Space>
            {selectedOrderDetail.shipping_address ? (
              <Text>
                收货：
                {selectedOrderDetail.shipping_address.receiver_name} {selectedOrderDetail.shipping_address.receiver_mobile}，
                {selectedOrderDetail.shipping_address.province}
                {selectedOrderDetail.shipping_address.city}
                {selectedOrderDetail.shipping_address.district ?? ''}
                {selectedOrderDetail.shipping_address.street ?? ''}
                {selectedOrderDetail.shipping_address.detail_address}
              </Text>
            ) : (
              <Text type="secondary">未保存收货地址快照</Text>
            )}
            {selectedOrderDetail.logistics_company ? (
              <Text type="secondary">
                物流：{selectedOrderDetail.logistics_company} / {selectedOrderDetail.tracking_no}
              </Text>
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
            <Card size="small" title="发货">
              <Form
                form={shippingForm}
                layout="inline"
                initialValues={{
                  logistics_company: '商家配送',
                  tracking_no: `NO${Date.now()}`,
                }}
                onFinish={() => shipOrder(selectedOrderDetail.id)}
              >
                <Form.Item label="物流公司" name="logistics_company">
                  <Input />
                </Form.Item>
                <Form.Item label="物流单号" name="tracking_no">
                  <Input />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={selectedOrderDetail.status !== 'pending_shipment'}
                >
                  发货
                </Button>
              </Form>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <DebugLogs logs={logs} />
    </main>
  )
}
