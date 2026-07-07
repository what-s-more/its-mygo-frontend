import { Button, Card, Col, Row, Space, Statistic, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { ReportOverviewPanel } from '../../components/ReportOverviewPanel'
import { http } from '../../services/http'
import { getMerchantReportOverview, type ReportOverview } from '../../services/report'
import {
  DebugLogs,
  formatError,
  pickData,
  type ApiLog,
  statusText,
  yuan,
} from '../workbench/adminShared'
import { SESSION, type AdminProfile } from './shared'
import { Summary } from '../admin/shared'

const { Title, Paragraph, Text } = Typography

export function MerchantDashboardPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [reportOverview, setReportOverview] = useState<ReportOverview | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const merchantId = profile?.merchant_id ?? null

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      const data = pickData(response)
      setLogs((items) => [{ title, ok: true, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      return data as T
    } catch (error) {
      const data = formatError(error)
      setLogs((items) => [{ title, ok: false, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.error(`${title}失败`)
      return null
    }
  }

  async function loadMe() {
    const data = await run<AdminProfile>('当前商家账号', () =>
      http.get('/admin/auth/me', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setProfile(data)
  }

  async function loadSummary() {
    const data = await run<Summary>('商家看板', () =>
      http.get('/admin/dashboard/summary', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setSummary(data)
  }

  async function loadReportOverview() {
    setReportLoading(true)
    const data = await run<ReportOverview>('本店数据报表', getMerchantReportOverview)
    if (data) setReportOverview(data)
    setReportLoading(false)
  }

  useEffect(() => {
    loadMe()
    loadSummary()
    loadReportOverview()
  }, [])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>数据概览</Title>
          <Paragraph>商家运营数据概览</Paragraph>
        </div>
        <Card>
          <Space direction="vertical">
            <Text strong style={{ color: 'var(--ink)' }}>{profile?.real_name || profile?.username || '未登录商家账号'}</Text>
            <Text style={{ color: 'var(--body)' }}>角色：{statusText(profile?.role)}</Text>
            <Tag color="purple">店铺 ID：{merchantId ? `#${merchantId}` : '待平台审核'}</Tag>
            <Button onClick={loadMe}>刷新商家状态</Button>
          </Space>
        </Card>
      </section>

      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={4}><Card><Statistic title="商品" value={summary?.product_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="订单" value={summary?.order_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="成交额" value={yuan(summary?.gross_merchandise_cent)} prefix="￥" /></Card></Col>
        <Col span={4}><Card><Statistic title="待发货" value={summary?.pending_shipment_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="售后" value={summary?.after_sale_count ?? 0} /></Card></Col>
      </Row>

      <ReportOverviewPanel
        report={reportOverview}
        loading={reportLoading}
        scopeLabel="本店"
        extra={<Button loading={reportLoading} onClick={loadReportOverview}>刷新报表</Button>}
      />

      <DebugLogs logs={logs} />
    </main>
  )
}
