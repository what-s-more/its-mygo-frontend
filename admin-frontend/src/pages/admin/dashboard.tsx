import { Card, Col, Row, Statistic, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import { DebugLogs, formatError, pickData, type ApiLog, yuan } from '../workbench/adminShared'
import { SESSION, Summary } from './shared'

const { Title, Text } = Typography

export function AdminDashboardPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)

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

  useEffect(() => {
    void loadSummary()
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

      <DebugLogs logs={logs} />
    </main>
  )
}
