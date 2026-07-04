import { Button, Card, Col, Descriptions, Form, Input, Row, Space, Tag, Typography, message } from 'antd'
import { useState } from 'react'
import { http } from '../../services/http'
import { DebugLogs, StatusTag, formatError, pickData, type ApiLog } from './adminShared'

const { Title, Paragraph, Text } = Typography

type MerchantApplication = {
  id: number
  merchant_name: string
  announcement?: string | null
  status: string
  reject_reason?: string | null
  merchant_id?: number | null
}

export function MerchantApplyPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [application, setApplication] = useState<MerchantApplication | null>(null)
  const [loginForm] = Form.useForm()
  const [applyForm] = Form.useForm()

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

  async function register(values: {
    username: string
    password: string
    real_name: string
    merchant_name: string
    announcement?: string
  }) {
    const data = await run<MerchantApplication>('提交商家入驻申请', () => http.post('/admin/merchant/register', values))
    if (data) {
      setApplication(data)
      loginForm.setFieldsValue({ username: values.username, password: values.password })
    }
  }

  async function login(values: { username: string; password: string }) {
    await run('商家账号登录', async () => {
      const response = await http.post('/admin/auth/login', values, { headers: { 'X-Admin-Session': 'merchant' } })
      const data = pickData(response) as { access_token?: string; refresh_token?: string }
      if (data.access_token) localStorage.setItem('merchant_admin_access_token', data.access_token)
      if (data.refresh_token) localStorage.setItem('merchant_admin_refresh_token', data.refresh_token)
      return response
    })
    await loadApplication()
  }

  async function loadApplication() {
    const data = await run<MerchantApplication | null>('查看我的入驻申请', () =>
      http.get('/admin/merchant/application/me', { headers: { 'X-Admin-Session': 'merchant' } }),
    )
    setApplication(data ?? null)
  }

  async function resubmit(values: { merchant_name: string; announcement?: string }) {
    const data = await run<MerchantApplication>('重新提交入驻资料', () =>
      http.put('/admin/merchant/application/me', values, { headers: { 'X-Admin-Session': 'merchant' } }),
    )
    if (data) setApplication(data)
  }

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家入驻</Text>
          <Title level={1}>自助注册，平台审核后获得商家权限</Title>
          <Paragraph>商家可注册并登录查看入驻状态；平台通过后，商家端自动获得店铺 ID 和商品上传权限。</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Card title="当前申请状态">
            {application ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="申请 ID">#{application.id}</Descriptions.Item>
                <Descriptions.Item label="店铺">{application.merchant_name}</Descriptions.Item>
                <Descriptions.Item label="状态"><StatusTag status={application.status} /></Descriptions.Item>
                <Descriptions.Item label="店铺 ID">{application.merchant_id ? <Tag color="purple">#{application.merchant_id}</Tag> : '审核通过后生成'}</Descriptions.Item>
                <Descriptions.Item label="拒绝原因">{application.reject_reason || '-'}</Descriptions.Item>
              </Descriptions>
            ) : (
              <Text type="secondary">暂无申请信息，提交或登录后可查看。</Text>
            )}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="注册商家账号">
            <Form
              layout="vertical"
              form={applyForm}
              onFinish={register}
              initialValues={{
                username: `merchant_${Math.random().toString(16).slice(2, 8)}`,
                password: '12345678',
                real_name: '商家负责人',
                merchant_name: `申请店铺_${Math.random().toString(16).slice(2, 6)}`,
                announcement: '说明主营类目、经营范围和入驻理由。',
              }}
            >
              <Form.Item label="登录用户名" name="username" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
              <Form.Item label="负责人姓名" name="real_name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="店铺名称" name="merchant_name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="入驻申请说明" name="announcement"><Input.TextArea rows={3} /></Form.Item>
              <Button type="primary" htmlType="submit">提交入驻申请</Button>
            </Form>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="商家登录 / 重新提交">
            <Form layout="vertical" form={loginForm} onFinish={login} initialValues={{ password: '12345678' }}>
              <Form.Item label="商家账号" name="username" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, min: 8 }]}><Input.Password /></Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">登录并查看申请</Button>
                <Button onClick={loadApplication}>刷新状态</Button>
              </Space>
            </Form>
            <Form layout="vertical" onFinish={resubmit} className="resubmit-form">
              <Form.Item label="店铺名称" name="merchant_name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="入驻申请说明" name="announcement"><Input.TextArea rows={3} /></Form.Item>
              <Button htmlType="submit">重新提交资料</Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <DebugLogs logs={logs} />
    </main>
  )
}
