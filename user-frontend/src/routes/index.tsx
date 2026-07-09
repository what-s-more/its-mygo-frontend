import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'

import { authService } from '../services/auth'

import { AddressPage } from '../pages/address'
import { LoginPage } from '../pages/auth/login'
import { RegisterPage } from '../pages/auth/register'
import { CartPage } from '../pages/cart'
import { CheckoutPage } from '../pages/checkout'
import { CustomerServicePage } from '../pages/customer-service'
import { CommunityPage } from '../pages/community'
import { GroupBuyPage } from '../pages/group-buy'
import { MerchantPage } from '../pages/merchant'
import { OrderDetailPage } from '../pages/order-detail'
import { OrderPage } from '../pages/order'
import { ProductDetailPage } from '../pages/product/detail'
import { ProductPage } from '../pages/product'
import { UserCenterPage } from '../pages/user'

function RequireAuth({ children }: { children: ReactNode }) {
  if (!authService.hasToken()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<ProductPage />} />
      <Route path="/products" element={<Navigate to="/" replace />} />
      <Route path="/products/:productId" element={<ProductDetailPage />} />
      <Route path="/group-buy" element={<GroupBuyPage />} />
      <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
      <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
      <Route path="/orders" element={<RequireAuth><OrderPage /></RequireAuth>} />
      <Route path="/orders/:orderId" element={<RequireAuth><OrderDetailPage /></RequireAuth>} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/customer-service" element={<RequireAuth><CustomerServicePage /></RequireAuth>} />
      <Route path="/promotions" element={<Navigate to="/user" replace />} />
      <Route path="/addresses" element={<Navigate to="/user" replace />} />
      <Route path="/user" element={<RequireAuth><UserCenterPage /></RequireAuth>} />
      <Route path="/merchants/:merchantId" element={<MerchantPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
