import { Button, Card, Form, Input, Typography, message } from 'antd'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { adminAuthService } from '../../services/auth'

const { Title, Paragraph, Text } = Typography

export function MerchantLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [api, contextHolder] = message.useMessage()
  const redirect = searchParams.get('redirect') || '/merchant/dashboard'

  async function login(values: { username: string; password: string }) {
    try {
      await adminAuthService.login(values, 'merchant')
      const profile = await adminAuthService.me('merchant')
      api.success('商家账号登录成功')
      const role = profile.data.role
      if (!['merchant_operator', 'merchant_pending'].includes(role)) {
        api.warning('该账号不是商家账号，请在平台登录区使用')
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
        <Paragraph>商家账号登录后进入商家运营端</Paragraph>
      </div>
      <div className="login-form-wrap">
        <Card className="login-card">
          <Title level={3}>商家运营登录</Title>
          <Form layout="vertical" onFinish={login} initialValues={{ password: '12345678' }}>
            <Form.Item label="商家账号" name="username" rules={[{ required: true }]}>
              <Input placeholder="请输入商家账号" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, min: 8 }]}>
              <Input.Password placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>登录商家端</Button>
          </Form>
          <div className="login-footer">
            <Link to="/">返回门户页</Link> · <Link to="/admin/login">平台登录</Link>
            <br />
            还没有商家账号？<Link to="/onboarding">去入驻申请</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}