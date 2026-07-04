import { Button, Card, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import { DebugLogs, StatusTag, formatError, pickData, type ApiLog } from '../workbench/adminShared'
import { SESSION, pageList, type MerchantApplication, type PageResult } from './shared'

const { Title, Text } = Typography

export function AdminMerchantReviewPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [applications, setApplications] = useState<MerchantApplication[]>([])
  const [rejectReason, setRejectReason] = useState('资料不完整')

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

  async function loadApplications(status?: string) {
    const data = await run<PageResult<MerchantApplication>>('商家入驻申请', () =>
      http.get('/admin/merchant/applications', { params: { status }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setApplications(pageList<MerchantApplication>(data))
  }

  async function auditApplication(id: number, approved: boolean) {
    await run(approved ? '入驻通过' : '入驻拒绝', () =>
      http.post(
        `/admin/merchant/applications/${id}/audit`,
        { approved, reject_reason: approved ? null : rejectReason },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadApplications()
  }

  useEffect(() => {
    void loadApplications()
  }, [])

  const applicationColumns: ColumnsType<MerchantApplication> = [
    { title: '申请 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
    { title: '入驻资料', render: (_, row) => <span><Text strong>{row.merchant_name}</Text><br /><Text type="secondary">{row.announcement || '-'}</Text></span> },
    { title: '账号/店铺', render: (_, row) => `账号 #${row.admin_id} / 店铺 ${row.merchant_id ? `#${row.merchant_id}` : '-'}` },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    { title: '操作', render: (_, row) => (
      <Space>
        <Button type="primary" disabled={row.status === 'approved'} onClick={() => auditApplication(row.id, true)}>通过</Button>
        <Button danger disabled={row.status === 'approved'} onClick={() => auditApplication(row.id, false)}>拒绝</Button>
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
        <Form layout="inline" onFinish={(values) => loadApplications(values.status)}>
          <Form.Item label="状态" name="status"><Select allowClear style={{ width: 150 }} options={[
            { value: 'pending', label: '待审核' },
            { value: 'approved', label: '已通过' },
            { value: 'rejected', label: '已拒绝' },
          ]} /></Form.Item>
          <Form.Item label="拒绝原因"><Input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></Form.Item>
          <Button type="primary" htmlType="submit">查询</Button>
          <Button onClick={() => loadApplications()}>刷新</Button>
        </Form>
        <Table rowKey="id" columns={applicationColumns} dataSource={applications} pagination={{ pageSize: 8 }} />
      </Card>

      <DebugLogs logs={logs} />
    </main>
  )
}
