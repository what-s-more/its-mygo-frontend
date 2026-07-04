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
import { SESSION, type AdminProfile, type Coupon, directList } from './shared'

const { Title, Text } = Typography

export function MerchantCouponsPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])

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

  async function loadCoupons() {
    const data = await run<Coupon[]>('本店优惠券', () => http.get('/admin/promotions/coupons', { headers: { 'X-Admin-Session': SESSION } }))
    const list = directList<Coupon>(data)
    setCoupons(merchantId ? list.filter((coupon) => coupon.owner_merchant_id === merchantId) : [])
  }

  async function createCoupon(values: { name: string; discount_yuan: number; min_yuan: number; total_quantity: number }) {
    if (!merchantId) return
    await run('创建本店优惠券', () =>
      http.post(
        '/admin/promotions/coupons',
        {
          name: values.name,
          scope_type: 'merchant',
          scope_ids: [merchantId],
          discount_type: 'amount',
          discount_value: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
          total_quantity: values.total_quantity,
          per_user_limit: 1,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadCoupons()
  }

  async function disableCoupon(couponId: number) {
    await run('停用本店优惠券', () =>
      http.post(`/admin/promotions/coupons/${couponId}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadCoupons()
  }

  useEffect(() => {
    void loadMe()
  }, [])

  useEffect(() => {
    if (!merchantId) return
    void loadCoupons()
  }, [merchantId])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>本店优惠券</Title>
        </div>
      </section>

      <Card title="本店优惠券">
        <Form layout="inline" onFinish={createCoupon} initialValues={{ discount_yuan: 5, min_yuan: 20, total_quantity: 50 }}>
          <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="优惠（元）" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
          <Form.Item label="门槛（元）" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
          <Form.Item label="数量" name="total_quantity"><InputNumber min={1} /></Form.Item>
          <Button type="primary" htmlType="submit" disabled={!merchantId}>创建优惠券</Button>
          <Button onClick={loadCoupons}>刷新</Button>
        </Form>
        <Table
          rowKey="id"
          dataSource={coupons}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '券 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
            { title: '名称', dataIndex: 'name' },
            { title: '优惠', render: (_, record) => `满 ￥${yuan(record.min_amount_cent)} 减 ￥${yuan(record.discount_value)}` },
            { title: '领取', render: (_, record) => `${record.claimed_quantity}/${record.total_quantity}` },
            { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
            { title: '操作', render: (_, record) => (<Button danger disabled={record.status !== 'active'} onClick={() => disableCoupon(record.id)}>停用</Button>) },
          ]}
        />
      </Card>

      <DebugLogs logs={logs} />
    </main>
  )
}
