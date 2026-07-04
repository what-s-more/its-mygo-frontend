import { Button, Card, Col, Form, Input, Row, Space, Typography, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'

import { authService } from '../../services/auth'

const { Title, Paragraph, Text } = Typography

export function RegisterPage() {
  const navigate = useNavigate()
  const [api, contextHolder] = message.useMessage()

  async function handleSubmit(values: { mobile: string; nickname: string; password: string }) {
    try {
      await authService.register(values)
      api.success('注册成功，请登录')
      navigate('/login')
    } catch {
      api.error('注册失败，请检查手机号是否已被使用')
    }
  }

  return (
    <main className="shop-page">
      {contextHolder}
      <section className="shop-hero auth-hero">
        <div>
          <Text className="eyebrow">新用户注册</Text>
          <Title level={1}>创建一次买够账号</Title>
          <Paragraph>注册后即可体验商品购买、优惠券、订单管理和社区种草流程。</Paragraph>
        </div>
      </section>

      <Row justify="center">
        <Col xs={24} md={14} lg={10}>
          <Card title="用户注册">
            <Form layout="vertical" onFinish={handleSubmit} initialValues={{ password: '12345678' }}>
              <Form.Item label="手机号" name="mobile" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input placeholder="例如 13700000000" />
              </Form.Item>
              <Form.Item label="昵称" name="nickname" rules={[{ required: true, message: '请输入昵称' }]}>
                <Input placeholder="用于社区展示" />
              </Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, min: 8, message: '请输入至少 8 位密码' }]}>
                <Input.Password />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">注册</Button>
                <Link to="/login">已有账号，去登录</Link>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </main>
  )
}
