import { Form, Input, Button, Typography, Divider, message } from 'antd'
import { LockOutlined, MobileOutlined, UserOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'

import { authService } from '../../services/auth'

const { Title, Text, Paragraph } = Typography

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
    <div className="auth-page">
      {contextHolder}

      {/* 左侧品牌展示区 */}
      <div className="auth-brand">
        <div className="auth-brand-bg" />
        <div className="auth-brand-overlay" />
        <div className="auth-brand-content">
          <Title level={2} className="auth-brand-title">
            加入一次买够
          </Title>
          <Paragraph className="auth-brand-desc">
            注册后即可体验商品购买、优惠券、订单管理和社区种草流程。
          </Paragraph>
          <div className="auth-brand-features">
            <div className="auth-brand-feature">
              <span className="auth-feature-dot" />
              <span>新人专享优惠券</span>
            </div>
            <div className="auth-brand-feature">
              <span className="auth-feature-dot" />
              <span>签到领积分，积分抵现金</span>
            </div>
            <div className="auth-brand-feature">
              <span className="auth-feature-dot" />
              <span>种草分享，赚取推广奖励</span>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <Title level={3} className="auth-form-title">创建账号</Title>
            <Text type="secondary">填写信息完成注册</Text>
          </div>

          <Form
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ password: '12345678' }}
            size="large"
            className="auth-form"
          >
            <Form.Item
              name="mobile"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' },
              ]}
            >
              <Input
                prefix={<MobileOutlined />}
                placeholder="例如 13700000000"
              />
            </Form.Item>
            <Form.Item
              name="nickname"
              rules={[{ required: true, message: '请输入昵称' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用于社区展示的昵称"
              />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[{ required: true, min: 8, message: '请输入至少 8 位密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="至少 8 位密码"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              className="btn-auth-submit"
            >
              注册
            </Button>
          </Form>

          <Divider plain className="auth-divider">
            <Text type="secondary" style={{ fontSize: 13 }}>其他选项</Text>
          </Divider>

          <div className="auth-footer-links">
            <Text type="secondary">
              已有账号？
              <Link to="/login" className="auth-link">去登录</Link>
            </Text>
          </div>
        </div>
      </div>
    </div>
  )
}
