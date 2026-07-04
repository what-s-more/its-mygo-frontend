import type { ReactNode } from 'react'

export type ApiResult = {
  title: string
  ok: boolean
  data: unknown
} | null

export function yuan(valueCent?: number | null) {
  return ((valueCent ?? 0) / 100).toFixed(2)
}

export function yuanToCent(value: string) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return undefined
  return Math.round(numberValue * 100)
}

const LIST_SEPARATOR_PATTERN = /[,\uFF0C;；\s]+/

export function ids(value: string) {
  return value
    .split(LIST_SEPARATOR_PATTERN)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

export function randomText(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2, 8)}`
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

export function statusText(status?: string) {
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    draft: '草稿',
    pending_audit: '待审核',
    online: '已上架',
    offline: '已下架',
    paid: '待发货',
    shipped: '待收货',
    completed: '已完成',
    cancelled: '已取消',
    active: '启用',
    disabled: '停用',
    platform_operator: '平台运营',
    merchant_operator: '商家运营',
    merchant_pending: '待审核商家',
  }
  return status ? map[status] ?? status : '-'
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export function ResultBoard({ result }: { result: ApiResult }) {
  return (
    <details className="debug-panel">
      <summary>接口返回排查</summary>
      {result ? (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      ) : (
        <p className="empty">正常使用时不用查看。接口报错或数据异常时，展开这里看最近一次请求结果。</p>
      )}
    </details>
  )
}
