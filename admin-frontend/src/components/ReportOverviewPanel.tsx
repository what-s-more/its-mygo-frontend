import { Card, Col, Empty, Row, Skeleton, Space, Statistic, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'
import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import type { ReportMetric, ReportNameValue, ReportOverview, ReportTopProduct } from '../services/report'

const { Text } = Typography

type Props = {
  report: ReportOverview | null
  loading?: boolean
  scopeLabel: string
  extra?: ReactNode
}

function yuan(valueCent?: number | null) {
  return ((valueCent ?? 0) / 100).toFixed(2)
}

function metricValue(metric?: ReportMetric) {
  if (!metric) return 0
  return metric.unit === 'cent' ? yuan(Number(metric.value)) : metric.value
}

function getMetric(items: ReportMetric[], key: string) {
  return items.find((item) => item.key === key)
}

function ChartCard({ title, option, empty }: { title: string; option: EChartsOption; empty?: boolean }) {
  const elementRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!elementRef.current || empty) return undefined
    const chart = echarts.init(elementRef.current)
    chart.setOption(option)
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [empty, option])

  return (
    <Card title={title} className="report-chart-card">
      {empty ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可视化数据" /> : <div ref={elementRef} className="report-chart" />}
    </Card>
  )
}

function buildStatusOption(data: ReportNameValue[]): EChartsOption {
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '45%'],
        data: data.map((item) => ({ name: item.name, value: item.value })),
        label: { formatter: '{b}: {c}' },
      },
    ],
  }
}

function buildTopBarOption(data: ReportTopProduct[]): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 20, top: 24, bottom: 70 },
    xAxis: {
      type: 'category',
      data: data.map((item) => item.product_name),
      axisLabel: { interval: 0, rotate: 24, width: 88, overflow: 'truncate' },
    },
    yAxis: { type: 'value' },
    series: [{ name: '销量', type: 'bar', data: data.map((item) => item.quantity), itemStyle: { color: '#cc785c' } }],
  }
}

export function ReportOverviewPanel({ report, loading, scopeLabel, extra }: Props) {
  const summary = report?.summary ?? []
  const promotionSummary = report?.promotion_summary ?? []
  const communitySummary = report?.community_summary ?? []

  const trendOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 56, right: 24, top: 44, bottom: 34 },
    xAxis: { type: 'category', data: report?.sales_trend.map((item) => item.date.slice(5)) ?? [] },
    yAxis: [
      { type: 'value', name: '金额(元)' },
      { type: 'value', name: '订单' },
    ],
    series: [
      {
        name: '成交额',
        type: 'line',
        smooth: true,
        data: report?.sales_trend.map((item) => Number(yuan(item.gmv_cent))) ?? [],
        areaStyle: { color: 'rgba(204, 120, 92, 0.12)' },
        itemStyle: { color: '#cc785c' },
      },
      {
        name: '退款额',
        type: 'line',
        smooth: true,
        data: report?.sales_trend.map((item) => Number(yuan(item.refund_amount_cent))) ?? [],
        itemStyle: { color: '#c64545' },
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        data: report?.sales_trend.map((item) => item.order_count) ?? [],
        itemStyle: { color: '#5db8a6' },
      },
    ],
  }), [report])

  const topProductColumns: ColumnsType<ReportTopProduct> = [
    { title: '商品 ID', dataIndex: 'product_id', width: 90 },
    { title: '商品', dataIndex: 'product_name' },
    { title: '销量', dataIndex: 'quantity', width: 90 },
    { title: '成交额', dataIndex: 'amount_cent', width: 120, render: (value) => `￥${yuan(value)}` },
  ]

  const merchantColumns: ColumnsType<ReportNameValue> = [
    { title: '商家 ID', dataIndex: 'id', width: 90 },
    { title: '商家', dataIndex: 'name' },
    { title: '成交额', dataIndex: 'amount_cent', width: 120, render: (value) => `￥${yuan(value)}` },
  ]

  if (loading && !report) {
    return (
      <Card title={`${scopeLabel}数据报表`} extra={extra}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    )
  }

  return (
    <Space direction="vertical" size={16} className="report-panel">
      <Card
        title={`${scopeLabel}数据报表`}
        extra={
          report ? (
            <Space wrap>
              <Tag color="blue">{report.time_range.date_from} 至 {report.time_range.date_to}</Tag>
              <Text type="secondary">生成：{new Date(report.generated_at).toLocaleString()}</Text>
              {extra}
            </Space>
          ) : extra
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}><Statistic title="成交额" prefix="￥" value={metricValue(getMetric(summary, 'gmv_cent'))} /></Col>
          <Col xs={24} sm={12} lg={6}><Statistic title="有效订单" value={metricValue(getMetric(summary, 'paid_order_count'))} /></Col>
          <Col xs={24} sm={12} lg={6}><Statistic title="商品数" value={metricValue(getMetric(summary, 'product_count'))} /></Col>
          <Col xs={24} sm={12} lg={6}><Statistic title="售后数" value={metricValue(getMetric(summary, 'refund_count'))} /></Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <ChartCard title="近 7 日成交趋势" option={trendOption} empty={!report?.sales_trend.length} />
        </Col>
        <Col xs={24} xl={10}>
          <ChartCard title="订单状态分布" option={buildStatusOption(report?.order_status ?? [])} empty={!report?.order_status.length} />
        </Col>
        <Col xs={24} xl={14}>
          <ChartCard title="商品销量排行" option={buildTopBarOption(report?.top_products ?? [])} empty={!report?.top_products.length} />
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Top 商品明细">
            <Table rowKey="product_id" size="small" columns={topProductColumns} dataSource={report?.top_products ?? []} pagination={false} />
          </Card>
        </Col>
        {report?.scope === 'platform' ? (
          <Col span={24}>
            <Card title="商家成交排行">
              <Table rowKey={(row) => `${row.id}-${row.name}`} size="small" columns={merchantColumns} dataSource={report.top_merchants} pagination={false} />
            </Card>
          </Col>
        ) : null}
        <Col xs={24} xl={12}>
          <Card title="促销与拼团概览">
            <Row gutter={[16, 16]}>
              {promotionSummary.map((metric) => (
                <Col span={8} key={metric.key}>
                  <Statistic title={metric.label} value={metricValue(metric)} />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="社区与种草概览">
            <Row gutter={[16, 16]}>
              {communitySummary.map((metric) => (
                <Col span={8} key={metric.key}>
                  <Statistic title={metric.label} value={metricValue(metric)} />
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}
