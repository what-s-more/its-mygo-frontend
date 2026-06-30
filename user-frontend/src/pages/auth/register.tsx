import { App, Button, Card, Form, Input } from 'antd'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../services/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()

  async function handleSubmit(values: { mobile: string; nickname: string; password: string }) {
    try {
      await authService.register(values)
      message.success('注册成功，请登录')
      navigate('/login')
    } catch {
      message.error('注册失败，请检查手机号或密码')
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto' }}>
      <Card title="用户注册">
        <Form onFinish={handleSubmit} layout="vertical">
          <Form.Item name="mobile" label="手机号" rules={[{ required: true, message: '请输入手机号' }]}>
            <Input placeholder="手机号" />
          </Form.Item>
          <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
            <Input placeholder="昵称" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              注册
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
