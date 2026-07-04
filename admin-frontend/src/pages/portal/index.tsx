import { Button, Card, Tag, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import mygoIcon from '../../styles/MyGO_icon.svg'

const { Title, Paragraph, Text } = Typography

export function PortalPage() {
  const navigate = useNavigate()
  const platformToken = localStorage.getItem('platform_admin_access_token')
  const merchantToken = localStorage.getItem('merchant_admin_access_token')

  return (
    <div className="portal-page">
      <header className="top-header">
        <div className="brand">
          <div className="logo"><img src={mygoIcon} alt="MyGO" /></div>
          <div className="brand-text">
            <h1>一次买够</h1>
            <span>运营后台</span>
          </div>
        </div>
        <nav className="top-nav">
          <Link to="/" className="active">管理首页</Link>
          <Link to="/admin/dashboard">{platformToken ? '平台管理' : '平台登录'}</Link>
          <Link to="/merchant/dashboard">{merchantToken ? '商家管理' : '商家登录'}</Link>
          <Link to="/onboarding">商家入驻</Link>
        </nav>
        <div className="user-menu">
          <div className="dropdown">
            <Link to="/admin/login">平台登录</Link> / <Link to="/merchant/login">商家登录</Link>
          </div>
        </div>
      </header>

      <main className="portal-main">
        <section className="hero-banner">
          <div className="hero-label">一次买够运营端</div>
          <h1 className="hero-title">平台端与商家端</h1>
        </section>

        <section className="portal-cards">
          <Card className="portal-card">
            <h3>平台运营</h3>
            <Paragraph>商家入驻审核、分类配置、商品监管、全平台订单、促销、社区内容管理。</Paragraph>
            <div className="card-actions">
              {platformToken ? (
                <Button type="primary" onClick={() => navigate('/admin/dashboard')}>进入平台页</Button>
              ) : (
                <Button type="primary" onClick={() => navigate('/admin/login')}>进入平台页</Button>
              )}
              <Button onClick={() => navigate('/admin/login')}>平台登录</Button>
            </div>
          </Card>
          <Card className="portal-card">
            <h3>商家运营</h3>
            <Paragraph>商品上传、图片维护、SKU 价格库存、订单发货、本店优惠券。</Paragraph>
            <div className="card-actions">
              {merchantToken ? (
                <Button type="primary" onClick={() => navigate('/merchant/dashboard')}>进入商家页</Button>
              ) : (
                <Button type="primary" onClick={() => navigate('/merchant/login')}>进入商家页</Button>
              )}
              <Button onClick={() => navigate('/merchant/login')}>商家登录</Button>
            </div>
          </Card>
          <Card className="portal-card">
            <h3>商家入驻</h3>
            <Paragraph>商家自助注册、待审核状态查看、被拒后重新提交资料。</Paragraph>
            <div className="card-actions">
              <Button type="primary" onClick={() => navigate('/onboarding')}>进入入驻页</Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  )
}