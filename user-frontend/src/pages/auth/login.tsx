import { Form, Input, Button, Typography, Divider, message } from 'antd'
import { LockOutlined, MobileOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'

import { authService } from '../../services/auth'

const { Title, Text, Paragraph } = Typography

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
    <div className="auth-page">
      {contextHolder}

      {/* 左侧品牌展示区 */}
      <div className="auth-brand">
        <div className="auth-brand-bg" />
        <div className="auth-brand-overlay" />
        <div className="auth-brand-content">
          <Title level={2} className="auth-brand-title">
            欢迎回来
          </Title>
          <Paragraph className="auth-brand-desc">
            登录后即可浏览商品、加入购物车、提交订单、支付宝沙箱支付、确认收货，并发布社区帖子。
          </Paragraph>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <span className="auth-feature-dot" />
              <span>海量商品，品质保障</span>
            </div>
            <div className="auth-brand-feature">
              <span className="auth-feature-dot" />
              <span>拼团优惠，一起更划算</span>
            </div>
            <div className="auth-brand-feature">
              <span className="auth-feature-dot" />
              <span>社区种草，分享好物</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <Title level={3} className="auth-form-title">账号登录</Title>
            <Text type="secondary">使用手机号和密码登录</Text>
          </div>

          <Form
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ password: '12345678' }}
            size="large"
            className="auth-form"
          >
            <Form.Item
              name="account"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
              ]}
            >
              <Input
                prefix={<MobileOutlined />}
                placeholder="请输入注册手机号"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, min: 8, message: '请输入至少 8 位密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              className="btn-auth-submit"
            >
              登录
            </Button>
          </Form>

          <Divider plain className="auth-divider">
            <Text type="secondary" style={{ fontSize: 13 }}>其他选项</Text>
          </Divider>

          <div className="auth-footer-links">
            <Text type="secondary">
              还没有账号？
              <Link to="/register" className="auth-link">立即注册</Link>
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
