import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authService, type UserProfile } from '../services/auth'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    void authService.profile().then((r) => setProfile(r.data)).catch(() => setProfile(null))
  }, [])

  async function logout() {
    await authService.logout()
    setProfile(null)
    window.location.href = '/login'
  }

  return (
    <>
      <nav className="app-nav">
        <Link className="brand-link" to="/">
          <span className="brand-mark">IM</span>
          <span>
            <strong>一次买够</strong>
            <small>用户商城</small>
          </span>
        </Link>
        <div className="nav-links">
          <Link to="/">首页</Link>
          <Link to="/products">商品</Link>
          <Link to="/cart">购物车</Link>
          <Link to="/orders">订单</Link>
          <Link to="/community">社区</Link>
          <Link to="/promotions">优惠券</Link>
        </div>
        <div className="nav-links nav-auth">
          {profile ? (
            <>
              <Link to="/user">{profile.nickname}</Link>
              <a onClick={logout} style={{ cursor: 'pointer' }}>登出</a>
            </>
          ) : (
            <>
              <Link to="/login">登录</Link>
              <Link to="/register">注册</Link>
            </>
          )}
        </div>
      </nav>
      {children}
    </>
  )
}
