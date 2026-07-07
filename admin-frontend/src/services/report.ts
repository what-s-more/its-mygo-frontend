import { http } from './http'

export type ReportMetric = {
  key: string
  label: string
  value: number
  unit: string
}

export type ReportSeriesPoint = {
  date: string
  order_count: number
  gmv_cent: number
  refund_amount_cent: number
}

export type ReportNameValue = {
  id?: number | null
  name: string
  value: number
  amount_cent?: number | null
}

export type ReportTopProduct = {
  product_id: number
  product_name: string
  quantity: number
  amount_cent: number
}

export type ReportOverview = {
  scope: 'platform' | 'merchant'
  scope_id?: number | null
  time_range: {
    date_from: string
    date_to: string
    granularity: string
  }
  generated_at: string
  summary: ReportMetric[]
  sales_trend: ReportSeriesPoint[]
  order_status: ReportNameValue[]
  top_products: ReportTopProduct[]
  top_merchants: ReportNameValue[]
  refund_status: ReportNameValue[]
  promotion_summary: ReportMetric[]
  community_summary: ReportMetric[]
}

export function getPlatformReportOverview() {
  return http.get('/admin/reports/platform/overview', { headers: { 'X-Admin-Session': 'platform' } })
}

export function getMerchantReportOverview() {
  return http.get('/admin/reports/merchant/overview', { headers: { 'X-Admin-Session': 'merchant' } })
}
