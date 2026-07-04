import { Button, Card, Col, Form, Input, Row, Space, Typography, message } from 'antd'
import { Link, useNavigate } from 'react-router-dom'

import { authService } from '../../services/auth'

const { Title, Paragraph, Text } = Typography

export function LoginPage() {
  const navigate = useNavigate()
  const [api, contextHolder] = message.useMessage()

  async function handleSubmit(values: { account: string; password: string }) {
    try {
      await authService.login(values)
      api.success('登录成功，正在进入商城')
      navigate('/')
    } catch {
      api.error('登录失败，请检查手机号和密码')
    }
  }

  return (
    <main className="shop-page">
      {contextHolder}
      <section className="shop-hero auth-hero">
        <div>
          <Text className="eyebrow">用户账号</Text>
          <Title level={1}>登录一次买够</Title>
          <Paragraph>登录后可加入购物车、提交订单、支付宝沙箱支付、确认收货，并发布社区帖子。</Paragraph>
        </div>
      </section>

      <Row justify="center">
        <Col xs={24} md={14} lg={10}>
          <Card title="用户登录">
            <Form layout="vertical" onFinish={handleSubmit} initialValues={{ password: '12345678' }}>
              <Form.Item label="手机号" name="account" rules={[{ required: true, message: '请输入手机号' }]}>
                <Input placeholder="请输入注册手机号" />
              </Form.Item>
              <Form.Item label="密码" name="password" rules={[{ required: true, min: 8, message: '请输入至少 8 位密码' }]}>
                <Input.Password />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">登录</Button>
                <Link to="/register">还没有账号，去注册</Link>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </main>
  )
}
