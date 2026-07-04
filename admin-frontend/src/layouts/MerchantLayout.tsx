import { Button, Typography, Tag } from 'antd'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { adminAuthService } from '../services/auth'
import { useState, useEffect } from 'react'
import { http } from '../services/http'
import { pickData } from '../pages/workbench/adminShared'
import mygoIcon from '../styles/MyGO_icon.svg'

const { Text } = Typography

const menuItems = [
  { path: '/merchant/dashboard', label: '数据概览' },
  { path: '/merchant/products', label: '商品管理' },
  { path: '/merchant/orders', label: '本店订单' },
  { path: '/merchant/refunds', label: '本店售后' },
  { path: '/merchant/coupons', label: '本店优惠券' },
  { path: '/merchant/full-discounts', label: '本店满减活动' },
  { path: '/merchant/group-buy', label: '拼团配置' },
  { path: '/merchant/community', label: '社区动态' },
  { path: '/merchant/store', label: '店铺信息' },
]

type AdminProfile = { id: number; username: string; real_name: string; role: string; merchant_id?: number | null }

export function MerchantLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await http.get('/admin/auth/me', { headers: { 'X-Admin-Session': 'merchant' } })
        const data = pickData(response) as AdminProfile
        setProfile(data)
      } catch {
        setProfile(null)
      }
    }
    void loadProfile()
  }, [])

  async function handleLogout() {
    try {
      await adminAuthService.logout('merchant')
    } catch {
      localStorage.removeItem('merchant_admin_access_token')
      localStorage.removeItem('merchant_admin_refresh_token')
    }
    navigate('/merchant/login')
  }

  const currentPath = location.pathname

  return (
    <div className="app-layout">
      <header className="top-header">
        <div className="brand">
          <div className="logo"><img src={mygoIcon} alt="MyGO" /></div>
          <div className="brand-text">
            <h1>一次买够</h1>
            <span>商家运营后台</span>
          </div>
        </div>
        <div className="user-menu">
          <span>店铺 ID：{profile?.merchant_id ? `#${profile.merchant_id}` : '-'}</span>
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