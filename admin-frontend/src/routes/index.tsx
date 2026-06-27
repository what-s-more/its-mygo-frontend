import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminLoginPage } from '../pages/auth/login'
import { DashboardPage } from '../pages/dashboard'
import { ProductAdminPage } from '../pages/product'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/products" element={<ProductAdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
