import { useEffect, useState } from 'react'
import { App, Button, Card, Col, Descriptions, Row, Space, Statistic, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { authService, type UserProfile } from '../../services/auth'
import { communityService } from '../../services/community'
import { orderService } from '../../services/order'
import { productService, type ProductListItem } from '../../services/product'
import { DataPanel, type ApiResult } from '../../components/DataPanel'

const { Title, Text, Paragraph } = Typography

function newMobile() {
  return `137${String(Date.now()).slice(-8)}`
}

export function HomePage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [orderCount, setOrderCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [mobile, setMobile] = useState(newMobile())
  const [password, setPassword] = useState('12345678')
  const [nickname, setNickname] = useState('测试用户')
  const [lastResult, setLastResult] = useState<ApiResult | null>(null)

  useEffect(() => {
    void authService.profile().then((r) => setProfile(r.data)).catch(() => setProfile(null))
    void productService.listProducts(1, 1).then((r) => setProductCount(r.data.total)).catch(() => {})
    void orderService.listOrders(1, 1).then((r) => setOrderCount(r.data.total)).catch(() => {})
    void communityService.listPosts(1, 1).then((r) => setPostCount(r.data.total)).catch(() => {})
  }, [])

  async function login() {
    try {
      const r = await authService.login({ account: mobile, password })
      setLastResult({ title: '登录', ok: true, data: r.data })
      const p = await authService.profile()
      setProfile(p.data)
      message.success('登录成功')
    } catch (e) {
      setLastResult({ title: '登录', ok: false, data: e })
      message.error('登录失败')
    }
  }

  async function register() {
    try {
      const r = await authService.register({ mobile, password, nickname })
      setLastResult({ title: '注册', ok: true, data: r.data })
      await login()
    } catch (e) {
      setLastResult({ title: '注册', ok: false, data: e })
      message.error('注册失败')
    }
  }

  return (
    <div className="shop-page">
      <header className="page-header">
        <div className="hero-copy">
          <p className="eyebrow">一次买够 It's Mygo</p>
          <Title level={1}>一次买够用户端</Title>
          <Paragraph type="secondary">
            用于按真实购物习惯联调：浏览商品、加购、下单、支付、收货、评价售后和社区互动。
          </Paragraph>
          <Row gutter={12} style={{ maxWidth: 760, marginTop: 28 }}>
            <Col span={8}>
              <Card size="small"><Statistic title="可浏览商品" value={productCount} /></Card>
            </Col>
            <Col span={8}>
              <Card size="small"><Statistic title="我的订单" value={orderCount} /></Card>
            </Col>
            <Col span={8}>
              <Card size="small"><Statistic title="社区帖子" value={postCount} /></Card>
            </Col>
          </Row>
        </div>

        <Card className="account-card" title="当前用户">
          {profile ? (
            <Descriptions column={1} size="small">
              <Descriptions.Item label="昵称">{profile.nickname}</Descriptions.Item>
              <Descriptions.Item label="手机">{profile.mobile}</Descriptions.Item>
              <Descriptions.Item label="积分">{profile.points}</Descriptions.Item>
            </Descriptions>
          ) : (
            <Text type="secondary">未登录，先注册或登录后再测试购物流程。</Text>
          )}
          <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="手机号" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" type="password" />
            <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="昵称" />
          </Space>
          <Space style={{ marginTop: 8 }}>
            <Button type="primary" onClick={login}>登录</Button>
            <Button onClick={register}>注册并登录</Button>
          </Space>
        </Card>
      </header>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={6}><Card hoverable onClick={() => navigate('/products')}><Statistic title="商品浏览" value="前往选购" /></Card></Col>
        <Col span={6}><Card hoverable onClick={() => navigate('/cart')}><Statistic title="购物车" value="查看/结算" /></Card></Col>
        <Col span={6}><Card hoverable onClick={() => navigate('/orders')}><Statistic title="我的订单" value="查看订单" /></Card></Col>
        <Col span={6}><Card hoverable onClick={() => navigate('/community')}><Statistic title="社区" value="互动" /></Card></Col>
      </Row>

      <DataPanel result={lastResult} />
    </div>
  )
}
