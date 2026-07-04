// DEPRECATED: 页面已拆分为 src/pages/admin/* 和 src/pages/merchant/* 下的独立页面。
// 保留此文件仅作为历史参考，不再被路由引用。

import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import { DebugLogs, StatusTag, formatError, ids, pickData, statusText, type ApiLog, yuan, yuanToCent } from './adminShared'

const { Title, Paragraph, Text } = Typography
const SESSION = 'platform'

type PageResult<T> = { list: T[]; total: number }
type Summary = {
  user_count: number
  product_count: number
  order_count: number
  gross_merchandise_cent: number
  pending_shipment_count: number
  after_sale_count: number
}
type MerchantApplication = {
  id: number
  admin_id: number
  merchant_id?: number | null
  merchant_name: string
  announcement?: string | null
  status: string
  reject_reason?: string | null
}
type Category = { id: number; name: string; parent_id?: number | null; sort_order: number }
type CategoryTreeItem = Category & { label: string; depth: number; parentName?: string }
type Product = {
  id: number
  name: string
  description?: string
  cover_url?: string | null
  category_id?: number | null
  status: string
  merchant: { id: number; name: string }
  skus: Array<{ id: number; name: string; price_cent: number; market_price_cent?: number | null; stock: number }>
}
type Order = { id: number; order_no: string; user_id: number; merchant_id: number; status: string; pay_amount_cent: number }
type OrderDetail = Order & {
  payment_id: number
  total_amount_cent: number
  shipping_address?: {
    receiver_name: string
    receiver_mobile: string
    province: string
    city: string
    district?: string | null
    street?: string | null
    detail_address: string
    postal_code?: string | null
    address_tag?: string | null
  } | null
  logistics_company?: string | null
  tracking_no?: string | null
  shipped_at?: string | null
  received_at?: string | null
  items: Array<{
    id: number
    product_id: number
    sku_id: number
    product_name: string
    sku_name: string
    unit_price_cent: number
    quantity: number
    total_amount_cent: number
  }>
}
type Refund = {
  id: number
  order_id: number
  order_item_id?: number | null
  product_id?: number | null
  sku_id?: number | null
  user_id: number
  quantity: number
  refund_amount_cent: number
  reason_type: string
  reason: string
  image_urls: string[]
  status: string
  logs: Array<{ id: number; action: string; message: string }>
}
type Coupon = {
  id: number
  name: string
  scope_type: string
  scope_ids?: number[]
  discount_value: number
  min_amount_cent: number
  status: string
  total_quantity: number
  claimed_quantity: number
}
type FullDiscount = {
  id: number
  name: string
  scope_type: string
  scope_ids?: number[]
  min_amount_cent: number
  discount_amount_cent: number
  status: string
}
type Post = {
  id: number
  type: string
  section: string
  title: string
  content: string
  image_urls: string[]
  product_ids: number[]
  topic_tags: string[]
  status: string
  author?: { id: number; nickname: string; avatar_url?: string | null }
  like_count: number
  comment_count: number
  created_at: string
}
type Comment = {
  id: number
  post_id: number
  author?: { id: number; nickname: string; avatar_url?: string | null }
  content: string
  status: string
  created_at: string
}
type MemberPointsConfig = {
  level_rules: Array<{ level: string; name: string; threshold_cent: number; benefits: string[] }>
  sign_in_base_points: number
  sign_in_streak_increment: number
  sign_in_max_points: number
  points_to_yuan_rate: number
  max_points_discount_percent: number
}

function pageList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

function directList<T>(data: unknown) {
  return ((data as T[] | null) ?? []) as T[]
}

function assetUrl(url?: string | null) {
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `http://localhost:8000${url}`
}

export function PlatformWorkbenchPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [applications, setApplications] = useState<MerchantApplication[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<Refund | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [fullDiscounts, setFullDiscounts] = useState<FullDiscount[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [postComments, setPostComments] = useState<Comment[]>([])
  const [communityProductMap, setCommunityProductMap] = useState<Record<number, Product>>({})
  const [rejectReason, setRejectReason] = useState('资料不完整')
  const [grantUserIds, setGrantUserIds] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CategoryTreeItem | null>(null)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null)
  const [refundStatusFilter, setRefundStatusFilter] = useState<string | undefined>()
  const [memberPointsConfig, setMemberPointsConfig] = useState<MemberPointsConfig | null>(null)
  const [memberPointsConfigText, setMemberPointsConfigText] = useState('')

  const categoryTree = useMemo<CategoryTreeItem[]>(() => {
    const childrenByParent = new Map<number | null, Category[]>()
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), category])
    })
    childrenByParent.forEach((items) => items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
    const walk = (category: Category, depth: number, ancestors: string[]): CategoryTreeItem[] => {
      const labelParts = [...ancestors, category.name]
      const children = childrenByParent.get(category.id) ?? []
      return [
        {
          ...category,
          label: labelParts.join(' / '),
          depth,
          parentName: ancestors[ancestors.length - 1],
        },
        ...children.flatMap((child) => walk(child, depth + 1, labelParts)),
      ]
    }
    return (childrenByParent.get(null) ?? []).flatMap((category) => walk(category, 1, []))
  }, [categories])

  const categoryOptions = useMemo(
    () => categoryTree.map((item) => ({ value: item.id, label: `#${item.id} ${item.label}` })),
    [categoryTree],
  )

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

  async function loadMemberPointsConfig() {
    const data = await run<MemberPointsConfig>('会员积分配置', () =>
      http.get('/admin/settings/member-points', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) {
      setMemberPointsConfig(data)
      setMemberPointsConfigText(JSON.stringify(data, null, 2))
    }
  }

  async function saveMemberPointsConfig() {
    try {
      const payload = JSON.parse(memberPointsConfigText) as MemberPointsConfig
      const data = await run<MemberPointsConfig>('保存会员积分配置', () =>
        http.put('/admin/settings/member-points', payload, { headers: { 'X-Admin-Session': SESSION } }),
      )
      if (data) {
        setMemberPointsConfig(data)
        setMemberPointsConfigText(JSON.stringify(data, null, 2))
      }
    } catch {
      api.error('配置 JSON 格式不正确')
    }
  }

  async function loadApplications(status?: string) {
    const data = await run<PageResult<MerchantApplication>>('商家入驻申请', () =>
      http.get('/admin/merchant/applications', { params: { status }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setApplications(pageList<MerchantApplication>(data))
  }

  async function auditApplication(id: number, approved: boolean) {
    await run(approved ? '入驻通过' : '入驻拒绝', () =>
      http.post(
        `/admin/merchant/applications/${id}/audit`,
        { approved, reject_reason: approved ? null : rejectReason },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadApplications()
  }

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => http.get('/categories'))
    setCategories(directList<Category>(data))
  }

  async function createCategory(values: { name: string; parent_id?: number; sort_order?: number }) {
    await run('创建分类', () =>
      http.post(
        '/admin/categories',
        { name: values.name, parent_id: values.parent_id ?? null, sort_order: values.sort_order ?? 0 },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadCategories()
  }

  async function updateCategory(values: { name?: string; parent_id?: number; sort_order?: number }) {
    if (!selectedCategory) {
      api.warning('请先在分类表格中选择要编辑的分类')
      return
    }
    await run('编辑分类', () =>
      http.put(
        `/admin/categories/${selectedCategory.id}`,
        { name: values.name, parent_id: values.parent_id ?? null, sort_order: values.sort_order ?? 0 },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    setSelectedCategory(null)
    await loadCategories()
  }

  async function disableCategory(categoryId: number) {
    await run('停用分类', () =>
      http.delete(`/admin/categories/${categoryId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (selectedCategory?.id === categoryId) setSelectedCategory(null)
    await loadCategories()
  }

  async function loadProducts(values?: {
    keyword?: string
    category_id?: number
    merchant_id?: number
    min_price_yuan?: number
    max_price_yuan?: number
    sort?: string
  }) {
    const [sortBy, sortOrder] = (values?.sort || 'newest:desc').split(':')
    const data = await run<PageResult<Product>>('商品列表', () =>
      http.get('/admin/products', {
        params: {
          keyword: values?.keyword,
          category_id: values?.category_id,
          merchant_id: values?.merchant_id,
          min_price_cent: values?.min_price_yuan === undefined ? undefined : yuanToCent(values.min_price_yuan),
          max_price_cent: values?.max_price_yuan === undefined ? undefined : yuanToCent(values.max_price_yuan),
          sort_by: sortBy,
          sort_order: sortOrder,
        },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setProducts(pageList<Product>(data))
  }

  async function productStatus(id: number, action: 'publish' | 'unpublish') {
    await run(action === 'publish' ? '商品上架' : '商品下架', () =>
      http.post(`/admin/products/${id}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadProducts()
  }

  async function loadOrders(values?: { status?: string }) {
    const data = await run<PageResult<Order>>('订单列表', () =>
      http.get('/admin/orders', { params: values, headers: { 'X-Admin-Session': SESSION } }),
    )
    setOrders(pageList<Order>(data))
  }

  async function loadOrderDetail(orderId: number) {
    const data = await run<OrderDetail>('订单详情', () =>
      http.get(`/admin/orders/${orderId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setSelectedOrderDetail(data)
  }

  async function loadRefunds(status = refundStatusFilter) {
    const data = await run<PageResult<Refund>>('售后列表', () =>
      http.get('/admin/refunds', { params: { status }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setRefunds(pageList<Refund>(data))
  }

  async function handleRefund(refundId: number, action: 'approve' | 'reject' | 'receive' | 'refund') {
    const actionText = {
      approve: '同意售后',
      reject: '拒绝售后',
      receive: '确认收到退货',
      refund: '确认退款完成',
    }[action]
    await run(actionText, () =>
      http.post(`/admin/refunds/${refundId}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadRefunds()
    await loadOrders()
    await loadSummary()
    if (selectedOrderDetail) await loadOrderDetail(selectedOrderDetail.id)
  }

  async function loadCoupons() {
    const data = await run<Coupon[]>('优惠券列表', () => http.get('/admin/promotions/coupons', { headers: { 'X-Admin-Session': SESSION } }))
    setCoupons(directList<Coupon>(data))
  }

  async function loadFullDiscounts() {
    const data = await run<FullDiscount[]>('满减活动列表', () =>
      http.get('/admin/promotions/full-discounts', { headers: { 'X-Admin-Session': SESSION } }),
    )
    setFullDiscounts(directList<FullDiscount>(data))
  }

  async function createCoupon(values: { name: string; scope_type: string; scope_ids?: string; discount_yuan: number; min_yuan: number; total_quantity: number }) {
    await run('创建平台优惠券', () =>
      http.post(
        '/admin/promotions/coupons',
        {
          name: values.name,
          scope_type: values.scope_type,
          scope_ids: ids(values.scope_ids),
          discount_type: 'amount',
          discount_value: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
          total_quantity: values.total_quantity,
          per_user_limit: 1,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadCoupons()
  }

  async function createFullDiscount(values: { name: string; scope_type: string; scope_ids?: string; discount_yuan: number; min_yuan: number }) {
    await run('创建满减活动', () =>
      http.post(
        '/admin/promotions/full-discounts',
        {
          name: values.name,
          scope_type: values.scope_type,
          scope_ids: ids(values.scope_ids),
          discount_amount_cent: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadFullDiscounts()
  }

  async function loadPosts() {
    const data = await run<PageResult<Post>>('社区内容', () =>
      http.get('/admin/community/posts', { params: { status: 'published' }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setPosts(pageList<Post>(data))
  }

  async function openPost(post: Post) {
    setSelectedPost(post)
    await loadCommunityProducts(post.product_ids)
    const data = await run<PageResult<Comment>>('帖子评论', () =>
      http.get('/admin/community/comments', {
        params: { post_id: post.id, status: 'published' },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setPostComments(pageList<Comment>(data))
  }

  async function loadCommunityProducts(productIds: number[]) {
    const missingIds = productIds.filter((id) => !communityProductMap[id])
    if (missingIds.length === 0) return
    const details = await Promise.all(
      missingIds.map((id) =>
        run<Product>('社区关联商品详情', () =>
          http.get(`/admin/products/${id}`, { headers: { 'X-Admin-Session': SESSION } }),
        ),
      ),
    )
    const products = details.filter(Boolean) as Product[]
    if (!products.length) return
    setCommunityProductMap((current) => {
      const next = { ...current }
      products.forEach((product) => {
        next[product.id] = product
      })
      return next
    })
  }

  function renderCommunityProductCards(productIds: number[]) {
    if (!productIds.length) return <Text type="secondary">暂无关联商品</Text>
    return (
      <div className="community-product-cards">
        {productIds.map((productId) => {
          const product = communityProductMap[productId]
          return (
            <Card key={productId} size="small" className="community-product-card">
              {product ? (
                <Space align="center" size={10}>
                  {product.cover_url ? (
                    <Image width={58} height={58} preview={false} src={assetUrl(product.cover_url)} />
                  ) : (
                    <div className="community-product-thumb">图</div>
                  )}
                  <Space direction="vertical" size={2}>
                    <Text strong ellipsis style={{ maxWidth: 320 }}>{product.name}</Text>
                    <Text type="secondary">商品 #{product.id} / 店铺 #{product.merchant.id} {product.merchant.name}</Text>
                    <Text className="community-product-price">￥{yuan(product.skus[0]?.price_cent)}</Text>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={2}>
                  <Text strong>商品 #{productId}</Text>
                  <Text type="secondary">暂无权限或商品信息加载失败</Text>
                </Space>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  async function hidePost(id: number) {
    await run('隐藏帖子', () => http.post(`/admin/community/posts/${id}/hide`, undefined, { headers: { 'X-Admin-Session': SESSION } }))
    await loadPosts()
    if (selectedPost?.id === id) setSelectedPost(null)
  }

  async function hideComment(id: number) {
    await run('隐藏评论', () => http.post(`/admin/community/comments/${id}/hide`, undefined, { headers: { 'X-Admin-Session': SESSION } }))
    if (selectedPost) await openPost(selectedPost)
  }

  useEffect(() => {
    void loadSummary()
    void loadMemberPointsConfig()
    void loadApplications()
    void loadCategories()
    void loadProducts()
    void loadOrders()
    void loadRefunds()
    void loadCoupons()
    void loadFullDiscounts()
    void loadPosts()
  }, [])

  const applicationColumns: ColumnsType<MerchantApplication> = [
    { title: '申请 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
    { title: '入驻资料', render: (_, row) => <span><Text strong>{row.merchant_name}</Text><br /><Text type="secondary">{row.announcement || '-'}</Text></span> },
    { title: '账号/店铺', render: (_, row) => `账号 #${row.admin_id} / 店铺 ${row.merchant_id ? `#${row.merchant_id}` : '-'}` },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    { title: '操作', render: (_, row) => (
      <Space>
        <Button type="primary" disabled={row.status === 'approved'} onClick={() => auditApplication(row.id, true)}>通过</Button>
        <Button danger disabled={row.status === 'approved'} onClick={() => auditApplication(row.id, false)}>拒绝</Button>
      </Space>
    ) },
  ]

  const productColumns: ColumnsType<Product> = [
    { title: '商品', render: (_, row) => <span><Text strong>{row.name}</Text><br /><Text type="secondary">商品 #{row.id} / 店铺 #{row.merchant.id} / 分类 #{row.category_id ?? '-'}</Text></span> },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    {
      title: 'SKU',
      render: (_, row) => row.skus.map((sku) => (
        <Tag key={sku.id}>
          #{sku.id} ￥{yuan(sku.price_cent)}
          {sku.market_price_cent ? ` / 划线 ￥${yuan(sku.market_price_cent)}` : ''} 库存 {sku.stock}
        </Tag>
      )),
    },
    { title: '管理', render: (_, row) => <Space><Button onClick={() => productStatus(row.id, 'publish')}>上架</Button><Button danger onClick={() => productStatus(row.id, 'unpublish')}>下架</Button></Space> },
  ]

  const categoryColumns: ColumnsType<CategoryTreeItem> = [
    { title: '分类', render: (_, row) => <span><Text strong>{row.label}</Text><br /><Text type="secondary">分类 #{row.id}</Text></span> },
    { title: '层级', dataIndex: 'depth', render: (depth) => <Tag color={depth === 1 ? 'blue' : depth === 2 ? 'purple' : 'geekblue'}>{depth} 级</Tag> },
    { title: '父级', render: (_, row) => row.parentName ?? '-' },
    { title: '排序', dataIndex: 'sort_order' },
    {
      title: '操作',
      render: (_, row) => (
        <Space>
          <Button onClick={() => setSelectedCategory(row)}>编辑</Button>
          <Button danger onClick={() => disableCategory(row.id)}>停用</Button>
        </Space>
      ),
    },
  ]

  const refundColumns: ColumnsType<Refund> = [
    {
      title: '售后',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Tag color="blue">售后 #{record.id}</Tag>
          <Text type="secondary">订单 #{record.order_id}</Text>
          <Text type="secondary">用户 #{record.user_id}</Text>
        </Space>
      ),
    },
    {
      title: '商品明细',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>明细 #{record.order_item_id ?? '-'}</Text>
          <Text type="secondary">商品 #{record.product_id ?? '-'} / SKU #{record.sku_id ?? '-'}</Text>
          <Tag>数量 {record.quantity}</Tag>
        </Space>
      ),
    },
    { title: '金额', dataIndex: 'refund_amount_cent', width: 110, render: (value) => `￥${yuan(value)}` },
    {
      title: '原因',
      width: 260,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text>{record.reason_type}</Text>
          <Text type="secondary">{record.reason}</Text>
          {record.image_urls.length ? <Tag color="purple">凭证 {record.image_urls.length} 张</Tag> : null}
        </Space>
      ),
    },
    {
      title: '状态/记录',
      width: 240,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <StatusTag status={record.status} />
          {record.logs.slice(-2).map((log) => (
            <Text key={log.id} type="secondary">{log.action}：{log.message}</Text>
          ))}
        </Space>
      ),
    },
    {
      title: '操作',
      width: 260,
      render: (_, record) => (
        <Space wrap>
          <Button onClick={() => setSelectedRefundDetail(record)}>查看详情</Button>
          <Button disabled={record.status !== 'pending_approval'} onClick={() => handleRefund(record.id, 'approve')}>同意</Button>
          <Button danger disabled={record.status !== 'pending_approval'} onClick={() => handleRefund(record.id, 'reject')}>拒绝</Button>
          <Button disabled={record.status !== 'approved'} onClick={() => handleRefund(record.id, 'receive')}>确认收货</Button>
          <Button type="primary" disabled={!['approved', 'received'].includes(record.status)} onClick={() => handleRefund(record.id, 'refund')}>退款完成</Button>
        </Space>
      ),
    },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>商家审核、分类配置与平台监管</Title>
          <Paragraph>平台只审核商家入驻，不创建商品和店铺；商品、帖子、评论发布后由平台进行管理。</Paragraph>
        </div>
      </section>

      <nav className="workbench-jump-nav" aria-label="平台端联调分区导航">
        <a href="#platform-summary">数据概览</a>
        <a href="#platform-applications">入驻审核</a>
        <a href="#platform-categories">分类管理</a>
        <a href="#platform-products">商品监管</a>
        <a href="#platform-orders">订单售后</a>
        <a href="#platform-points">会员积分</a>
        <a href="#platform-promotions">促销配置</a>
        <a href="#platform-community">社区管理</a>
      </nav>

      <Row gutter={[24, 24]}>
        <Col span={4} id="platform-summary"><Card><Statistic title="用户" value={summary?.user_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="商品" value={summary?.product_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="订单" value={summary?.order_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="成交额" value={yuan(summary?.gross_merchandise_cent)} prefix="￥" /></Card></Col>
        <Col span={4}><Card><Statistic title="待发货" value={summary?.pending_shipment_count ?? 0} /></Card></Col>
        <Col span={4}><Card><Statistic title="售后" value={summary?.after_sale_count ?? 0} /></Card></Col>

        <Col span={24} id="platform-applications">
          <Card title="商家入驻审核">
            <Form layout="inline" onFinish={(values) => loadApplications(values.status)}>
              <Form.Item label="状态" name="status"><Select allowClear style={{ width: 150 }} options={[
                { value: 'pending', label: '待审核' },
                { value: 'approved', label: '已通过' },
                { value: 'rejected', label: '已拒绝' },
              ]} /></Form.Item>
              <Form.Item label="拒绝原因"><Input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadApplications()}>刷新</Button>
            </Form>
            <Table rowKey="id" columns={applicationColumns} dataSource={applications} pagination={{ pageSize: 8 }} />
          </Card>
        </Col>

        <Col span={10} id="platform-categories">
          <Card title="分类管理">
            <Form layout="vertical" onFinish={createCategory}>
              <Form.Item label="分类名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="父级分类" name="parent_id" tooltip="不选择则创建一级分类，最多支持三级分类">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择父级分类"
                  options={categoryOptions}
                />
              </Form.Item>
              <Form.Item label="排序" name="sort_order" initialValue={0} tooltip="同一父级下数字越小越靠前">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
              <Space><Button type="primary" htmlType="submit">创建分类</Button><Button onClick={loadCategories}>刷新</Button></Space>
            </Form>
            <Table
              size="small"
              rowKey="id"
              columns={categoryColumns}
              dataSource={categoryTree}
              pagination={{ pageSize: 6 }}
            />
            {selectedCategory ? (
              <Card size="small" title={`编辑分类 #${selectedCategory.id}`} className="section-card">
                <Form
                  layout="vertical"
                  onFinish={updateCategory}
                  initialValues={{
                    name: selectedCategory.name,
                    parent_id: selectedCategory.parent_id ?? undefined,
                    sort_order: selectedCategory.sort_order,
                  }}
                  key={selectedCategory.id}
                >
                  <Form.Item label="分类名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                  <Form.Item label="父级分类" name="parent_id">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={categoryOptions.filter((item) => item.value !== selectedCategory.id)}
                    />
                  </Form.Item>
                  <Form.Item label="排序" name="sort_order"><InputNumber style={{ width: '100%' }} /></Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit">保存分类</Button>
                    <Button onClick={() => setSelectedCategory(null)}>取消</Button>
                  </Space>
                </Form>
              </Card>
            ) : null}
          </Card>
        </Col>

        <Col span={14} id="platform-products">
          <Card title="商品监管">
            <Form layout="inline" onFinish={loadProducts}>
              <Form.Item label="关键词" name="keyword"><Input /></Form.Item>
              <Form.Item label="分类" name="category_id">
                <Select allowClear showSearch optionFilterProp="label" style={{ width: 220 }} options={categoryOptions} />
              </Form.Item>
              <Form.Item label="店铺 ID" name="merchant_id"><InputNumber min={1} /></Form.Item>
              <Form.Item label="最低价" name="min_price_yuan"><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item>
              <Form.Item label="最高价" name="max_price_yuan"><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item>
              <Form.Item label="排序" name="sort" initialValue="newest:desc">
                <Select style={{ width: 140 }} options={[
                  { value: 'newest:desc', label: '最新上架' },
                  { value: 'price:asc', label: '价格升序' },
                  { value: 'price:desc', label: '价格降序' },
                  { value: 'sales:desc', label: '销量优先' },
                ]} />
              </Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadProducts()}>刷新</Button>
            </Form>
            <Table rowKey="id" columns={productColumns} dataSource={products} pagination={{ pageSize: 8 }} />
          </Card>
        </Col>

        <Col span={24} id="platform-orders">
          <Card title="订单管理">
            <Form layout="inline" onFinish={loadOrders}>
              <Form.Item label="状态" name="status"><Select allowClear style={{ width: 160 }} options={[
                { value: 'pending_payment', label: '待支付' },
                { value: 'pending_shipment', label: '待发货' },
                { value: 'shipping', label: '待收货' },
                { value: 'completed', label: '已完成' },
              ]} /></Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadOrders()}>刷新</Button>
              <Button onClick={() => run('导出订单 CSV', () => http.get('/admin/orders/export', { responseType: 'text', headers: { 'X-Admin-Session': SESSION } }))}>导出 CSV</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={orders}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: '订单', dataIndex: 'order_no', render: (value, row) => <span>{value}<br /><Text type="secondary">#{row.id}</Text></span> },
                { title: '用户/店铺', render: (_, row) => `用户 #${row.user_id} / 店铺 #${row.merchant_id}` },
                { title: '金额', dataIndex: 'pay_amount_cent', render: (value) => `￥${yuan(value)}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, row) => <Button onClick={() => loadOrderDetail(row.id)}>详情</Button> },
              ]}
            />
            {selectedOrderDetail ? (
              <Card
                size="small"
                className="section-card"
                title={`订单详情 #${selectedOrderDetail.id}`}
                extra={<Button onClick={() => setSelectedOrderDetail(null)}>关闭</Button>}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="blue">支付单 #{selectedOrderDetail.payment_id}</Tag>
                    <Tag color="purple">店铺 #{selectedOrderDetail.merchant_id}</Tag>
                    <StatusTag status={selectedOrderDetail.status} />
                    <Text>实付 ￥{yuan(selectedOrderDetail.pay_amount_cent)}</Text>
                    <Text type="secondary">订单金额 ￥{yuan(selectedOrderDetail.total_amount_cent)}</Text>
                  </Space>
                  {selectedOrderDetail.shipping_address ? (
                    <Text>
                      收货：
                      {selectedOrderDetail.shipping_address.receiver_name} {selectedOrderDetail.shipping_address.receiver_mobile}，
                      {selectedOrderDetail.shipping_address.province}{selectedOrderDetail.shipping_address.city}
                      {selectedOrderDetail.shipping_address.district ?? ''}{selectedOrderDetail.shipping_address.street ?? ''}
                      {selectedOrderDetail.shipping_address.detail_address}
                    </Text>
                  ) : <Text type="secondary">未保存收货地址快照</Text>}
                  {selectedOrderDetail.logistics_company ? (
                    <Text type="secondary">物流：{selectedOrderDetail.logistics_company} / {selectedOrderDetail.tracking_no}</Text>
                  ) : null}
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={selectedOrderDetail.items}
                    columns={[
                      { title: '明细', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                      { title: '商品', render: (_, item) => `${item.product_name} / 商品 #${item.product_id}` },
                      { title: 'SKU', render: (_, item) => `${item.sku_name} / SKU #${item.sku_id}` },
                      { title: '单价', dataIndex: 'unit_price_cent', render: (value) => `￥${yuan(value)}` },
                      { title: '数量', dataIndex: 'quantity' },
                      { title: '小计', dataIndex: 'total_amount_cent', render: (value) => `￥${yuan(value)}` },
                    ]}
                  />
                </Space>
              </Card>
            ) : null}
          </Card>
        </Col>

        <Col span={24} id="platform-points">
          <Card title="售后处理" extra={<Button onClick={() => loadRefunds()}>刷新售后</Button>}>
            <Form layout="inline" className="query-form">
              <Form.Item label="售后状态">
                <Select
                  allowClear
                  style={{ width: 160 }}
                  value={refundStatusFilter}
                  onChange={(value) => {
                    setRefundStatusFilter(value)
                    void loadRefunds(value)
                  }}
                  options={[
                    { value: 'pending_approval', label: '待审核' },
                    { value: 'approved', label: '已同意' },
                    { value: 'rejected', label: '已拒绝' },
                    { value: 'received', label: '已收货' },
                    { value: 'refunded', label: '已退款' },
                  ]}
                />
              </Form.Item>
            </Form>
            <Table
              rowKey="id"
              columns={refundColumns}
              dataSource={refunds}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 1320 }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title="会员与积分规则"
            extra={<Button onClick={loadMemberPointsConfig}>刷新配置</Button>}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={10}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Text type="secondary">积分像账户余额，可与优惠券、满减、限时价、拼团等叠加；实际抵扣上限由这里的平台配置决定。</Text>
                  {memberPointsConfig ? (
                    <Space wrap>
                      <Tag color="purple">签到基础 {memberPointsConfig.sign_in_base_points} 分</Tag>
                      <Tag>连续递增 {memberPointsConfig.sign_in_streak_increment} 分</Tag>
                      <Tag>签到封顶 {memberPointsConfig.sign_in_max_points} 分</Tag>
                      <Tag color="blue">{memberPointsConfig.points_to_yuan_rate} 积分 = 1 元</Tag>
                      <Tag color="orange">单笔最多抵扣 {memberPointsConfig.max_points_discount_percent}%</Tag>
                    </Space>
                  ) : null}
                  <Table
                    size="small"
                    rowKey="level"
                    pagination={false}
                    dataSource={memberPointsConfig?.level_rules ?? []}
                    columns={[
                      { title: '等级', dataIndex: 'name' },
                      { title: '标识', dataIndex: 'level' },
                      { title: '消费门槛', dataIndex: 'threshold_cent', render: (value) => `￥${yuan(value)}` },
                      { title: '权益', dataIndex: 'benefits', render: (value: string[]) => value.join('、') || '-' },
                    ]}
                  />
                </Space>
              </Col>
              <Col xs={24} lg={14}>
                <Input.TextArea
                  rows={12}
                  value={memberPointsConfigText}
                  onChange={(event) => setMemberPointsConfigText(event.target.value)}
                />
                <Space style={{ marginTop: 12 }}>
                  <Button type="primary" onClick={saveMemberPointsConfig}>保存配置</Button>
                  <Text type="secondary">配置保存后，用户端会员等级、签到奖励和后续积分抵扣计算都会按新规则执行。</Text>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24} id="platform-promotions">
          <Card title="平台优惠券">
            <Form layout="inline" onFinish={createCoupon} initialValues={{ scope_type: 'all', discount_yuan: 5, min_yuan: 20, total_quantity: 100 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="范围" name="scope_type"><Select style={{ width: 130 }} options={[
                { value: 'all', label: '全平台' },
                { value: 'category', label: '分类' },
                { value: 'product', label: '商品' },
                { value: 'sku', label: 'SKU' },
              ]} /></Form.Item>
              <Form.Item label="范围 ID" name="scope_ids"><Input placeholder="可用中文逗号、英文逗号或空格分隔" /></Form.Item>
              <Form.Item label="优惠" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="门槛" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="数量" name="total_quantity"><InputNumber min={1} /></Form.Item>
              <Button type="primary" htmlType="submit">创建</Button>
              <Button onClick={loadCoupons}>刷新</Button>
            </Form>
            <Form layout="inline" className="query-form">
              <Form.Item label="批量发券用户 ID"><Input value={grantUserIds} onChange={(event) => setGrantUserIds(event.target.value)} placeholder="可用中文逗号、英文逗号或空格分隔" /></Form.Item>
            </Form>
            <Table
              rowKey="id"
              dataSource={coupons}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '券 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '范围', render: (_, row) => `${row.scope_type} ${row.scope_ids?.join(',') || ''}` },
                { title: '优惠', render: (_, row) => `满 ￥${yuan(row.min_amount_cent)} 减 ￥${yuan(row.discount_value)}` },
                { title: '领取', render: (_, row) => `${row.claimed_quantity}/${row.total_quantity}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, row) => (
                  <Space>
                    <Button onClick={() => run('批量发券', () => http.post(`/admin/promotions/coupons/${row.id}/batch-grant`, { user_ids: ids(grantUserIds) }, { headers: { 'X-Admin-Session': SESSION } }))}>批量发券</Button>
                    <Button danger onClick={() => run('停用优惠券', () => http.post(`/admin/promotions/coupons/${row.id}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } })).then(loadCoupons)}>停用</Button>
                  </Space>
                ) },
              ]}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="满减活动">
            <Form layout="inline" onFinish={createFullDiscount} initialValues={{ scope_type: 'all', discount_yuan: 3, min_yuan: 30 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="范围" name="scope_type"><Select style={{ width: 130 }} options={[
                { value: 'all', label: '全平台' },
                { value: 'merchant', label: '店铺' },
                { value: 'category', label: '分类' },
                { value: 'product', label: '商品' },
                { value: 'sku', label: 'SKU' },
              ]} /></Form.Item>
              <Form.Item label="范围 ID" name="scope_ids"><Input placeholder="可用中文逗号、英文逗号或空格分隔" /></Form.Item>
              <Form.Item label="满（元）" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="减（元）" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Button type="primary" htmlType="submit">创建满减</Button>
              <Button onClick={loadFullDiscounts}>刷新</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={fullDiscounts}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '活动 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '范围', render: (_, row) => `${row.scope_type} ${row.scope_ids?.join(',') || ''}` },
                { title: '规则', render: (_, row) => `满 ￥${yuan(row.min_amount_cent)} 减 ￥${yuan(row.discount_amount_cent)}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, row) => (
                  <Button danger onClick={() => run('停用满减', () => http.post(`/admin/promotions/full-discounts/${row.id}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } })).then(loadFullDiscounts)}>停用</Button>
                ) },
              ]}
            />
          </Card>
        </Col>

        <Col span={24} id="platform-community">
          <Card
            title="社区管理"
            extra={
              <Space wrap>
                <Select
                  allowClear
                  style={{ width: 160 }}
                  placeholder="分区筛选"
                  onChange={(section) =>
                    run<PageResult<Post>>('社区内容', () =>
                      http.get('/admin/community/posts', {
                        params: { status: 'published', section },
                        headers: { 'X-Admin-Session': SESSION },
                      }),
                    ).then((data) => setPosts(pageList<Post>(data)))
                  }
                  options={[
                    { value: 'square', label: '综合广场' },
                    { value: 'grass', label: '种草专区' },
                    { value: 'merchant', label: '商家动态' },
                    { value: 'help', label: '询问求助' },
                    { value: 'experience', label: '体验分享' },
                  ]}
                />
                <Button onClick={loadPosts}>刷新社区内容</Button>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              {posts.map((post) => (
                <Col span={6} key={post.id}>
                  <Card
                    hoverable
                    size="small"
                    cover={
                      post.image_urls[0]
                        ? <Image preview={false} height={140} src={assetUrl(post.image_urls[0])} style={{ objectFit: 'cover' }} />
                        : <div className="post-cover">{statusText(post.type)}</div>
                    }
                    actions={[
                      <Button type="link" onClick={() => openPost(post)}>详情</Button>,
                      <Button type="link" danger onClick={() => hidePost(post.id)}>隐藏</Button>,
                    ]}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                        <Tag>{post.section}</Tag>
                        <StatusTag status={post.status} />
                      </Space>
                      <Text strong ellipsis>{post.title}</Text>
                      <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                      <Text type="secondary">作者：{post.author?.nickname ?? '-'}</Text>
                      <Text type="secondary">赞 {post.like_count} / 评 {post.comment_count}</Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
            {posts.length === 0 ? <Text type="secondary">暂无社区内容</Text> : null}
          </Card>
        </Col>
      </Row>

      <Drawer
        title={selectedRefundDetail ? `售后详情 #${selectedRefundDetail.id}` : '售后详情'}
        width={720}
        open={Boolean(selectedRefundDetail)}
        onClose={() => setSelectedRefundDetail(null)}
      >
        {selectedRefundDetail ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="售后 ID">{selectedRefundDetail.id}</Descriptions.Item>
              <Descriptions.Item label="状态"><StatusTag status={selectedRefundDetail.status} /></Descriptions.Item>
              <Descriptions.Item label="订单 ID">{selectedRefundDetail.order_id}</Descriptions.Item>
              <Descriptions.Item label="订单明细">{selectedRefundDetail.order_item_id ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="商品 / SKU">
                #{selectedRefundDetail.product_id ?? '-'} / #{selectedRefundDetail.sku_id ?? '-'}
              </Descriptions.Item>
              <Descriptions.Item label="用户 ID">#{selectedRefundDetail.user_id}</Descriptions.Item>
              <Descriptions.Item label="退款数量">{selectedRefundDetail.quantity}</Descriptions.Item>
              <Descriptions.Item label="退款金额">￥{yuan(selectedRefundDetail.refund_amount_cent)}</Descriptions.Item>
              <Descriptions.Item label="原因类型">{selectedRefundDetail.reason_type}</Descriptions.Item>
              <Descriptions.Item label="用户说明" span={2}>{selectedRefundDetail.reason}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="用户凭证图">
              {selectedRefundDetail.image_urls.length ? (
                <Image.PreviewGroup>
                  <Space wrap>
                    {selectedRefundDetail.image_urls.map((url) => (
                      <Image key={url} width={120} height={120} src={assetUrl(url)} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ) : (
                <Text type="secondary">用户未上传凭证图</Text>
              )}
            </Card>
            <Card size="small" title="处理记录">
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedRefundDetail.logs.length ? selectedRefundDetail.logs.map((log) => (
                  <Card size="small" key={log.id}>
                    <Space direction="vertical" size={2}>
                      <Tag>{log.action}</Tag>
                      <Text>{log.message}</Text>
                    </Space>
                  </Card>
                )) : <Text type="secondary">暂无处理记录</Text>}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <Drawer
        title={selectedPost ? `社区帖子 #${selectedPost.id}` : '社区帖子'}
        width={780}
        open={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
      >
        {selectedPost ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Space wrap>
              <Tag color="blue">帖子 #{selectedPost.id}</Tag>
              <Tag>{statusText(selectedPost.type)}</Tag>
              <Tag>{selectedPost.section}</Tag>
              <StatusTag status={selectedPost.status} />
              <Text type="secondary">作者：{selectedPost.author?.nickname ?? '-'}</Text>
            </Space>
            <Title level={4}>{selectedPost.title}</Title>
            <Paragraph>{selectedPost.content}</Paragraph>
            <Card size="small" title="关联商品">
              {renderCommunityProductCards(selectedPost.product_ids)}
            </Card>
            {selectedPost.image_urls.length ? (
              <Image.PreviewGroup>
                <Space wrap>
                  {selectedPost.image_urls.map((url) => <Image key={url} width={120} src={assetUrl(url)} />)}
                </Space>
              </Image.PreviewGroup>
            ) : null}
            <Divider />
            <Card size="small" title={`评论管理 ${postComments.length}`}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {postComments.map((comment) => (
                  <Card
                    size="small"
                    key={comment.id}
                    extra={<Button danger size="small" onClick={() => hideComment(comment.id)}>隐藏评论</Button>}
                  >
                    <Space direction="vertical" size={4}>
                      <Text strong>{comment.author?.nickname ?? '-'}</Text>
                      <Text>{comment.content}</Text>
                      <Text type="secondary">评论 #{comment.id} / {new Date(comment.created_at).toLocaleString()}</Text>
                    </Space>
                  </Card>
                ))}
                {postComments.length === 0 ? <Text type="secondary">暂无评论</Text> : null}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <DebugLogs logs={logs} />
    </main>
  )
}
