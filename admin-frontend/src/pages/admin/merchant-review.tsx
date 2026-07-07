import { Button, Card, Input, Space, Table, Tabs, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import { DebugLogs, StatusTag, formatError, pickData, type ApiLog } from '../workbench/adminShared'
import { SESSION, pageList, type MerchantApplication } from './shared'

const { Title, Text } = Typography

type TabKey = 'pending' | 'approved' | 'rejected'

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

const DEFAULT_PAGE_SIZE = 10

type PagedResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export function AdminMerchantReviewPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [applications, setApplications] = useState<MerchantApplication[]>([])
  const [rejectReason, setRejectReason] = useState('资料不完整')
  const [activeTab, setActiveTab] = useState<TabKey>('pending')
  const [pagination, setPagination] = useState({ page: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 })
  const [loading, setLoading] = useState(false)

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

  async function loadApplications(status: TabKey, page: number, pageSize: number) {
    setLoading(true)
    const data = await run<PagedResult<MerchantApplication>>('商家入驻申请', () =>
      http.get('/admin/merchant/applications', {
        params: { status, page, page_size: pageSize },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setLoading(false)
    if (!data) {
      setApplications([])
      setPagination((prev) => ({ ...prev, total: 0 }))
      return
    }
    setApplications(pageList<MerchantApplication>(data))
    setPagination({ page: data.page, pageSize: data.page_size, total: data.total })
  }

  async function auditApplication(id: number, approved: boolean) {
    await run(approved ? '入驻通过' : '入驻拒绝', () =>
      http.post(
        `/admin/merchant/applications/${id}/audit`,
        { approved, reject_reason: approved ? null : rejectReason },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadApplications(activeTab, pagination.page, pagination.pageSize)
  }

  useEffect(() => {
    void loadApplications(activeTab, 1, DEFAULT_PAGE_SIZE)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  function handleTableChange(nextPage: number, nextPageSize: number) {
    void loadApplications(activeTab, nextPage, nextPageSize || DEFAULT_PAGE_SIZE)
  }

  const applicationColumns: ColumnsType<MerchantApplication> = [
    { title: '申请 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag>, width: 100 },
    { title: '入驻资料', render: (_, row) => <span><Text strong>{row.merchant_name}</Text><br /><Text type="secondary">{row.announcement || '-'}</Text></span> },
    { title: '账号/店铺', render: (_, row) => `账号 #${row.admin_id} / 店铺 ${row.merchant_id ? `#${row.merchant_id}` : '-'}`, width: 180 },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} />, width: 120 },
    { title: '操作', key: 'action', width: 180, render: (_, row) => (
      <Space>
        <Button type="primary" disabled={row.status === 'approved'} onClick={() => auditApplication(row.id, true)}>通过</Button>
        <Button danger disabled={row.status === 'approved' || row.status === 'rejected'} onClick={() => auditApplication(row.id, false)}>拒绝</Button>
      </Space>
    ) },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Title level={1}>商家入驻审核</Title>
        </div>
      </section>

      <Card title="商家入驻审核">
        <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as TabKey)} items={TAB_ITEMS} />
        <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: 16 }}>
          <Space>
            <Text>拒绝原因：</Text>
            <Input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="审核拒绝时填写" style={{ width: 260 }} />
          </Space>
        </Space>
        <Table
          rowKey="id"
          columns={applicationColumns}
          dataSource={applications}
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handleTableChange,
          }}
        />
      </Card>

      <DebugLogs logs={logs} />
    </main>
  )
}
