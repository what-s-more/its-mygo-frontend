import { Button, Card, Col, Form, Input, Row, Space, Typography, message } from 'antd'
import { useNavigate } from 'react-router-dom'
import { adminAuthService } from '../../services/auth'

const { Title, Paragraph, Text } = Typography

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [api, contextHolder] = message.useMessage()

  async function login(values: { username: string; password: string }, session: 'platform' | 'merchant') {
    try {
      const response = await adminAuthService.login(values, session)
      const profile = await adminAuthService.me(session)
      api.success(`${session === 'platform' ? '平台' : '商家'}账号登录成功`)
      const role = profile.data.role
      if (session === 'platform' && role !== 'platform_operator') {
        api.warning('该账号不是平台运营账号，请在商家登录区使用')
      }
      if (session === 'merchant' && !['merchant_operator', 'merchant_pending'].includes(role)) {
        api.warning('该账号不是商家账号，请在平台登录区使用')
      }
      if (response.data.access_token) navigate(session === 'platform' ? '/platform' : '/merchant')
    } catch {
      api.error('登录失败，请检查账号、密码和账号角色')
    }
  }

  async function logout(session: 'platform' | 'merchant') {
    try {
      await adminAuthService.logout(session)
      api.success(`${session === 'platform' ? '平台' : '商家'}账号已退出`)
    } catch {
      localStorage.removeItem(`${session}_admin_access_token`)
      localStorage.removeItem(`${session}_admin_refresh_token`)
      api.success(`${session === 'platform' ? '平台' : '商家'}本地登录状态已清除`)
    }
  }

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台账号与商家账号可同时登录</Text>
          <Title level={1}>一次买够运营后台</Title>
          <Paragraph>平台管理与商家管理使用两套浏览器会话，测试时不需要来回退出登录。</Paragraph>
        </div>
      </section>
      <Row gutter={[24, 24]}>
        <Col span={12}>
          <Card title="平台运营登录">
            <Form layout="vertical" onFinish={(values) => login(values, 'platform')} initialValues={{ password: '12345678' }}>
              <Form.Item label="平台账号" name="username" rules={[{ required: true }]}>
                <Input placeholder="例如 admin_01" />
              </Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, min: 8 }]}>
                <Input.Password />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">登录平台端</Button>
                <Button onClick={() => navigate('/platform')}>进入平台页</Button>
                <Button danger onClick={() => logout('platform')}>退出平台端</Button>
              </Space>
            </Form>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="商家运营登录">
            <Form layout="vertical" onFinish={(values) => login(values, 'merchant')} initialValues={{ password: '12345678' }}>
              <Form.Item label="商家账号" name="username" rules={[{ required: true }]}>
                <Input placeholder="商家自助注册后的账号" />
              </Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, min: 8 }]}>
                <Input.Password />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">登录商家端</Button>
                <Button onClick={() => navigate('/merchant')}>进入商家页</Button>
                <Button onClick={() => navigate('/merchant-apply')}>商家入驻</Button>
                <Button danger onClick={() => logout('merchant')}>退出商家端</Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </main>
  )
}
