import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { authService } from '../services/auth'
import { USER_AUTH_CHANGED_EVENT } from '../services/http'
import mygoIcon from '../styles/MyGO_icon.svg'
import logoMygo from '../styles/Logo_mygo.svg'

export function AppShell({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(() => authService.hasToken())

  useEffect(() => {
    const updateLoggedIn = () => setLoggedIn(authService.hasToken())
    window.addEventListener(USER_AUTH_CHANGED_EVENT, updateLoggedIn)
    window.addEventListener('storage', updateLoggedIn)
    return () => {
      window.removeEventListener(USER_AUTH_CHANGED_EVENT, updateLoggedIn)
      window.removeEventListener('storage', updateLoggedIn)
    }
  }, [])

  async function logout() {
    await authService.logout()
  }

  return (
    <>
      <nav className="app-nav">
        <Link className="brand-link" to="/">
          <span className="brand-mark-box"><img className="brand-mark" src={mygoIcon} alt="MyGO" /></span>
          <img className="brand-logo" src={logoMygo} alt="一次买够" />
        </Link>
        <div className="nav-links">
          <Link to="/">商城首页</Link>
          <Link to="/products">商品</Link>
          <Link to="/group-buy">拼团专区</Link>
          <Link to="/cart">购物车</Link>
          <Link to="/orders">订单</Link>
          <Link to="/community">社区</Link>
        </div>
        <div className="nav-links nav-auth">
          {loggedIn ? (
            <>
              <Link to="/user">我的账号</Link>
              <button type="button" className="nav-action" onClick={logout}>退出</button>
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
