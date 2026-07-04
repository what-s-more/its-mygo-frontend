import { Button, Card, Form, Input, Typography, message } from 'antd'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { adminAuthService } from '../../services/auth'

const { Title, Paragraph, Text } = Typography

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [api, contextHolder] = message.useMessage()
  const redirect = searchParams.get('redirect') || '/admin/dashboard'

  async function login(values: { username: string; password: string }) {
    try {
      await adminAuthService.login(values, 'platform')
      const profile = await adminAuthService.me('platform')
      api.success('平台账号登录成功')
      const role = profile.data.role
      if (role !== 'platform_operator') {
        api.warning('该账号不是平台运营账号，请在商家登录区使用')
      }
      navigate(redirect)
    } catch {
      api.error('登录失败，请检查账号、密码和账号角色')
    }
  }

  return (
    <div className="login-page">
      {contextHolder}
      <div className="login-brand">
        <Title level={2}>一次买够 运营后台</Title>
        <Paragraph>平台账号登录后进入平台管理端</Paragraph>
      </div>
      <div className="login-form-wrap">
        <Card className="login-card">
          <Title level={3}>平台运营登录</Title>
          <Form layout="vertical" onFinish={login} initialValues={{ password: '12345678' }}>
            <Form.Item label="平台账号" name="username" rules={[{ required: true }]}>
              <Input placeholder="请输入平台账号" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, min: 8 }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>登录平台端</Button>
          </Form>
          <div className="login-footer">
            <Link to="/">返回门户页</Link> · <Link to="/merchant/login">商家登录</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}