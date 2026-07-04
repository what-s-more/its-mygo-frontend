import { Button, Typography } from 'antd'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { adminAuthService } from '../services/auth'
import mygoIcon from '../styles/MyGO_icon.svg'

const { Text } = Typography

const menuItems = [
  { path: '/admin/dashboard', label: '数据概览' },
  { path: '/admin/merchant-review', label: '商家入驻审核' },
  { path: '/admin/category', label: '分类配置' },
  { path: '/admin/products', label: '商品监管' },
  { path: '/admin/orders', label: '全平台订单' },
  { path: '/admin/refunds', label: '售后处理' },
  { path: '/admin/coupons', label: '促销管理' },
  { path: '/admin/community', label: '社区内容管理' },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    try {
      await adminAuthService.logout('platform')
    } catch {
      localStorage.removeItem('platform_admin_access_token')
      localStorage.removeItem('platform_admin_refresh_token')
    }
    navigate('/admin/login')
  }

  const currentPath = location.pathname

  return (
    <div className="app-layout">
      <header className="top-header">
        <div className="brand">
          <div className="logo"><img src={mygoIcon} alt="MyGO" /></div>
          <div className="brand-text">
            <h1>一次买够</h1>
            <span>平台管理端</span>
          </div>
        </div>
        <div className="user-menu">
          <span>admin</span>
          <Button size="small" onClick={handleLogout}>退出</Button>
        </div>
      </header>

      <aside className="sidebar">
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link to={item.path} className={currentPath === item.path ? 'active' : ''}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}