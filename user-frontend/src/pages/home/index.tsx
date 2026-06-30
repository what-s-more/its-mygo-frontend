import { useEffect, useState } from 'react'
import { Avatar, Button, Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { authService, type UserProfile } from '../../services/auth'
import { communityService } from '../../services/community'
import { orderService } from '../../services/order'
import { productService, type ProductListItem } from '../../services/product'
import placeholderImg from '../../images/404.jpg'

const { Title, Text, Paragraph } = Typography

const CATEGORIES = [
  { name: '数码' },
  { name: '家居' },
  { name: '食品' },
  { name: '美妆' },
  { name: '服饰' },
  { name: '运动' },
]

function formatPrice(cent: number) {
  return `¥${(cent / 100).toFixed(2)}`
}

export function HomePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [orderCount, setOrderCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [recommended, setRecommended] = useState<ProductListItem[]>([])

  useEffect(() => {
    void authService.profile().then((r) => setProfile(r.data)).catch(() => setProfile(null))
    void productService.listProducts(1, 1).then((r) => setProductCount(r.data.total)).catch(() => {})
    void orderService.listOrders(1, 1).then((r) => setOrderCount(r.data.total)).catch(() => {})
    void communityService.listPosts(1, 1).then((r) => setPostCount(r.data.total)).catch(() => {})
    void productService.listProducts(1, 4).then((r) => setRecommended(r.data.list)).catch(() => {})
  }, [])

  return (
    <div className="shop-page">
      <header className="page-header">
        <Card className="hero-card" styles={{ body: { padding: 0 } }}>
          <Row>
            <Col xs={24} lg={10} className="hero-image-col">
              <img src={placeholderImg} alt="hero" className="hero-image" />
            </Col>
            <Col xs={24} lg={14} className="hero-content-col">
              <div className="hero-content">
                <span className="hero-eyebrow">一次买够 It's Mygo</span>
                <Title level={1}>省心好物，一站买够</Title>
                <Paragraph className="hero-desc">
                  浏览精选商品、参与社区种草、领取优惠券再下单
                </Paragraph>
                <Button type="primary" size="large" onClick={() => navigate('/products')}>
                  立即选购
                </Button>
                <Row gutter={12} className="hero-stats">
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
            </Col>
          </Row>
        </Card>

        <Card className="account-card" title="当前用户">
          {profile ? (
            <div className="account-profile">
              <Avatar size={72} src={placeholderImg} />
              <div className="account-name">{profile.nickname}</div>
              <div className="account-meta">{profile.mobile}</div>
              <Tag color="blue">积分 {profile.points}</Tag>
            </div>
          ) : (
            <div className="account-guest">
              <Text type="secondary">未登录，请通过顶部导航栏登录后使用完整功能。</Text>
              <Space>
                <Button onClick={() => navigate('/login')}>登录</Button>
                <Button onClick={() => navigate('/register')}>注册</Button>
              </Space>
            </div>
          )}
        </Card>
      </header>

      <section className="home-section">
        <Title level={4} className="section-title">热门分类</Title>
        <Row gutter={[16, 16]}>
          {CATEGORIES.map((cat) => (
            <Col key={cat.name} xs={8} sm={8} md={4} lg={4}>
              <Card hoverable className="category-card" onClick={() => navigate('/products')}>
                <img src={placeholderImg} alt={cat.name} className="category-image" />
                <Text strong className="category-name">{cat.name}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <section className="home-section">
        <Title level={4} className="section-title">为你推荐</Title>
        <Row gutter={[16, 16]}>
          {recommended.map((item) => (
            <Col key={item.id} xs={12} sm={12} md={6} lg={6}>
              <Card hoverable className="product-card" onClick={() => navigate('/products')}>
                <img src={placeholderImg} alt={item.name} className="product-image" />
                <div className="product-meta">
                  <Text strong className="product-name" ellipsis title={item.name}>{item.name}</Text>
                  <Text type="success" strong className="product-price">{formatPrice(item.price_cent)}</Text>
                  <Text type="secondary" className="product-shop">{item.merchant_name}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>
    </div>
  )
}
