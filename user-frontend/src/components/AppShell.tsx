import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from 'antd'

import { authService, type UserProfile } from '../services/auth'
import { USER_AUTH_CHANGED_EVENT } from '../services/http'
import { absoluteAssetUrl } from '../utils/format'
import { AiAssistantWidget } from './AiAssistantWidget'
import logoMygo from '../styles/Logo_mygo.svg'

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const [loggedIn, setLoggedIn] = useState(() => authService.hasToken())
  const [profile, setProfile] = useState<UserProfile | null>(null)

  async function loadProfile() {
    if (!authService.hasToken()) {
      setProfile(null)
      return
    }
    try {
      const response = await authService.profile()
      setProfile(response.data)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    const updateLoggedIn = () => {
      setLoggedIn(authService.hasToken())
      void loadProfile()
    }
    window.addEventListener(USER_AUTH_CHANGED_EVENT, updateLoggedIn)
    window.addEventListener('storage', updateLoggedIn)
    void loadProfile()
    return () => {
      window.removeEventListener(USER_AUTH_CHANGED_EVENT, updateLoggedIn)
      window.removeEventListener('storage', updateLoggedIn)
    }
  }, [])

  async function logout() {
    await authService.logout()
    navigate('/login')
  }

  return (
    <>
      {!isAuthPage && (
        <nav className="app-nav">
          <Link className="brand-link" to="/">
            <img className="brand-mark" src={logoMygo} alt="MyGO" />
            <span className="brand-name">一次买够</span>
          </Link>
          <div className="nav-links">
            <Link to="/">首页</Link>
            <Link to="/group-buy">拼团专区</Link>
            <Link to="/cart">购物车</Link>
            <Link to="/orders">订单</Link>
            <Link to="/community">社区</Link>
          </div>
          <div className="nav-links nav-auth">
            {loggedIn ? (
              <>
                <Link to="/user" className="nav-user-link">
                  <Avatar
                    size={28}
                    src={absoluteAssetUrl(profile?.avatar_url ?? '') || undefined}
                    className="nav-user-avatar"
                  >
                    {profile?.nickname?.slice(0, 1) ?? 'U'}
                  </Avatar>
                  <span className="nav-user-name">{profile?.nickname ?? '我的账号'}</span>
                </Link>
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
      )}
      {children}
      {!isAuthPage && <AiAssistantWidget />}
    </>
  )
}
