import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <nav>
        <Link to="/">首页</Link> | <Link to="/products">商品</Link> | <Link to="/cart">购物车</Link> |{' '}
        <Link to="/checkout">结算</Link> | <Link to="/orders">订单</Link> | <Link to="/user">我的</Link> |{' '}
        <Link to="/login">登录</Link>
      </nav>
      {children}
    </>
  )
}
