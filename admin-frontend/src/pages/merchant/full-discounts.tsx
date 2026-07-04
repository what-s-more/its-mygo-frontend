import { Button, Card, Form, Input, InputNumber, Table, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import {
  DebugLogs,
  StatusTag,
  formatError,
  pickData,
  type ApiLog,
  yuan,
  yuanToCent,
} from '../workbench/adminShared'
import { SESSION, type AdminProfile, type FullDiscount, directList } from './shared'

const { Title, Text } = Typography

export function MerchantFullDiscountsPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [fullDiscounts, setFullDiscounts] = useState<FullDiscount[]>([])

  const merchantId = profile?.merchant_id ?? null

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

  async function loadMe() {
    const data = await run<AdminProfile>('当前商家账号', () =>
      http.get('/admin/auth/me', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setProfile(data)
  }

  async function loadFullDiscounts() {
    const data = await run<FullDiscount[]>('本店满减活动', () =>
      http.get('/admin/promotions/full-discounts', { headers: { 'X-Admin-Session': SESSION } }),
    )
    const list = directList<FullDiscount>(data)
    setFullDiscounts(merchantId ? list.filter((activity) => activity.owner_merchant_id === merchantId) : [])
  }

  async function createFullDiscount(values: { name: string; discount_yuan: number; min_yuan: number }) {
    if (!merchantId) return
    await run('创建本店满减', () =>
      http.post(
        '/admin/promotions/full-discounts',
        {
          name: values.name,
          scope_type: 'merchant',
          scope_ids: [merchantId],
          discount_amount_cent: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadFullDiscounts()
  }

  useEffect(() => {
    void loadMe()
  }, [])

  useEffect(() => {
    if (!merchantId) return
    void loadFullDiscounts()
  }, [merchantId])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>本店满减活动</Title>
        </div>
      </section>

      <Card title="本店满减活动">
        <Form layout="inline" onFinish={createFullDiscount} initialValues={{ discount_yuan: 3, min_yuan: 30 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="满（元）" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
          <Form.Item label="减（元）" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
          <Button type="primary" htmlType="submit" disabled={!merchantId}>创建满减</Button>
          <Button onClick={loadFullDiscounts}>刷新</Button>
        </Form>
        <Table
          rowKey="id"
          dataSource={fullDiscounts}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '活动 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
            { title: '名称', dataIndex: 'name' },
            { title: '规则', render: (_, record) => `每满 ￥${yuan(record.min_amount_cent)} 减 ￥${yuan(record.discount_amount_cent)}` },
            { title: '范围', render: (_, record) => `${record.scope_type} ${record.scope_ids?.join(',') || ''}` },
            { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
            { title: '操作', render: (_, record) => (
              <Button danger disabled={record.status !== 'active'} onClick={() => run('停用本店满减', () => http.post(`/admin/promotions/full-discounts/${record.id}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } })).then(loadFullDiscounts)}>停用</Button>
            ) },
          ]}
        />
      </Card>

      <DebugLogs logs={logs} />
    </main>
  )
}
