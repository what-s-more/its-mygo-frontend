import { App, Button, Card, Form, Input } from 'antd'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'

export function LoginPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  async function handleSubmit(values: { account: string; password: string }) {
    try {
      await authService.login(values)
      message.success('登录成功')
      navigate('/user')
    } catch {
      message.error('登录失败，请检查账号和密码')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <Card title="用户登录">
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="account" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
