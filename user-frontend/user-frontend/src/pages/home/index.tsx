import { Card, Col, Row, Space, Typography } from 'antd'
import { Link } from 'react-router-dom'

import { authService } from '../../services/auth'

const { Title, Paragraph, Text } = Typography

type QuickEntry = {
  title: string
  description: string
  to: string
}

const QUICK_ENTRIES: QuickEntry[] = [
  { title: '商品大厅', description: '浏览全平台商品，加入购物车', to: '/products' },
  { title: '拼团专区', description: '参与拼团，享专属拼团价', to: '/group-buy' },
  { title: '购物车', description: '查看选购商品，调整数量并结算', to: '/cart' },
  { title: '我的订单', description: '查询订单、支付、确认收货与评价', to: '/orders' },
  { title: '社区广场', description: '发帖、评论、点赞与种草分享', to: '/community' },
  { title: '优惠券中心', description: '领取平台与店铺优惠券', to: '/promotions' },
  { title: '收货地址', description: '维护收货地址与默认地址', to: '/addresses' },
  { title: '个人中心', description: '账号资料、会员积分与签到', to: '/user' },
]

export function HomePage() {
  const loggedIn = authService.hasToken()

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <div>
          <Text className="eyebrow">社交新零售电商平台</Text>
          <Title level={1}>一次买够 It's Mygo</Title>
          <Paragraph>
            在这里完成商品浏览、拼团、加购、支付宝沙箱支付、确认收货，并在社区分享种草内容。
          </Paragraph>
          {loggedIn ? (
            <Text>欢迎回来！选择下方任意入口继续你的购物之旅。</Text>
          ) : (
            <Space size="middle" wrap>
              <Text>请先登录或注册后开始购物：</Text>
              <Link to="/login">登录</Link>
              <Link to="/register">注册</Link>
            </Space>
          )}
        </div>
      </section>

      <Row gutter={[16, 16]}>
        {QUICK_ENTRIES.map((entry) => (
          <Col xs={24} sm={12} md={8} lg={6} key={entry.to}>
            <Link to={entry.to}>
              <Card hoverable title={entry.title}>
                <Text type="secondary">{entry.description}</Text>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </main>
  )
}
