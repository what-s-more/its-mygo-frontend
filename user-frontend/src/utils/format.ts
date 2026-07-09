export function yuan(valueCent?: number | null) {
  return ((valueCent ?? 0) / 100).toFixed(2)
}

export function yuanToCent(value: string) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return undefined
  return Math.round(numberValue * 100)
}

export function absoluteAssetUrl(url?: string | null) {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
  const configuredAssetBase = import.meta.env.VITE_ASSET_BASE_URL
  const apiBase = String(apiBaseUrl)
  const assetOrigin = configuredAssetBase
    ? String(configuredAssetBase).replace(/\/$/, '')
    : /^https?:\/\//.test(apiBase)
      ? apiBase.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '')
      : 'http://localhost:8000'
  return `${assetOrigin}${url.startsWith('/') ? url : `/${url}`}`
}

const STATUS_TEXT_MAP: Record<string, string> = {
  pending: '拼团中',
  success: '已成团',
  failed: '未成团',
  pending_payment: '待支付',
  group_pending: '待成团',
  pending_shipment: '待发货',
  shipping: '待收货',
  pending_receipt: '待收货',
  completed: '已完成',
  cancelled: '已取消',
  after_sale: '售后中',
  closed: '已关闭',
  published: '已发布',
  hidden: '已隐藏',
  on_sale: '上架中',
  off_sale: '已下架',
  active: '可领取',
  unused: '未使用',
  used: '已使用',
  expired: '已过期',
  disabled: '已停用',
  void: '已作废',
  unpaid: '未支付',
  paid: '已支付',
  refunded: '已退款',
  partial_refunded: '部分退款',
  pending_approval: '售后待审核',
  approved: '售后已同意',
  rejected: '售后已拒绝',
  received: '已收到退货',
  normal: '普通帖',
  grass: '种草帖',
  merchant_ad: '商家动态',
  group_buy: '拼团订单',
  square: '综合广场',
  merchant: '商家动态',
  help: '询问求助',
  experience: '体验分享',
}

export function statusText(status?: string) {
  return status ? STATUS_TEXT_MAP[status] ?? status : '-'
}

export function statusColor(status?: string) {
  if (['completed', 'published', 'on_sale', 'active', 'unused', 'paid', 'refunded'].includes(status || '')) return 'green'
  if (['pending_payment', 'group_pending', 'pending_shipment', 'shipping', 'pending_receipt', 'after_sale', 'unpaid', 'pending_approval', 'approved', 'received'].includes(status || '')) {
    return 'orange'
  }
  if (['cancelled', 'closed', 'hidden', 'disabled', 'expired', 'rejected'].includes(status || '')) return 'red'
  return 'blue'
}

const LIST_SEPARATOR_PATTERN = /[,\uFF0C;；\s]+/

export function splitTags(value: string) {
  return value
    .split(LIST_SEPARATOR_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function splitNumbers(value: string) {
  return value
    .split(LIST_SEPARATOR_PATTERN)
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

export function randomToken(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

export function pickErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    return response?.data?.message
  }
  return undefined
}
