import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd'
import { Link } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

export function AdminWorkbenchHomePage() {
  const platformToken = localStorage.getItem('platform_admin_access_token')
  const merchantToken = localStorage.getItem('merchant_admin_access_token')

  return (
    <main className="admin-page">
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">一次买够运营工作台</Text>
          <Title level={1}>平台端与商家端分开使用</Title>
          <Paragraph>平台账号和商家账号可同时登录，分别进入独立页面，避免测试时互相覆盖登录状态。</Paragraph>
        </div>
        <Card>
          <Space direction="vertical">
            <Text strong>当前浏览器会话</Text>
            <Tag color={platformToken ? 'green' : 'default'}>平台：{platformToken ? '已登录' : '未登录'}</Tag>
            <Tag color={merchantToken ? 'green' : 'default'}>商家：{merchantToken ? '已登录' : '未登录'}</Tag>
          </Space>
        </Card>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={8}>
          <Card title="平台运营" className="entry-card">
            <Paragraph>商家入驻审核、分类配置、商品监管、全平台订单、促销、社区内容管理。</Paragraph>
            <Space>
              <Link to="/platform"><Button type="primary">进入平台页</Button></Link>
              <Link to="/login"><Button>平台登录</Button></Link>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="商家运营" className="entry-card">
            <Paragraph>商品上传、图片维护、SKU 价格库存、订单发货、本店优惠券。</Paragraph>
            <Space>
              <Link to="/merchant"><Button type="primary">进入商家页</Button></Link>
              <Link to="/login"><Button>商家登录</Button></Link>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="商家入驻" className="entry-card">
            <Paragraph>商家自助注册、待审核状态查看、被拒后重新提交资料。</Paragraph>
            <Link to="/merchant-apply"><Button type="primary">进入入驻页</Button></Link>
          </Card>
        </Col>
      </Row>
    </main>
  )
}
