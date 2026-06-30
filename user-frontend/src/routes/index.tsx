import { Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from '../pages/home'
import { LoginPage } from '../pages/auth/login'
import { RegisterPage } from '../pages/auth/register'
import { ProductPage } from '../pages/product'
import { CartPage } from '../pages/cart'
import { OrderPage } from '../pages/order'
import { PromotionPage } from '../pages/promotion'
import { CommunityPage } from '../pages/community'
import { AddressPage } from '../pages/address'
import { UserCenterPage } from '../pages/user'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/products" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/orders" element={<OrderPage />} />
      <Route path="/promotions" element={<PromotionPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/addresses" element={<AddressPage />} />
      <Route path="/user" element={<UserCenterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
