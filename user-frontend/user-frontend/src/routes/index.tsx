import { Navigate, Route, Routes } from 'react-router-dom'

import { AddressPage } from '../pages/address'
import { LoginPage } from '../pages/auth/login'
import { RegisterPage } from '../pages/auth/register'
import { CartPage } from '../pages/cart'
import { CheckoutPage } from '../pages/checkout'
import { CommunityPage } from '../pages/community'
import { GroupBuyPage } from '../pages/group-buy'
import { HomePage } from '../pages/home'
import { MerchantPage } from '../pages/merchant'
import { OrderPage } from '../pages/order'
import { ProductDetailPage } from '../pages/product/detail'
import { ProductPage } from '../pages/product'
import { UserCenterPage } from '../pages/user'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/products" element={<ProductPage />} />
      <Route path="/products/:productId" element={<ProductDetailPage />} />
      <Route path="/group-buy" element={<GroupBuyPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrderPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/promotions" element={<Navigate to="/user" replace />} />
      <Route path="/addresses" element={<Navigate to="/user" replace />} />
      <Route path="/user" element={<UserCenterPage />} />
      <Route path="/merchants/:merchantId" element={<MerchantPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
