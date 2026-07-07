import { Navigate, Route, Routes } from 'react-router-dom'

import { PortalPage } from '../pages/portal/index'
import { AdminLoginPage } from '../pages/auth/admin-login'
import { MerchantLoginPage } from '../pages/auth/merchant-login'
import { MerchantApplyPage } from '../pages/workbench/merchantApply'
import { AdminCategoryPage } from '../pages/admin/category'
import { AdminCommunityPage } from '../pages/admin/community'
import { AdminCouponsPage } from '../pages/admin/coupons'
import { AdminCustomerServicePage } from '../pages/admin/customer-service'
import { AdminDashboardPage } from '../pages/admin/dashboard'
import { AdminMerchantReviewPage } from '../pages/admin/merchant-review'
import { AdminOrdersPage } from '../pages/admin/orders'
import { AdminProductsPage } from '../pages/admin/products'
import { AdminRefundsPage } from '../pages/admin/refunds'
import { UserAdminPage } from '../pages/user/index'
import { MerchantCommunityPage } from '../pages/merchant/community'
import { MerchantCouponsPage } from '../pages/merchant/coupons'
import { MerchantCustomerServicePage } from '../pages/merchant/customer-service'
import { MerchantDashboardPage } from '../pages/merchant/dashboard'
import { MerchantFullDiscountsPage } from '../pages/merchant/full-discounts'
import { MerchantGroupBuyPage } from '../pages/merchant/group-buy'
import { MerchantOrdersPage } from '../pages/merchant/orders'
import { MerchantProductsPage } from '../pages/merchant/products'
import { MerchantRefundsPage } from '../pages/merchant/refunds'
import { MerchantStorePage } from '../pages/merchant/store'
import { AdminLayout } from '../layouts/AdminLayout'
import { MerchantLayout } from '../layouts/MerchantLayout'

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('platform_admin_access_token')
  if (!token) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}

function MerchantProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('merchant_admin_access_token')
  if (!token) {
    return <Navigate to="/merchant/login" replace />
  }
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PortalPage />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/merchant-review" element={<AdminMerchantReviewPage />} />
        <Route path="/admin/category" element={<AdminCategoryPage />} />
        <Route path="/admin/products" element={<AdminProductsPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/refunds" element={<AdminRefundsPage />} />
        <Route path="/admin/coupons" element={<AdminCouponsPage />} />
        <Route path="/admin/community" element={<AdminCommunityPage />} />
        <Route path="/admin/customer-service" element={<AdminCustomerServicePage />} />
        <Route path="/admin/users" element={<UserAdminPage />} />
      </Route>

      <Route path="/merchant/login" element={<MerchantLoginPage />} />
      <Route element={<MerchantProtectedRoute><MerchantLayout /></MerchantProtectedRoute>}>
        <Route path="/merchant/dashboard" element={<MerchantDashboardPage />} />
        <Route path="/merchant/products" element={<MerchantProductsPage />} />
        <Route path="/merchant/orders" element={<MerchantOrdersPage />} />
        <Route path="/merchant/refunds" element={<MerchantRefundsPage />} />
        <Route path="/merchant/coupons" element={<MerchantCouponsPage />} />
        <Route path="/merchant/customer-service" element={<MerchantCustomerServicePage />} />
        <Route path="/merchant/full-discounts" element={<MerchantFullDiscountsPage />} />
        <Route path="/merchant/group-buy" element={<MerchantGroupBuyPage />} />
        <Route path="/merchant/community" element={<MerchantCommunityPage />} />
        <Route path="/merchant/store" element={<MerchantStorePage />} />
      </Route>

      <Route path="/onboarding" element={<MerchantApplyPage />} />

      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/platform" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/merchant" element={<Navigate to="/merchant/dashboard" replace />} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/merchant-apply" element={<Navigate to="/onboarding" replace />} />
      <Route path="/products" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/promotions" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/community" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/orders" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/users" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}