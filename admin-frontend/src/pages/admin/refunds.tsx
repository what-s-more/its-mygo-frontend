import {
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Form,
  Image,
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
  type PageResult,
  type Refund,
  assetUrl,
} from './shared'

const { Title, Text } = Typography

export function AdminRefundsPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<Refund | null>(null)
  const [refundStatusFilter, setRefundStatusFilter] = useState<string | undefined>()

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

  async function loadRefunds(status = refundStatusFilter) {
    const data = await run<PageResult<Refund>>('售后列表', () =>
      http.get('/admin/refunds', { params: { status }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setRefunds(data?.list ?? [])
  }

  async function handleRefund(refundId: number, action: 'approve' | 'reject' | 'receive' | 'refund') {
    const actionText = {
      approve: '同意售后',
      reject: '拒绝售后',
      receive: '确认收到退货',
      refund: '确认退款完成',
    }[action]
    await run(actionText, () =>
      http.post(`/admin/refunds/${refundId}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadRefunds()
  }

  useEffect(() => {
    void loadRefunds()
  }, [])

  const refundColumns: ColumnsType<Refund> = [
    {
      title: '售后',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">售后 #{record.id}</Tag>
          <Text type="secondary">订单 #{record.order_id}</Text>
          <Text type="secondary">用户 #{record.user_id}</Text>
        </Space>
      ),
    },
    {
      title: '商品明细',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>明细 #{record.order_item_id ?? '-'}</Text>
          <Text type="secondary">商品 #{record.product_id ?? '-'} / SKU #{record.sku_id ?? '-'}</Text>
          <Tag>数量 {record.quantity}</Tag>
        </Space>
      ),
    },
    { title: '金额', dataIndex: 'refund_amount_cent', width: 110, render: (value) => `￥${yuan(value)}` },
    {
      title: '原因',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.reason_type}</Text>
          <Text type="secondary">{record.reason}</Text>
          {record.image_urls.length ? <Tag color="purple">凭证 {record.image_urls.length} 张</Tag> : null}
        </Space>
      ),
    },
    {
      title: '状态/记录',
      width: 240,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <StatusTag status={record.status} />
          {record.logs.slice(-2).map((log) => (
            <Text key={log.id} type="secondary">{log.action}：{log.message}</Text>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 260,
      render: (_, record) => (
        <Space wrap>
          <Button onClick={() => setSelectedRefundDetail(record)}>查看详情</Button>
          <Button disabled={record.status !== 'pending_approval'} onClick={() => handleRefund(record.id, 'approve')}>同意</Button>
          <Button danger disabled={record.status !== 'pending_approval'} onClick={() => handleRefund(record.id, 'reject')}>拒绝</Button>
          <Button disabled={record.status !== 'approved'} onClick={() => handleRefund(record.id, 'receive')}>确认收货</Button>
          <Button type="primary" disabled={!['approved', 'received'].includes(record.status)} onClick={() => handleRefund(record.id, 'refund')}>退款完成</Button>
        </Space>
      ),
    },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>售后处理</Title>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="售后列表" extra={<Button onClick={() => loadRefunds()}>刷新售后</Button>}>
            <Form layout="inline" className="query-form">
              <Form.Item label="售后状态">
                <Select
                  allowClear
                  style={{ width: 160 }}
                  value={refundStatusFilter}
                  onChange={(value) => {
                    setRefundStatusFilter(value)
                    void loadRefunds(value)
                  }}
                  options={[
                    { value: 'pending_approval', label: '待审核' },
                    { value: 'approved', label: '已同意' },
                    { value: 'rejected', label: '已拒绝' },
                    { value: 'received', label: '已收货' },
                    { value: 'refunded', label: '已退款' },
                  ]}
                />
              </Form.Item>
            </Form>
            <Table
              rowKey="id"
              columns={refundColumns}
              dataSource={refunds}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 1320 }}
            />
          </Card>
        </Col>
      </Row>

      <Drawer
        title={selectedRefundDetail ? `售后详情 #${selectedRefundDetail.id}` : '售后详情'}
        width={720}
        open={Boolean(selectedRefundDetail)}
        onClose={() => setSelectedRefundDetail(null)}
      >
        {selectedRefundDetail ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="售后 ID">{selectedRefundDetail.id}</Descriptions.Item>
              <Descriptions.Item label="状态"><StatusTag status={selectedRefundDetail.status} /></Descriptions.Item>
              <Descriptions.Item label="订单 ID">{selectedRefundDetail.order_id}</Descriptions.Item>
              <Descriptions.Item label="订单明细">{selectedRefundDetail.order_item_id ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="商品 / SKU">
                #{selectedRefundDetail.product_id ?? '-'} / #{selectedRefundDetail.sku_id ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用户 ID">#{selectedRefundDetail.user_id}</Descriptions.Item>
              <Descriptions.Item label="退款数量">{selectedRefundDetail.quantity}</Descriptions.Item>
              <Descriptions.Item label="退款金额">￥{yuan(selectedRefundDetail.refund_amount_cent)}</Descriptions.Item>
              <Descriptions.Item label="原因类型">{selectedRefundDetail.reason_type}</Descriptions.Item>
              <Descriptions.Item label="用户说明" span={2}>{selectedRefundDetail.reason}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="用户凭证图">
              {selectedRefundDetail.image_urls.length ? (
                <Image.PreviewGroup>
                  <Space wrap>
                    {selectedRefundDetail.image_urls.map((url) => (
                      <Image key={url} width={120} height={120} src={assetUrl(url)} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ) : (
                <Text type="secondary">用户未上传凭证图</Text>
              )}
            </Card>
            <Card size="small" title="处理记录">
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedRefundDetail.logs.length ? selectedRefundDetail.logs.map((log) => (
                  <Card size="small" key={log.id}>
                    <Space direction="vertical" size={2}>
                      <Tag>{log.action}</Tag>
                      <Text>{log.message}</Text>
                    </Space>
                  </Card>
                )) : <Text type="secondary">暂无处理记录</Text>}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <DebugLogs logs={logs} />
    </main>
  )
}
