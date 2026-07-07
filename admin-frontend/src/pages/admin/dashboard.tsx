import { Button, Card, Col, Row, Statistic, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { ReportOverviewPanel } from '../../components/ReportOverviewPanel'
import { http } from '../../services/http'
import { getPlatformReportOverview, type ReportOverview } from '../../services/report'
import { DebugLogs, formatError, pickData, type ApiLog, yuan } from '../workbench/adminShared'
import { SESSION, Summary } from './shared'

const { Title, Text } = Typography

export function AdminDashboardPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [reportOverview, setReportOverview] = useState<ReportOverview | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

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

  async function loadSummary() {
    const data = await run<Summary>('平台看板', () => http.get('/admin/dashboard/summary', { headers: { 'X-Admin-Session': SESSION } }))
    if (data) setSummary(data)
  }

  async function loadReportOverview() {
    setReportLoading(true)
    const data = await run<ReportOverview>('平台数据报表', getPlatformReportOverview)
    if (data) setReportOverview(data)
    setReportLoading(false)
  }

  useEffect(() => {
    void loadSummary()
    void loadReportOverview()
  }, [])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台运营数据概览</Text>
          <Title level={1}>数据概览</Title>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={4}><Card><Statistic title="用户" value={summary?.user_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="商品" value={summary?.product_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="订单" value={summary?.order_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="成交额" value={yuan(summary?.gross_merchandise_cent)} prefix="￥" /></Card></Col>
        <Col span={4}><Card><Statistic title="待发货" value={summary?.pending_shipment_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="售后" value={summary?.after_sale_count ?? 0} /></Card></Col>
      </Row>

      <ReportOverviewPanel
        report={reportOverview}
        loading={reportLoading}
        scopeLabel="平台"
        extra={<Button loading={reportLoading} onClick={loadReportOverview}>刷新报表</Button>}
      />

      <DebugLogs logs={logs} />
    </main>
  )
}
