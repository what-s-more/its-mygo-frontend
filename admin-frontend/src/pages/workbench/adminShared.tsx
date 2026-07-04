import { Card, Collapse, Tag, Typography } from 'antd'

const { Text } = Typography

export type ApiLog = {
  title: string
  ok: boolean
  data: unknown
  time: string
}

export function yuan(valueCent?: number | null) {
  return ((valueCent ?? 0) / 100).toFixed(2)
}

export function yuanToCent(value: string | number | undefined) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return 0
  return Math.round(numberValue * 100)
}

const LIST_SEPARATOR_PATTERN = /[,\uFF0C;；\s]+/

export function ids(value?: string) {
  return (value || '')
    .split(LIST_SEPARATOR_PATTERN)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

export function tags(value?: string) {
  return (value || '')
    .split(LIST_SEPARATOR_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function pickData(response: unknown) {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: unknown }).data
  }
  return response
}

export function formatError(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response
    return { status: response?.status, data: response?.data }
  }
  return error instanceof Error ? error.message : error
}

export function assetUrl(url?: string | null) {
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `http://localhost:8000${url}`
}

export function statusText(status?: string) {
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    platform_operator: '平台运营',
    merchant_operator: '商家运营',
    merchant_pending: '待审核商家',
    on_sale: '上架中',
    off_sale: '已下架',
    pending_payment: '待支付',
    group_pending: '待成团',
    pending_shipment: '待发货',
    shipping: '待收货',
    completed: '已完成',
    cancelled: '已取消',
    after_sale: '售后中',
    closed: '已关闭',
    published: '已发布',
    hidden: '已隐藏',
    active: '启用',
    disabled: '停用',
    unused: '未使用',
    used: '已使用',
    expired: '已过期',
    void: '已作废',
    pending_approval: '售后待审核',
    received: '已收到退货',
    refunded: '已退款',
    partial_refunded: '部分退款',
    paid: '已支付',
    unpaid: '未支付',
    group_buy: '拼团订单',
  }
  return status ? map[status] ?? status : '-'
}

export function statusColor(status?: string) {
  if (['approved', 'on_sale', 'completed', 'published', 'active', 'unused', 'paid', 'refunded'].includes(status || '')) {
    return 'green'
  }
  if (['pending', 'pending_payment', 'group_pending', 'pending_shipment', 'shipping', 'after_sale', 'merchant_pending', 'pending_approval', 'received', 'unpaid', 'partial_refunded'].includes(status || '')) {
    return 'orange'
  }
  if (['rejected', 'off_sale', 'cancelled', 'closed', 'hidden', 'disabled', 'expired', 'void'].includes(status || '')) {
    return 'red'
  }
  return 'blue'
}

export function StatusTag({ status }: { status?: string }) {
  return <Tag color={statusColor(status)}>{statusText(status)}</Tag>
}

export function DebugLogs({ logs }: { logs: ApiLog[] }) {
  return (
    <Collapse
      className="debug-collapse"
      items={[
        {
          key: 'debug',
          label: `接口返回排查（最近 ${logs.length} 条）`,
          children:
            logs.length === 0 ? (
              <Text type="secondary">接口异常时展开这里查看最近操作结果。</Text>
            ) : (
              logs.map((log, index) => (
                <Card size="small" key={`${log.time}-${index}`} title={`${log.time} ${log.title}`}>
                  <Tag color={log.ok ? 'green' : 'red'}>{log.ok ? '成功' : '失败'}</Tag>
                  <pre>{JSON.stringify(log.data, null, 2)}</pre>
                </Card>
              ))
            ),
        },
      ]}
    />
  )
}
