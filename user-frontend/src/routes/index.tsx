import { Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from '../pages/auth/login'
import { RegisterPage } from '../pages/auth/register'
import { CartPage } from '../pages/cart'
import { CheckoutPage } from '../pages/checkout'
import { HomePage } from '../pages/home'
import { OrderPage } from '../pages/order'
import { ProductPage } from '../pages/product'
import { UserCenterPage } from '../pages/user'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/products" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/orders" element={<OrderPage />} />
      <Route path="/user" element={<UserCenterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
