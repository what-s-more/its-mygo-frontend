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
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import { uploadService } from '../../services/upload'
import {
  DebugLogs,
  StatusTag,
  formatError,
  ids,
  pickData,
  statusText,
  tags,
  type ApiLog,
  yuan,
  yuanToCent,
} from './adminShared'

const { Title, Paragraph, Text } = Typography
const SESSION = 'merchant'

type PageResult<T> = { list: T[]; total: number }
type AdminProfile = { id: number; username: string; real_name: string; role: string; merchant_id?: number | null }
type MerchantProfile = { id: number; name: string; logo_url?: string | null; announcement?: string | null }
type Category = { id: number; name: string; parent_id?: number | null; sort_order: number }
type CategoryTreeItem = Category & { label: string; depth: number; parentName?: string }
type Product = {
  id: number
  name: string
  description?: string
  cover_url?: string | null
  images?: string[]
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
  owner_merchant_id?: number | null
  created_by_admin_id?: number | null
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
  owner_merchant_id?: number | null
  created_by_admin_id?: number | null
  min_amount_cent: number
  discount_amount_cent: number
  status: string
}
type GroupBuyActivity = {
  id: number
  merchant_id: number
  product_id: number
  sku_id: number
  name: string
  group_size: number
  group_price_cent: number
  status: string
  active_groups: Array<{
    id: number
    joined_count: number
    group_size: number
    status: string
    expire_at: string
  }>
}
type CommunityPost = {
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
type CommunityComment = {
  id: number
  post_id: number
  author?: { id: number; nickname: string; avatar_url?: string | null }
  content: string
  status: string
  created_at: string
}

function assetUrl(url?: string | null) {
  if (!url) return undefined
  return /^https?:\/\//.test(url) ? url : `http://localhost:8000${url}`
}

function pageList<T>(data: unknown) {
  return ((data as PageResult<T> | null)?.list ?? []) as T[]
}

function directList<T>(data: unknown) {
  return ((data as T[] | null) ?? []) as T[]
}

export function MerchantWorkbenchPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<Refund | null>(null)
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetail | null>(null)
  const [refundStatusFilter, setRefundStatusFilter] = useState<string | undefined>()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [fullDiscounts, setFullDiscounts] = useState<FullDiscount[]>([])
  const [groupBuys, setGroupBuys] = useState<GroupBuyActivity[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [communityComments, setCommunityComments] = useState<CommunityComment[]>([])
  const [selectedCommunityPost, setSelectedCommunityPost] = useState<CommunityPost | null>(null)
  const [communityProductMap, setCommunityProductMap] = useState<Record<number, Product>>({})
  const [communityImageUrls, setCommunityImageUrls] = useState<string[]>([])
  const [merchantPostProductCache, setMerchantPostProductCache] = useState<Product[]>([])
  const [merchantPostProductSearchResults, setMerchantPostProductSearchResults] = useState<Product[]>([])
  const [merchantPostProductSearchKeyword, setMerchantPostProductSearchKeyword] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [editImageUrls, setEditImageUrls] = useState<string[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [shippingForm] = Form.useForm()
  const [productFilterForm] = Form.useForm()
  const [merchantProfileForm] = Form.useForm()
  const [groupBuyForm] = Form.useForm()
  const [communityForm] = Form.useForm()
  const merchantId = profile?.merchant_id ?? null
  const selectedMerchantPostProductIds = (Form.useWatch('product_ids', communityForm) ?? []) as number[]

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

  const categoryLabelById = useMemo(() => {
    const map = new Map<number, string>()
    categoryTree.forEach((item) => map.set(item.id, `#${item.id} ${item.label}`))
    return map
  }, [categoryTree])

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
    const data = await run<AdminProfile>('当前商家账号', () => http.get('/admin/auth/me', { headers: { 'X-Admin-Session': SESSION } }))
    if (data) setProfile(data)
  }

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => http.get('/categories'))
    setCategories(directList<Category>(data))
  }

  async function loadMerchantProfile() {
    const data = await run<MerchantProfile>('店铺资料', () =>
      http.get('/admin/merchant/profile', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) {
      setMerchantProfile(data)
      merchantProfileForm.setFieldsValue({
        name: data.name,
        announcement: data.announcement,
      })
    }
  }

  async function updateMerchantProfile(values: { name: string; announcement?: string }) {
    const data = await run<MerchantProfile>('保存店铺资料', () =>
      http.put(
        '/admin/merchant/profile',
        {
          name: values.name,
          logo_url: merchantProfile?.logo_url ?? null,
          announcement: values.announcement ?? null,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    if (data) {
      setMerchantProfile(data)
      await loadMe()
    }
  }

  async function uploadMerchantLogo(file: File) {
    const data = await run<{ url: string }>('上传店铺 Logo', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) {
      setMerchantProfile((current) => current ? { ...current, logo_url: data.url } : current)
    }
    return false
  }

  async function loadProducts(values?: { min_price_yuan?: number; max_price_yuan?: number; sort?: string }) {
    const formValues = values ?? productFilterForm.getFieldsValue()
    const [sortBy, sortOrder] = (formValues.sort || 'newest:desc').split(':')
    const data = await run<PageResult<Product>>('本店商品', () =>
      http.get('/admin/products', {
        params: {
          min_price_cent: formValues.min_price_yuan === undefined ? undefined : yuanToCent(formValues.min_price_yuan),
          max_price_cent: formValues.max_price_yuan === undefined ? undefined : yuanToCent(formValues.max_price_yuan),
          sort_by: sortBy,
          sort_order: sortOrder,
        },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setProducts(pageList<Product>(data))
  }

  async function searchMerchantPostProducts(keyword = '') {
    const trimmedKeyword = keyword.trim()
    setMerchantPostProductSearchKeyword(trimmedKeyword)
    const data = await run<PageResult<Product>>('搜索本店关联商品', () =>
      http.get('/admin/products', {
        params: {
          keyword: trimmedKeyword || undefined,
          page: 1,
          page_size: 30,
          sort_by: 'newest',
          sort_order: 'desc',
        },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    let list = pageList<Product>(data)
    const numericId = Number(trimmedKeyword.replace(/^#/, ''))
    if (Number.isInteger(numericId) && numericId > 0 && !list.some((product) => product.id === numericId)) {
      const detail = await run<Product>('按商品 ID 搜索本店关联商品', () =>
        http.get(`/admin/products/${numericId}`, { headers: { 'X-Admin-Session': SESSION } }),
      )
      if (detail) list = [detail, ...list]
    }
    setMerchantPostProductSearchResults(list)
    setMerchantPostProductCache((current) => {
      const map = new Map<number, Product>()
      ;[...current, ...list].forEach((product) => map.set(product.id, product))
      return Array.from(map.values()).slice(-160)
    })
  }

  async function createProduct(values: {
    category_id?: number
    name: string
    description?: string
    sku_name: string
    price_yuan: number
    market_price_yuan?: number
    stock: number
  }) {
    if (!merchantId) {
      api.warning('当前账号尚未绑定店铺，请先完成平台审核')
      return
    }
    await run('创建商品', () =>
      http.post(
        '/admin/products',
        {
          merchant_id: merchantId,
          category_id: values.category_id ?? null,
          name: values.name,
          description: values.description ?? '',
          cover_url: imageUrls[0] ?? null,
          image_urls: imageUrls,
          skus: [
            {
              name: values.sku_name,
              price_cent: yuanToCent(values.price_yuan),
              market_price_cent: values.market_price_yuan === undefined ? null : yuanToCent(values.market_price_yuan),
              stock: values.stock,
              spec_values: { 规格: values.sku_name },
            },
          ],
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    setImageUrls([])
    await loadProducts()
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product)
    setEditImageUrls(product.images?.length ? product.images : product.cover_url ? [product.cover_url] : [])
  }

  async function updateSelectedProduct(values: {
    category_id?: number
    name: string
    description?: string
  }) {
    if (!selectedProduct) return
    await run('修改商品信息', () =>
      http.put(
        `/admin/products/${selectedProduct.id}`,
        {
          category_id: values.category_id ?? null,
          name: values.name,
          description: values.description ?? '',
          cover_url: editImageUrls[0] ?? null,
          image_urls: editImageUrls,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await reloadSelectedProduct(selectedProduct.id)
    await loadProducts()
  }

  async function updateSku(skuId: number, values: { name?: string; price_yuan?: number; market_price_yuan?: number; stock?: number }) {
    if (!selectedProduct) return
    await run('修改 SKU', () =>
      http.patch(
        `/admin/products/${selectedProduct.id}/skus/${skuId}`,
        {
          name: values.name,
          price_cent: values.price_yuan === undefined ? undefined : yuanToCent(values.price_yuan),
          market_price_cent: values.market_price_yuan === undefined ? undefined : yuanToCent(values.market_price_yuan),
          stock: values.stock,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await reloadSelectedProduct(selectedProduct.id)
    await loadProducts()
  }

  async function addSku(values: { name: string; price_yuan: number; market_price_yuan?: number; stock: number }) {
    if (!selectedProduct) return
    await run('新增 SKU', () =>
      http.post(
        `/admin/products/${selectedProduct.id}/skus`,
        {
          name: values.name,
          price_cent: yuanToCent(values.price_yuan),
          market_price_cent: values.market_price_yuan === undefined ? null : yuanToCent(values.market_price_yuan),
          stock: values.stock,
          spec_values: { 规格: values.name },
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await reloadSelectedProduct(selectedProduct.id)
    await loadProducts()
  }

  async function reloadSelectedProduct(productId: number) {
    const data = await run<Product>('商品详情', () =>
      http.get(`/admin/products/${productId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) selectProduct(data)
  }

  async function productStatus(productId: number, action: 'publish' | 'unpublish') {
    await run(action === 'publish' ? '商品上架' : '商品下架', () =>
      http.post(`/admin/products/${productId}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadProducts()
  }

  async function loadOrders() {
    const data = await run<PageResult<Order>>('本店订单', () => http.get('/admin/orders', { headers: { 'X-Admin-Session': SESSION } }))
    setOrders(pageList<Order>(data))
  }

  async function loadOrderDetail(orderId: number) {
    const data = await run<OrderDetail>('订单详情', () =>
      http.get(`/admin/orders/${orderId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setSelectedOrderDetail(data)
  }

  async function loadRefunds(status = refundStatusFilter) {
    const data = await run<PageResult<Refund>>('本店售后', () =>
      http.get('/admin/refunds', { params: { status }, headers: { 'X-Admin-Session': SESSION } }),
    )
    setRefunds(pageList<Refund>(data))
  }

  async function shipOrder(orderId: number) {
    const values = shippingForm.getFieldsValue()
    await run('订单发货', () =>
      http.post(
        `/admin/orders/${orderId}/ship`,
        {
          logistics_company: values.logistics_company || '商家配送',
          tracking_no: values.tracking_no || `NO${Date.now()}`,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadOrders()
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
    if (selectedOrderDetail) await loadOrderDetail(selectedOrderDetail.id)
  }

  async function openRefundDetail(refund: Refund) {
    setSelectedRefundDetail(refund)
  }

  async function disableCoupon(couponId: number) {
    await run('停用本店优惠券', () =>
      http.post(`/admin/promotions/coupons/${couponId}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadCoupons()
  }

  async function loadCoupons() {
    const data = await run<Coupon[]>('本店优惠券', () => http.get('/admin/promotions/coupons', { headers: { 'X-Admin-Session': SESSION } }))
    const list = directList<Coupon>(data)
    setCoupons(merchantId ? list.filter((coupon) => coupon.owner_merchant_id === merchantId) : [])
  }

  async function loadFullDiscounts() {
    const data = await run<FullDiscount[]>('本店满减活动', () =>
      http.get('/admin/promotions/full-discounts', { headers: { 'X-Admin-Session': SESSION } }),
    )
    const list = directList<FullDiscount>(data)
    setFullDiscounts(merchantId ? list.filter((activity) => activity.owner_merchant_id === merchantId) : [])
  }

  async function createCoupon(values: { name: string; discount_yuan: number; min_yuan: number; total_quantity: number }) {
    if (!merchantId) return
    await run('创建本店优惠券', () =>
      http.post(
        '/admin/promotions/coupons',
        {
          name: values.name,
          scope_type: 'merchant',
          scope_ids: [merchantId],
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

  async function createFullDiscount(values: { name: string; discount_yuan: number; min_yuan: number }) {
    if (!merchantId) return
    await run('创建本店满减', () =>
      http.post(
        '/admin/promotions/full-discounts',
        {
          name: values.name,
          scope_type: 'merchant',
          scope_ids: [merchantId],
          discount_amount_cent: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadFullDiscounts()
  }

  async function loadGroupBuys() {
    const data = await run<GroupBuyActivity[]>('本店拼团活动', () =>
      http.get('/admin/promotions/group-buy', { headers: { 'X-Admin-Session': SESSION } }),
    )
    const list = directList<GroupBuyActivity>(data)
    setGroupBuys(merchantId ? list.filter((activity) => activity.merchant_id === merchantId) : [])
  }

  async function createGroupBuy(values: {
    product_sku: string
    name: string
    group_size: number
    group_price_yuan: number
  }) {
    const [productId, skuId] = values.product_sku.split(':').map(Number)
    if (!productId || !skuId) return
    await run('创建拼团活动', () =>
      http.post(
        '/admin/promotions/group-buy',
        {
          product_id: productId,
          sku_id: skuId,
          name: values.name,
          group_size: values.group_size,
          group_price_cent: yuanToCent(values.group_price_yuan),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadGroupBuys()
  }

  function presetGroupBuy(product: Product, sku: Product['skus'][number]) {
    groupBuyForm.setFieldsValue({
      product_sku: `${product.id}:${sku.id}`,
      name: `${product.name} ${sku.name} 拼团价`,
      group_size: 2,
      group_price_yuan: Number(yuan(sku.price_cent)),
    })
    api.info('已填入拼团商品配置，请到“上传/配置拼团商品”区域确认价格后创建')
  }

  async function disableGroupBuy(activityId: number) {
    await run('停用拼团活动', () =>
      http.post(`/admin/promotions/group-buy/${activityId}/disable`, undefined, {
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    await loadGroupBuys()
  }

  async function loadCommunityPosts(section?: string) {
    const data = await run<PageResult<CommunityPost>>('商家端社区内容', () =>
      http.get('/admin/community/posts', {
        params: { status: 'published', section },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setCommunityPosts(pageList<CommunityPost>(data))
  }

  async function openCommunityPost(post: CommunityPost) {
    setSelectedCommunityPost(post)
    await loadCommunityProducts(post.product_ids)
    const data = await run<PageResult<CommunityComment>>('商家端帖子评论', () =>
      http.get('/admin/community/comments', {
        params: { post_id: post.id, status: 'published' },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setCommunityComments(pageList<CommunityComment>(data))
  }

  async function loadCommunityProducts(productIds: number[]) {
    const missingIds = productIds.filter((id) => !communityProductMap[id])
    if (missingIds.length === 0) return
    const details = await Promise.all(
      missingIds.map((id) =>
        run<Product>('商家端社区关联商品详情', () =>
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

  async function createMerchantPost(values: { title: string; content: string; product_ids?: number[]; topic_tags?: string }) {
    await run('发布商家动态', () =>
      http.post(
        '/admin/community/posts',
        {
          type: 'merchant_ad',
          section: 'merchant',
          title: values.title,
          content: values.content,
          image_urls: communityImageUrls,
          product_ids: values.product_ids ?? [],
          topic_tags: tags(values.topic_tags),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    communityForm.resetFields()
    setCommunityImageUrls([])
    await loadCommunityPosts()
  }

  async function uploadImage(file: File) {
    const data = await run<{ url: string }>('上传商品图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setImageUrls((items) => [...items, data.url])
    return false
  }

  async function uploadEditImage(file: File) {
    const data = await run<{ url: string }>('上传商品编辑图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setEditImageUrls((items) => [...items, data.url])
    return false
  }

  async function uploadCommunityImage(file: File) {
    const data = await run<{ url: string }>('上传社区图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setCommunityImageUrls((items) => [...items, data.url])
    return false
  }

  useEffect(() => {
    void loadMe()
    void loadCategories()
    void loadMerchantProfile()
    void loadProducts()
    void loadOrders()
    void loadRefunds()
    void loadCoupons()
    void loadFullDiscounts()
    void loadGroupBuys()
    void loadCommunityPosts()
  }, [])

  useEffect(() => {
    if (!merchantId) return
    void loadCoupons()
    void loadFullDiscounts()
    void loadGroupBuys()
  }, [merchantId])

  const uploadFiles: UploadFile[] = imageUrls.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `image-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const editUploadFiles: UploadFile[] = editImageUrls.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `edit-image-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const communityUploadFiles: UploadFile[] = communityImageUrls.map((url, index) => ({
    uid: `community-${index}`,
    name: url.split('/').pop() || `community-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const merchantLogoFiles: UploadFile[] = merchantProfile?.logo_url ? [{
    uid: 'merchant-logo',
    name: merchantProfile.logo_url.split('/').pop() || 'merchant-logo',
    status: 'done',
    url: assetUrl(merchantProfile.logo_url),
  }] : []

  const skuOptions = products.flatMap((product) =>
    product.skus.map((sku) => ({
      value: `${product.id}:${sku.id}`,
      label: `商品 #${product.id} ${product.name} / SKU #${sku.id} ${sku.name} / ￥${yuan(sku.price_cent)}`,
    })),
  )

  const searchableMerchantPostProductOptions = useMemo(() => {
    const map = new Map<number, Product>()
    const selectedProducts = merchantPostProductCache.filter((product) => selectedMerchantPostProductIds.includes(product.id))
    const baseProducts = merchantPostProductSearchKeyword ? merchantPostProductSearchResults : [...products, ...merchantPostProductCache]
    ;[...baseProducts, ...selectedProducts].forEach((product) => map.set(product.id, product))
    return Array.from(map.values()).map((product) => ({
      value: product.id,
      label: `#${product.id} ${product.name} / ${product.skus[0] ? `￥${yuan(product.skus[0].price_cent)}` : '暂无 SKU'}`,
    }))
  }, [products, merchantPostProductCache, merchantPostProductSearchKeyword, merchantPostProductSearchResults, selectedMerchantPostProductIds])

  const productColumns: ColumnsType<Product> = [
    {
      title: '商品',
      dataIndex: 'name',
      width: 360,
      render: (_, record) => (
        <Space align="start" style={{ minWidth: 300 }}>
          {record.cover_url ? <Image width={64} height={64} src={assetUrl(record.cover_url)} /> : <div className="table-thumb">图</div>}
          <Space direction="vertical" size={4}>
            <Text strong>{record.name}</Text>
            <Text type="secondary">
              商品 #{record.id}
            </Text>
            <Text type="secondary">
              分类 {record.category_id ? categoryLabelById.get(record.category_id) ?? `#${record.category_id}` : '-'}
            </Text>
          </Space>
        </Space>
      ),
    },
    { title: '状态', dataIndex: 'status', width: 110, render: (status) => <StatusTag status={status} /> },
    {
      title: 'SKU',
      width: 420,
      render: (_, record) => record.skus.map((sku) => (
        <div key={sku.id} className="sku-line">
          <Tag>SKU #{sku.id}</Tag>
          <Text>{sku.name}</Text>
          <Text strong>￥{yuan(sku.price_cent)}</Text>
          {sku.market_price_cent ? <Text delete type="secondary">￥{yuan(sku.market_price_cent)}</Text> : null}
          <Tag color="blue">库存 {sku.stock}</Tag>
        </div>
      )),
    },
    {
      title: '操作',
      width: 190,
      render: (_, record) => (
        <Space wrap>
          <Button onClick={() => selectProduct(record)}>编辑</Button>
          {record.skus[0] ? <Button onClick={() => presetGroupBuy(record, record.skus[0])}>设为拼团</Button> : null}
          <Button onClick={() => productStatus(record.id, 'publish')}>上架</Button>
          <Button danger onClick={() => productStatus(record.id, 'unpublish')}>下架</Button>
        </Space>
      ),
    },
  ]

  const orderColumns: ColumnsType<Order> = [
    { title: '订单', dataIndex: 'order_no', render: (value, record) => <span>{value}<br /><Text type="secondary">#{record.id}</Text></span> },
    { title: '用户', dataIndex: 'user_id', render: (value) => `#${value}` },
    { title: '金额', dataIndex: 'pay_amount_cent', render: (value) => `￥${yuan(value)}` },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button onClick={() => loadOrderDetail(record.id)}>详情</Button>
          <Button disabled={record.status !== 'pending_shipment'} onClick={() => shipOrder(record.id)}>发货</Button>
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
          <Button onClick={() => openRefundDetail(record)}>查看详情</Button>
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
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>商品上传、订单发货与优惠券</Title>
          <Paragraph>商家账号使用独立会话，可与平台账号同时登录。商品创建后直接上架，平台保留管理权。</Paragraph>
        </div>
        <Card>
          <Space direction="vertical">
            <Text strong>{profile?.real_name || profile?.username || '未登录商家账号'}</Text>
            <Text>角色：{statusText(profile?.role)}</Text>
            <Tag color="purple">店铺 ID：{merchantId ? `#${merchantId}` : '待平台审核'}</Tag>
            {merchantProfile ? <Text>店铺：{merchantProfile.name}</Text> : null}
            <Button onClick={loadMe}>刷新商家状态</Button>
          </Space>
        </Card>
      </section>

      <nav className="workbench-jump-nav" aria-label="商家端联调分区导航">
        <a href="#merchant-profile">店铺资料</a>
        <a href="#merchant-create-product">上传商品</a>
        <a href="#merchant-products">商品管理</a>
        <a href="#merchant-orders">订单发货</a>
        <a href="#merchant-refunds">售后处理</a>
        <a href="#merchant-promotions">优惠活动</a>
        <a href="#merchant-group-buy">拼团配置</a>
        <a href="#merchant-community">社区动态</a>
      </nav>

      <Row gutter={[24, 24]}>
        <Col span={24} id="merchant-profile">
          <Card title="店铺资料">
            <Row gutter={[24, 16]}>
              <Col span={6}>
                <Upload
                  listType="picture-card"
                  fileList={merchantLogoFiles}
                  beforeUpload={(file) => uploadMerchantLogo(file)}
                  onRemove={() => {
                    setMerchantProfile((current) => current ? { ...current, logo_url: null } : current)
                    return true
                  }}
                >
                  {merchantLogoFiles.length ? null : <Button>上传 Logo</Button>}
                </Upload>
                <Text type="secondary">Logo 会展示在用户端店铺主页。</Text>
              </Col>
              <Col span={18}>
                <Form
                  form={merchantProfileForm}
                  layout="vertical"
                  onFinish={updateMerchantProfile}
                  disabled={!merchantId}
                >
                  <Row gutter={12}>
                    <Col span={10}>
                      <Form.Item label="店铺名称" name="name" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item label="店铺 ID">
                        <Tag color="purple">{merchantProfile ? `#${merchantProfile.id}` : '待审核'}</Tag>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="店铺公告" name="announcement">
                        <Input.TextArea rows={3} placeholder="填写展示给用户看的店铺公告" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space>
                    <Button type="primary" htmlType="submit" disabled={!merchantId}>保存店铺资料</Button>
                    <Button onClick={loadMerchantProfile} disabled={!merchantId}>刷新店铺资料</Button>
                  </Space>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={24} id="merchant-create-product">
          <Card title="上传商品">
            <Form layout="vertical" onFinish={createProduct} initialValues={{ sku_name: '默认规格', price_yuan: 19.9, stock: 20 }}>
              <Form.Item label="分类" name="category_id">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择商品分类"
                  options={categoryOptions}
                />
              </Form.Item>
              <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="商品描述" name="description">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item label="商品图片" tooltip="可一次选择多张图片，第一张作为封面，其余在商品详情中展示">
                <Upload multiple listType="picture-card" fileList={uploadFiles} beforeUpload={(file) => uploadImage(file)} onRemove={(file) => {
                  setImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                  return true
                }}>
                  <Button>上传图片</Button>
                </Upload>
              </Form.Item>
              <Row gutter={12}>
                <Col span={8}><Form.Item label="SKU 名称" name="sku_name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col span={6}><Form.Item label="价格（元）" name="price_yuan" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item label="划线价（元）" name="market_price_yuan"><InputNumber min={0} precision={2} style={{ width: '100%' }} /></Form.Item></Col>
                <Col span={6}><Form.Item label="库存" name="stock" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
              </Row>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>创建并上架</Button>
            </Form>
          </Card>
        </Col>
        <Col span={24} id="merchant-products">
          <Card title="本店商品" extra={<Button onClick={() => loadProducts()}>刷新</Button>}>
            <Form
              form={productFilterForm}
              layout="inline"
              onFinish={loadProducts}
              initialValues={{ sort: 'newest:desc' }}
            >
              <Form.Item label="最低价" name="min_price_yuan"><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item>
              <Form.Item label="最高价" name="max_price_yuan"><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item>
              <Form.Item label="排序" name="sort">
                <Select style={{ width: 140 }} options={[
                  { value: 'newest:desc', label: '最新上架' },
                  { value: 'price:asc', label: '价格升序' },
                  { value: 'price:desc', label: '价格降序' },
                  { value: 'sales:desc', label: '销量优先' },
                ]} />
              </Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
            </Form>
            <Table
              rowKey="id"
              columns={productColumns}
              dataSource={products}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 1120 }}
            />
            {selectedProduct ? (
              <Card
                size="small"
                className="section-card"
                title={`编辑商品 #${selectedProduct.id}`}
                extra={<Button onClick={() => setSelectedProduct(null)}>关闭</Button>}
              >
                <Form
                  layout="vertical"
                  onFinish={updateSelectedProduct}
                  initialValues={{
                    category_id: selectedProduct.category_id ?? undefined,
                    name: selectedProduct.name,
                    description: selectedProduct.description,
                  }}
                  key={`product-${selectedProduct.id}`}
                >
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="分类" name="category_id">
                        <Select allowClear showSearch optionFilterProp="label" options={categoryOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item label="商品名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="商品描述" name="description"><Input.TextArea rows={3} /></Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="商品图片">
                        <Upload multiple listType="picture-card" fileList={editUploadFiles} beforeUpload={(file) => uploadEditImage(file)} onRemove={(file) => {
                          setEditImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                          return true
                        }}>
                          <Button>上传图片</Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit">保存商品信息</Button>
                </Form>

                <Card size="small" title="SKU 规格" className="section-card">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {selectedProduct.skus.map((sku) => (
                      <Form
                        key={sku.id}
                        layout="inline"
                        onFinish={(values) => updateSku(sku.id, values)}
                        initialValues={{
                          name: sku.name,
                          price_yuan: Number(yuan(sku.price_cent)),
                          market_price_yuan: sku.market_price_cent ? Number(yuan(sku.market_price_cent)) : undefined,
                          stock: sku.stock,
                        }}
                      >
                        <Form.Item label={`SKU #${sku.id}`} name="name" rules={[{ required: true }]}><Input style={{ width: 140 }} /></Form.Item>
                        <Form.Item label="价格（元）" name="price_yuan" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item>
                        <Form.Item label="划线价（元）" name="market_price_yuan"><InputNumber min={0} precision={2} /></Form.Item>
                        <Form.Item label="库存" name="stock" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
                        <Button type="primary" htmlType="submit">保存 SKU</Button>
                      </Form>
                    ))}
                    <Form layout="inline" onFinish={addSku} initialValues={{ name: '新规格', price_yuan: 19.9, stock: 10 }}>
                      <Form.Item label="新增 SKU" name="name" rules={[{ required: true }]}><Input style={{ width: 140 }} /></Form.Item>
                      <Form.Item label="价格（元）" name="price_yuan" rules={[{ required: true }]}><InputNumber min={0} precision={2} /></Form.Item>
                      <Form.Item label="划线价（元）" name="market_price_yuan"><InputNumber min={0} precision={2} /></Form.Item>
                      <Form.Item label="库存" name="stock" rules={[{ required: true }]}><InputNumber min={0} /></Form.Item>
                      <Button htmlType="submit">新增 SKU</Button>
                    </Form>
                  </Space>
                </Card>
              </Card>
            ) : null}
          </Card>
        </Col>
        <Col span={24} id="merchant-orders">
          <Card title="本店订单" extra={<Button onClick={loadOrders}>刷新订单</Button>}>
            <Form layout="inline" form={shippingForm} initialValues={{ logistics_company: '商家配送', tracking_no: `NO${Date.now()}` }}>
              <Form.Item label="物流公司" name="logistics_company"><Input /></Form.Item>
              <Form.Item label="物流单号" name="tracking_no"><Input /></Form.Item>
            </Form>
            <Table rowKey="id" columns={orderColumns} dataSource={orders} pagination={{ pageSize: 8 }} />
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
        <Col span={24} id="merchant-refunds">
          <Card title="本店售后" extra={<Button onClick={() => loadRefunds()}>刷新售后</Button>}>
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
        <Col span={24} id="merchant-promotions">
          <Card title="本店优惠券">
            <Form layout="inline" onFinish={createCoupon} initialValues={{ discount_yuan: 5, min_yuan: 20, total_quantity: 50 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="优惠（元）" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="门槛（元）" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="数量" name="total_quantity"><InputNumber min={1} /></Form.Item>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>创建优惠券</Button>
              <Button onClick={loadCoupons}>刷新</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={coupons}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '券 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '优惠', render: (_, record) => `满 ￥${yuan(record.min_amount_cent)} 减 ￥${yuan(record.discount_value)}` },
                { title: '领取', render: (_, record) => `${record.claimed_quantity}/${record.total_quantity}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, record) => (<Button danger disabled={record.status !== 'active'} onClick={() => disableCoupon(record.id)}>停用</Button>) },
              ]}
            />
          </Card>
        </Col>
        <Col span={24}>
          <Card title="本店满减活动">
            <Form layout="inline" onFinish={createFullDiscount} initialValues={{ discount_yuan: 3, min_yuan: 30 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="满（元）" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="减（元）" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>创建满减</Button>
              <Button onClick={loadFullDiscounts}>刷新</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={fullDiscounts}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '活动 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '规则', render: (_, record) => `每满 ￥${yuan(record.min_amount_cent)} 减 ￥${yuan(record.discount_amount_cent)}` },
                { title: '范围', render: (_, record) => `${record.scope_type} ${record.scope_ids?.join(',') || ''}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, record) => (
                  <Button danger disabled={record.status !== 'active'} onClick={() => run('停用本店满减', () => http.post(`/admin/promotions/full-discounts/${record.id}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } })).then(loadFullDiscounts)}>停用</Button>
                ) },
              ]}
            />
          </Card>
        </Col>
        <Col span={24} id="merchant-group-buy">
          <Card
            title="上传/配置拼团商品"
            extra={<Button onClick={() => { void loadProducts(); void loadGroupBuys() }}>刷新商品与拼团</Button>}
          >
            <Paragraph type="secondary">
              先在“上传商品”或“本店商品管理”中维护商品与 SKU，再在这里选择 SKU 配置为拼团商品。拼团只支持用户直接购买，不进入购物车，不叠加满减或优惠券，也不参与社区种草；用户可使用积分抵扣。
            </Paragraph>
            <Form
              form={groupBuyForm}
              layout="inline"
              onFinish={createGroupBuy}
              initialValues={{ group_size: 2, group_price_yuan: 9.9 }}
            >
              <Form.Item label="商品 SKU" name="product_sku" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  style={{ width: 420 }}
                  placeholder="选择本店商品 SKU 上传为拼团商品"
                  options={skuOptions}
                />
              </Form.Item>
              <Form.Item label="活动名" name="name" rules={[{ required: true }]}>
                <Input placeholder="如 2 人成团体验价" />
              </Form.Item>
              <Form.Item label="人数" name="group_size">
                <Select style={{ width: 100 }} options={[{ value: 2, label: '2 人' }, { value: 3, label: '3 人' }]} />
              </Form.Item>
              <Form.Item label="拼团价（元）" name="group_price_yuan" rules={[{ required: true }]}>
                <InputNumber min={0} precision={2} />
              </Form.Item>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>创建拼团</Button>
              <Button onClick={loadGroupBuys}>刷新</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={groupBuys}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '活动 ID', dataIndex: 'id', render: (id) => <Tag color="purple">#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '商品 / SKU', render: (_, record) => `商品 #${record.product_id} / SKU #${record.sku_id}` },
                { title: '拼团价', dataIndex: 'group_price_cent', render: (value) => `￥${yuan(value)}` },
                { title: '人数', dataIndex: 'group_size', render: (value) => `${value} 人` },
                {
                  title: '正在拼',
                  render: (_, record) => record.active_groups.length
                    ? record.active_groups.map((group) => `团 #${group.id} ${group.joined_count}/${group.group_size}`).join('；')
                    : '暂无',
                },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                {
                  title: '操作',
                  render: (_, record) => (
                    <Button danger disabled={record.status !== 'active'} onClick={() => disableGroupBuy(record.id)}>停用</Button>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col span={24} id="merchant-community">
          <Card
            title="社区广场与商家动态"
            extra={
              <Space wrap>
                <Select
                  allowClear
                  style={{ width: 160 }}
                  placeholder="社区分区"
                  onChange={(value) => loadCommunityPosts(value)}
                  options={[
                    { value: 'square', label: '综合广场' },
                    { value: 'grass', label: '种草专区' },
                    { value: 'merchant', label: '商家动态' },
                    { value: 'help', label: '询问求助' },
                    { value: 'experience', label: '体验分享' },
                  ]}
                />
                <Button onClick={() => loadCommunityPosts()}>刷新社区</Button>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={15}>
                <Row gutter={[12, 12]}>
                  {communityPosts.map((post) => (
                    <Col span={8} key={post.id}>
                      <Card
                        hoverable
                        size="small"
                        cover={
                          post.image_urls[0]
                            ? <Image preview={false} height={120} src={assetUrl(post.image_urls[0])} style={{ objectFit: 'cover' }} />
                            : <div className="post-cover">{statusText(post.type)}</div>
                        }
                        onClick={() => openCommunityPost(post)}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap>
                            <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                            <Tag>{post.section}</Tag>
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
                {communityPosts.length === 0 ? <Text type="secondary">暂无社区内容</Text> : null}
              </Col>
              <Col span={9}>
                <Card size="small" title="发布商家动态">
                  <Form form={communityForm} layout="vertical" onFinish={createMerchantPost}>
                    <Form.Item label="标题" name="title" rules={[{ required: true }]}>
                      <Input placeholder="例如：本店新品上架" />
                    </Form.Item>
                    <Form.Item label="关联商品" name="product_ids">
                      <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        filterOption={false}
                        onSearch={(value) => searchMerchantPostProducts(value)}
                        onFocus={() => searchMerchantPostProducts()}
                        options={searchableMerchantPostProductOptions}
                        placeholder="搜索并选择本店商品"
                      />
                    </Form.Item>
                    <Form.Item label="话题标签" name="topic_tags">
                      <Input placeholder="例如：新品 热销；支持中文逗号、英文逗号或空格" />
                    </Form.Item>
                    <Form.Item label="图片">
                      <Upload
                        multiple
                        listType="picture-card"
                        fileList={communityUploadFiles}
                        beforeUpload={(file) => uploadCommunityImage(file)}
                        onRemove={(file) => {
                          setCommunityImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                          return true
                        }}
                      >
                        <Button>上传图片</Button>
                      </Upload>
                    </Form.Item>
                    <Form.Item label="内容" name="content" rules={[{ required: true }]}>
                      <Input.TextArea rows={5} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" disabled={!merchantId}>发布动态</Button>
                  </Form>
                </Card>
              </Col>
            </Row>
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
        title={selectedCommunityPost ? `社区帖子 #${selectedCommunityPost.id}` : '社区帖子'}
        width={760}
        open={Boolean(selectedCommunityPost)}
        onClose={() => setSelectedCommunityPost(null)}
      >
        {selectedCommunityPost ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Space wrap>
              <Tag color="blue">帖子 #{selectedCommunityPost.id}</Tag>
              <Tag>{statusText(selectedCommunityPost.type)}</Tag>
              <Tag>{selectedCommunityPost.section}</Tag>
              <StatusTag status={selectedCommunityPost.status} />
              <Text type="secondary">作者：{selectedCommunityPost.author?.nickname ?? '-'}</Text>
            </Space>
            <Title level={4}>{selectedCommunityPost.title}</Title>
            <Paragraph>{selectedCommunityPost.content}</Paragraph>
            <Card size="small" title="关联商品">
              {renderCommunityProductCards(selectedCommunityPost.product_ids)}
            </Card>
            {selectedCommunityPost.image_urls.length ? (
              <Image.PreviewGroup>
                <Space wrap>
                  {selectedCommunityPost.image_urls.map((url) => <Image key={url} width={120} src={assetUrl(url)} />)}
                </Space>
              </Image.PreviewGroup>
            ) : null}
            <Divider />
            <Card size="small" title={`评论 ${communityComments.length}`}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {communityComments.map((comment) => (
                  <Card size="small" key={comment.id}>
                    <Space direction="vertical" size={4}>
                      <Text strong>{comment.author?.nickname ?? '-'}</Text>
                      <Text>{comment.content}</Text>
                      <Text type="secondary">评论 #{comment.id} / {new Date(comment.created_at).toLocaleString()}</Text>
                    </Space>
                  </Card>
                ))}
                {communityComments.length === 0 ? <Text type="secondary">暂无评论</Text> : null}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <DebugLogs logs={logs} />
    </main>
  )
}
