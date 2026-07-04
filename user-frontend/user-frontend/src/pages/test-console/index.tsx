import {
  Alert,
  Badge,
  Avatar,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Pagination,
  QRCode,
  Rate,
  Row,
  Select,
  Segmented,
  Skeleton,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addressService, type Address } from '../../services/address'
import { authService, type MemberLevel, type PointsAccount, type PointsLog, type UserProfile } from '../../services/auth'
import {
  communityService,
  type CommunityComment,
  type CommunityPost,
  type CommunityTopic,
  type CommunityUserProfile,
} from '../../services/community'
import { groupBuyService, type GroupBuyActivity, type GroupBuyOrderResult } from '../../services/groupBuy'
import { getApiErrorMessage } from '../../services/http'
import { orderService, type AlipayPrecreateResult, type CartItem, type CheckoutResult, type Order, type Payment, type Refund } from '../../services/order'
import {
  productService,
  type Category,
  type MerchantFollowItem,
  type ProductDetail,
  type ProductFavoriteItem,
  type ProductFavoriteStatus,
  type ProductListItem,
  type ProductReview,
} from '../../services/product'
import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'
import { uploadService } from '../../services/upload'

const { Title, Text, Paragraph } = Typography

type ApiResult = {
  title: string
  ok: boolean
  data: unknown
  time: string
}

type CategoryTreeItem = Category & {
  label: string
  depth: number
  parentName?: string
}

function yuan(valueCent?: number | null) {
  return ((valueCent ?? 0) / 100).toFixed(2)
}

function yuanToCent(value: string) {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) return undefined
  return Math.round(numberValue * 100)
}

const LIST_SEPARATOR_PATTERN = /[,\uFF0C;；\s]+/

function splitTags(value: string) {
  return value
    .split(LIST_SEPARATOR_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean)
}

function productDetailToListItem(product: ProductDetail): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    cover_url: product.cover_url,
    price_cent: product.skus[0]?.price_cent ?? 0,
    market_price_cent: product.skus[0]?.market_price_cent,
    merchant_id: product.merchant.id,
    merchant_name: product.merchant.name,
    sales_count: 0,
    tags: [],
  }
}

function isCouponTemplateClaimable(coupon: CouponTemplate) {
  return coupon.status === 'active' && (coupon.total_quantity === 0 || coupon.claimed_quantity < coupon.total_quantity)
}

function isUserCouponUsable(coupon: UserCoupon) {
  return coupon.status === 'unused' && coupon.template.status === 'active'
}

function pickData(response: unknown) {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: unknown }).data
  }
  return response
}

function formatError(error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: unknown } }).response
    return { status: response?.status, message: getApiErrorMessage(error), data: response?.data }
  }
  return getApiErrorMessage(error)
}

function randomMobile() {
  return `137${String(Date.now()).slice(-8)}`
}

function randomToken(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function absoluteAssetUrl(url?: string | null) {
  if (!url) return undefined
  if (/^https?:\/\//.test(url)) return url
  return `http://localhost:8000${url}`
}

function statusText(status?: string) {
  const map: Record<string, string> = {
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
  return status ? map[status] ?? status : '-'
}

function statusColor(status?: string) {
  if (['completed', 'published', 'on_sale', 'active', 'unused'].includes(status || '')) return 'green'
  if (['completed', 'published', 'on_sale', 'active', 'unused', 'paid', 'refunded'].includes(status || '')) return 'green'
  if (['pending_payment', 'group_pending', 'pending_shipment', 'shipping', 'pending_receipt', 'after_sale', 'unpaid', 'pending_approval', 'approved', 'received'].includes(status || '')) {
    return 'orange'
  }
  if (['cancelled', 'closed', 'hidden', 'disabled', 'expired', 'rejected'].includes(status || '')) return 'red'
  return 'blue'
}

function ApiHistory({ results }: { results: ApiResult[] }) {
  return (
    <Collapse
      className="debug-collapse"
      items={[
        {
          key: 'debug',
          label: `接口返回排查（最近 ${results.length} 条）`,
          children:
            results.length === 0 ? (
              <Text type="secondary">正常使用时不用查看这里。接口报错时展开最近操作记录即可排查。</Text>
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {results.map((result, index) => (
                  <Card size="small" key={`${result.time}-${index}`} title={`${result.time} ${result.title}`}>
                    <Tag color={result.ok ? 'green' : 'red'}>{result.ok ? '成功' : '失败'}</Tag>
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </Card>
                ))}
              </Space>
            ),
        },
      ]}
    />
  )
}

export function UserTestConsolePage() {
  const [api, contextHolder] = message.useMessage()
  const [apiHistory, setApiHistory] = useState<ApiResult[]>([])
  const [loading, setLoading] = useState(false)

  const [mobile, setMobile] = useState(randomMobile())
  const [password, setPassword] = useState('12345678')
  const [nickname, setNickname] = useState('测试用户')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileNickname, setProfileNickname] = useState('测试用户')
  const [profileGender, setProfileGender] = useState<string | undefined>()
  const [profileBirthday, setProfileBirthday] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null)
  const [memberLevel, setMemberLevel] = useState<MemberLevel | null>(null)
  const [pointsLogs, setPointsLogs] = useState<PointsLog[]>([])

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [keyword, setKeyword] = useState('')
  const [minPriceYuan, setMinPriceYuan] = useState<number | null>(null)
  const [maxPriceYuan, setMaxPriceYuan] = useState<number | null>(null)
  const [productSort, setProductSort] = useState('newest')
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [productPage, setProductPage] = useState(1)
  const [productPageSize, setProductPageSize] = useState(12)
  const [productTotal, setProductTotal] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [productReviews, setProductReviews] = useState<ProductReview[]>([])
  const [reviewFilterScore, setReviewFilterScore] = useState<number | undefined>()
  const [reviewOnlyWithImage, setReviewOnlyWithImage] = useState(false)
  const [selectedSkuId, setSelectedSkuId] = useState<number | undefined>()
  const [quantity, setQuantity] = useState(1)

  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>()
  const [receiverName, setReceiverName] = useState('测试收货人')
  const [receiverMobile, setReceiverMobile] = useState(mobile)
  const [province, setProvince] = useState('广东省')
  const [city, setCity] = useState('广州市')
  const [district, setDistrict] = useState('天河区')
  const [street, setStreet] = useState('猎德街道')
  const [detailAddress, setDetailAddress] = useState('测试路 1 号')
  const [postalCode, setPostalCode] = useState('510000')
  const [addressTag, setAddressTag] = useState('家')
  const [editingAddressId, setEditingAddressId] = useState<number | undefined>()

  const [cart, setCart] = useState<CartItem[]>([])
  const [checkoutPreview, setCheckoutPreview] = useState<CheckoutResult | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>()
  const [orderStatusFilter, setOrderStatusFilter] = useState<string | undefined>()
  const [orderPage, setOrderPage] = useState(1)
  const [orderPageSize, setOrderPageSize] = useState(6)
  const [orderTotal, setOrderTotal] = useState(0)
  const [paymentId, setPaymentId] = useState<number | undefined>()
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [alipayLoading, setAlipayLoading] = useState(false)
  const [lastOrderResult, setLastOrderResult] = useState<{ payment_id?: number; order_ids?: number[]; pay_amount_cent?: number } | null>(null)
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [refundStatusFilter, setRefundStatusFilter] = useState<string | undefined>()
  const [selectedReviewOrderItemId, setSelectedReviewOrderItemId] = useState<number | undefined>()
  const [selectedRefundOrderItemId, setSelectedRefundOrderItemId] = useState<number | undefined>()
  const [selectedRefundDetail, setSelectedRefundDetail] = useState<Refund | null>(null)
  const [refundQuantity, setRefundQuantity] = useState(1)
  const [refundImages, setRefundImages] = useState<string[]>([])
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewImages, setReviewImages] = useState<string[]>([])

  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [selectedFullDiscountId, setSelectedFullDiscountId] = useState<number | undefined>()
  const [selectedUserCouponId, setSelectedUserCouponId] = useState<number | undefined>()
  const [pointsToUse, setPointsToUse] = useState(0)
  const [followedMerchants, setFollowedMerchants] = useState<MerchantFollowItem[]>([])
  const [favoriteProducts, setFavoriteProducts] = useState<ProductFavoriteItem[]>([])
  const [favoriteStatus, setFavoriteStatus] = useState<ProductFavoriteStatus | null>(null)
  const [groupBuyActivities, setGroupBuyActivities] = useState<GroupBuyActivity[]>([])
  const [groupBuyPoints, setGroupBuyPoints] = useState(0)
  const [groupBuyQuantity, setGroupBuyQuantity] = useState(1)

  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [communityProductMap, setCommunityProductMap] = useState<Record<number, ProductListItem>>({})
  const [communitySection, setCommunitySection] = useState<string | undefined>()
  const [communityTopic, setCommunityTopic] = useState<string | undefined>()
  const [communityTopics, setCommunityTopics] = useState<CommunityTopic[]>([])
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<CommunityUserProfile | null>(null)
  const [selectedCommunityUserPosts, setSelectedCommunityUserPosts] = useState<CommunityPost[]>([])
  const [postSection, setPostSection] = useState('experience')
  const [postTitle, setPostTitle] = useState('我的购物体验')
  const [postContent, setPostContent] = useState('这是一条用于社区展示的内容。')
  const [selectedPostProductIds, setSelectedPostProductIds] = useState<number[]>([])
  const [postProductCache, setPostProductCache] = useState<ProductListItem[]>([])
  const [postProductSearchResults, setPostProductSearchResults] = useState<ProductListItem[]>([])
  const [postProductSearchKeyword, setPostProductSearchKeyword] = useState('')
  const [postTopicTags, setPostTopicTags] = useState('体验')
  const [postImages, setPostImages] = useState<string[]>([])
  const [commentContent, setCommentContent] = useState('这是一条评论。')

  const selectedSku = useMemo(() => {
    return selectedProduct?.skus.find((sku) => sku.id === selectedSkuId) ?? selectedProduct?.skus[0]
  }, [selectedProduct, selectedSkuId])

  const selectedProductImages = useMemo(() => {
    if (!selectedProduct) return []
    const urls = [...selectedProduct.images]
    if (selectedProduct.cover_url && !urls.includes(selectedProduct.cover_url)) {
      urls.unshift(selectedProduct.cover_url)
    }
    return urls
  }, [selectedProduct])

  const postProductOptions = useMemo(
    () => {
      const map = new Map<number, ProductListItem>()
      const selectedProducts = postProductCache.filter((product) => selectedPostProductIds.includes(product.id))
      const baseProducts = postProductSearchKeyword ? postProductSearchResults : [...products, ...postProductCache]
      ;[...baseProducts, ...selectedProducts].forEach((product) => map.set(product.id, product))
      if (selectedProduct) {
        map.set(selectedProduct.id, productDetailToListItem(selectedProduct))
      }
      return Array.from(map.values()).map((product) => ({
        value: product.id,
        label: `#${product.id} ${product.name} / ${product.merchant_name} / ￥${yuan(product.price_cent)}`,
      }))
    },
    [products, postProductCache, postProductSearchKeyword, postProductSearchResults, selectedPostProductIds, selectedProduct],
  )

  const selectedOrder = useMemo(() => {
    return orders.find((order) => order.id === selectedOrderId) ?? null
  }, [orders, selectedOrderId])

  const selectedReviewOrderItem = useMemo(() => {
    return selectedOrder?.items.find((item) => item.id === selectedReviewOrderItemId) ?? selectedOrder?.items[0]
  }, [selectedOrder, selectedReviewOrderItemId])

  const selectedRefundOrderItem = useMemo(() => {
    return selectedOrder?.items.find((item) => item.id === selectedRefundOrderItemId) ?? selectedOrder?.items[0]
  }, [selectedOrder, selectedRefundOrderItemId])

  const availableUserCoupons = useMemo(() => {
    return myCoupons.filter(isUserCouponUsable)
  }, [myCoupons])

  const claimedCountByTemplateId = useMemo(() => {
    const counts = new Map<number, number>()
    myCoupons.forEach((coupon) => {
      counts.set(coupon.coupon_template_id, (counts.get(coupon.coupon_template_id) ?? 0) + 1)
    })
    return counts
  }, [myCoupons])

  const categoryTree = useMemo<CategoryTreeItem[]>(() => {
    const childrenByParent = new Map<number | null, Category[]>()
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), category])
    })
    childrenByParent.forEach((items) => items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
    const walk = (parent: Category, depth: number, ancestors: string[]): CategoryTreeItem[] => {
      const labelParts = [...ancestors, parent.name]
      const children = childrenByParent.get(parent.id) ?? []
      return [
        {
          ...parent,
          label: labelParts.join(' / '),
          depth,
          parentName: ancestors[ancestors.length - 1],
        },
        ...children.flatMap((child) => walk(child, depth + 1, labelParts)),
      ]
    }
    return (childrenByParent.get(null) ?? []).flatMap((parent) => walk(parent, 1, []))
  }, [categories])

  const validCheckedCart = useMemo(
    () => cart.filter((item) => item.checked && !item.invalid_reason),
    [cart],
  )

  const cartTotal = validCheckedCart.reduce((total, item) => total + item.price_cent * item.quantity, 0)
  const visibleAlipayQrCode = alipayQrCode || paymentDetail?.alipay_qr_code || ''
  const selectedProductGroupBuys = useMemo(
    () => groupBuyActivities.filter((activity) => activity.product_id === selectedProduct?.id),
    [groupBuyActivities, selectedProduct?.id],
  )

  const communityProductIds = useMemo(() => {
    const ids = new Set<number>()
    posts.forEach((post) => post.product_ids.forEach((id) => ids.add(id)))
    selectedPost?.product_ids.forEach((id) => ids.add(id))
    selectedCommunityUserPosts.forEach((post) => post.product_ids.forEach((id) => ids.add(id)))
    return Array.from(ids)
  }, [posts, selectedPost, selectedCommunityUserPosts])
  const selectedPostSourceEnabled = Boolean(
    selectedPost?.type === 'grass'
    && selectedProduct
    && selectedPost.product_ids.includes(selectedProduct.id),
  )
  const availableGroupBuyPoints = pointsAccount?.points ?? profile?.points ?? 0
  const groupBuyPointCap = Math.max(0, availableGroupBuyPoints)
  const selectedAddressBelongsToUser = Boolean(
    selectedAddressId && addresses.some((address) => address.id === selectedAddressId),
  )
  const groupBuyReadyText = !profile
    ? '请先登录用户账号'
    : !selectedAddressBelongsToUser
      ? '请先选择或新增当前用户的收货地址'
      : '可发起或加入拼团'

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      const data = pickData(response)
      setApiHistory((items) => [{ title, ok: true, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      return data as T
    } catch (error) {
      const data = formatError(error)
      setApiHistory((items) => [{ title, ok: false, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.error(`${title}失败：${getApiErrorMessage(error)}`)
      return null
    }
  }

  async function loadProfile() {
    if (!authService.hasToken()) {
      setProfile(null)
      return
    }
    const data = await run<UserProfile>('读取当前用户', () => authService.profile())
    if (data) {
      setProfile(data)
      setProfileNickname(data.nickname)
      setProfileGender(data.gender ?? undefined)
      setProfileBirthday(data.birthday ?? '')
      setProfileEmail(data.email ?? '')
      setProfileAvatarUrl(data.avatar_url ?? '')
    }
  }

  async function updateProfile() {
    const data = await run<UserProfile>('更新用户资料', () =>
      authService.updateProfile({
        nickname: profileNickname,
        gender: profileGender ?? null,
        birthday: profileBirthday || null,
        email: profileEmail || null,
        avatar_url: profileAvatarUrl || null,
      }),
    )
    if (data) {
      setProfile(data)
      api.success('用户资料已更新')
    }
  }

  async function loadMemberAndPoints() {
    if (!authService.hasToken()) {
      setPointsAccount(null)
      setMemberLevel(null)
      setPointsLogs([])
      return
    }
    const [pointsData, levelData, logsData] = await Promise.all([
      run<PointsAccount>('积分账户', () => authService.pointsAccount()),
      run<MemberLevel>('会员等级', () => authService.memberLevel()),
      run<{ list?: PointsLog[] }>('积分流水', () => authService.pointsLogs()),
    ])
    setPointsAccount(pointsData)
    setMemberLevel(levelData)
    setPointsLogs(logsData?.list ?? [])
  }

  async function signIn() {
    const data = await run('每日签到', () => authService.signIn())
    if (data) {
      api.success('签到完成')
      await loadProfile()
      await loadMemberAndPoints()
    }
  }

  async function uploadAvatar(file: File) {
    const data = await run<{ url: string }>('上传头像', () => uploadService.uploadImage(file))
    if (data?.url) {
      setProfileAvatarUrl(data.url)
      api.success('头像已上传，请保存个人资料')
    }
    return false
  }

  async function login() {
    const data = await run('用户登录', () => authService.login({ account: mobile, password }))
    if (data) {
      setSelectedAddressId(undefined)
      setGroupBuyPoints(0)
      setPaymentId(undefined)
      setPaymentDetail(null)
      setLastOrderResult(null)
      await loadProfile()
      await refreshUserData()
      await loadMemberAndPoints()
      api.success('用户已登录')
    }
  }

  async function register() {
    await run('用户注册', () => authService.register({ mobile, password, nickname }))
    await login()
  }

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => productService.listCategories())
    setCategories(data ?? [])
  }

  async function loadProducts(nextCategoryId = categoryId, nextPage = productPage, nextPageSize = productPageSize) {
    const [sortBy, sortOrder] = productSort.split(':')
    setLoading(true)
    const data = await run<{ list?: ProductListItem[] }>('商品列表', () =>
      productService.listProducts({
        keyword: keyword || undefined,
        category_id: nextCategoryId,
        min_price_cent: minPriceYuan === null ? undefined : Math.round(minPriceYuan * 100),
        max_price_cent: maxPriceYuan === null ? undefined : Math.round(maxPriceYuan * 100),
        sort_by: sortBy,
        sort_order: sortOrder,
        page: nextPage,
        page_size: nextPageSize,
      }),
    )
    setProducts(data?.list ?? [])
    setProductTotal((data as { total?: number } | null)?.total ?? 0)
    setProductPage((data as { page?: number } | null)?.page ?? nextPage)
    setProductPageSize((data as { page_size?: number } | null)?.page_size ?? nextPageSize)
    setLoading(false)
  }

  async function searchPostProducts(keyword = '') {
    const trimmedKeyword = keyword.trim()
    setPostProductSearchKeyword(trimmedKeyword)
    const data = await run<{ list?: ProductListItem[] }>('搜索关联商品', () =>
      productService.listProducts({
        keyword: trimmedKeyword || undefined,
        page: 1,
        page_size: 30,
      }),
    )
    let list = data?.list ?? []
    const numericId = Number(trimmedKeyword.replace(/^#/, ''))
    if (Number.isInteger(numericId) && numericId > 0 && !list.some((product) => product.id === numericId)) {
      const detail = await run<ProductDetail>('按商品 ID 搜索关联商品', () => productService.getProduct(numericId))
      if (detail) list = [productDetailToListItem(detail), ...list]
    }
    setPostProductSearchResults(list)
    setPostProductCache((current) => {
      const map = new Map<number, ProductListItem>()
      ;[...current, ...list].forEach((product) => map.set(product.id, product))
      return Array.from(map.values()).slice(-160)
    })
  }

  async function openProduct(productId: number) {
    const [data, status] = await Promise.all([
      run<ProductDetail>('商品详情', () => productService.getProduct(productId)),
      run<ProductFavoriteStatus>('商品收藏状态', () => productService.getProductFavoriteStatus(productId)),
    ])
    if (data) {
      setSelectedProduct(data)
      setSelectedSkuId(data.skus[0]?.id)
      setSelectedPostProductIds([data.id])
      setPostProductCache((current) => {
        const map = new Map<number, ProductListItem>()
        current.forEach((product) => map.set(product.id, product))
        map.set(data.id, productDetailToListItem(data))
        return Array.from(map.values()).slice(-120)
      })
      setFavoriteStatus(status)
      await loadProductReviews(data.id)
    }
  }

  async function toggleFavoriteProduct(productId: number) {
    if (!profile) {
      api.warning('请先登录用户账号')
      return
    }
    const data = await run<ProductFavoriteStatus>(
      favoriteStatus?.favorited ? '取消收藏商品' : '收藏商品',
      () =>
        favoriteStatus?.favorited
          ? productService.unfavoriteProduct(productId)
          : productService.favoriteProduct(productId),
    )
    if (data) {
      setFavoriteStatus(data)
      await loadFavoriteProducts()
    }
  }

  async function loadProductReviews(productId: number) {
    const data = await run<{ list?: ProductReview[] }>('商品评价', () =>
      productService.listProductReviews(productId, {
        page_size: 20,
        score: reviewFilterScore,
        has_image: reviewOnlyWithImage || undefined,
      }),
    )
    setProductReviews(data?.list ?? [])
  }

  async function loadAddresses() {
    if (!authService.hasToken()) return
    const data = await run<Address[]>('地址列表', () => addressService.listAddresses())
    const list = data ?? []
    setAddresses(list)
    const defaultAddress = list.find((address) => address.is_default) ?? list[0]
    setSelectedAddressId((current) => {
      if (current && list.some((address) => address.id === current)) return current
      return defaultAddress?.id
    })
  }

  async function loadCommunityProducts(productIds: number[]) {
    const missingIds = productIds.filter((id) => !communityProductMap[id])
    if (missingIds.length === 0) return
    const details = await Promise.all(
      missingIds.map((id) =>
        run<ProductDetail>('社区关联商品详情', () => productService.getProduct(id)),
      ),
    )
    const items = details.filter(Boolean).map((detail) => productDetailToListItem(detail as ProductDetail))
    if (items.length === 0) return
    setCommunityProductMap((current) => {
      const next = { ...current }
      items.forEach((item) => {
        next[item.id] = item
      })
      return next
    })
  }

  async function createAddress() {
    const data = await run<Address>('新增地址', () =>
      addressService.createAddress({
        receiver_name: receiverName,
        receiver_mobile: receiverMobile,
        province,
        city,
        district,
        street,
        detail_address: detailAddress,
        postal_code: postalCode,
        address_tag: addressTag,
        is_default: addresses.length === 0,
      }),
    )
    if (data) {
      setSelectedAddressId(data.id)
      setEditingAddressId(undefined)
      await loadAddresses()
    }
  }

  function fillAddressForm(address: Address) {
    setEditingAddressId(address.id)
    setReceiverName(address.receiver_name)
    setReceiverMobile(address.receiver_mobile)
    setProvince(address.province)
    setCity(address.city)
    setDistrict(address.district ?? '')
    setStreet(address.street ?? '')
    setDetailAddress(address.detail_address)
    setPostalCode(address.postal_code ?? '')
    setAddressTag(address.address_tag ?? '')
    setSelectedAddressId(address.id)
  }

  function resetAddressForm() {
    setEditingAddressId(undefined)
    setReceiverName('测试收货人')
    setReceiverMobile(profile?.mobile ?? mobile)
    setProvince('广东省')
    setCity('广州市')
    setDistrict('天河区')
    setStreet('猎德街道')
    setDetailAddress('测试路 1 号')
    setPostalCode('510000')
    setAddressTag('家')
  }

  async function updateAddress() {
    if (!editingAddressId) return
    const data = await run<Address>('修改地址', () =>
      addressService.updateAddress(editingAddressId, {
        receiver_name: receiverName,
        receiver_mobile: receiverMobile,
        province,
        city,
        district,
        street,
        detail_address: detailAddress,
        postal_code: postalCode,
        address_tag: addressTag,
      }),
    )
    if (data) {
      await loadAddresses()
      api.success('地址已修改')
    }
  }

  async function setDefaultAddress(addressId: number) {
    const data = await run<Address>('设为默认地址', () => addressService.updateAddress(addressId, { is_default: true }))
    if (data) await loadAddresses()
  }

  async function deleteAddress(addressId: number) {
    await run('删除地址', () => addressService.deleteAddress(addressId))
    if (selectedAddressId === addressId) setSelectedAddressId(undefined)
    if (editingAddressId === addressId) resetAddressForm()
    await loadAddresses()
  }

  async function loadCart() {
    if (!authService.hasToken()) return
    const data = await run<CartItem[]>('购物车', () => orderService.listCart())
    setCart(data ?? [])
  }

  async function addCart() {
    if (!selectedSku) return
    const data = await run<CartItem[]>('加入购物车', () =>
      orderService.addCartItem({
        sku_id: selectedSku.id,
        quantity,
        source_post_id: selectedPostSourceEnabled ? selectedPost?.id : null,
      }),
    )
    if (data) setCart(data)
  }

  async function loadGroupBuyActivities() {
    const data = await run<GroupBuyActivity[]>('拼团专区', () => groupBuyService.listActivities())
    setGroupBuyActivities(data ?? [])
  }

  async function startGroupBuy(activity: GroupBuyActivity) {
    if (!profile) {
      api.warning('请先登录用户账号')
      return
    }
    if (!selectedAddressBelongsToUser || !selectedAddressId) {
      api.warning('请先选择或新增当前用户的收货地址')
      return
    }
    const safePoints = Math.min(Math.max(0, groupBuyPoints), groupBuyPointCap)
    const data = await run<GroupBuyOrderResult>('发起拼团', () =>
      groupBuyService.startGroup({
        activity_id: activity.id,
        quantity: groupBuyQuantity,
        shipping_address_id: selectedAddressId,
        points_used: safePoints,
        client_order_token: randomToken('group_start'),
      }),
    )
    if (data?.order.payment_id) {
      setPaymentId(data.order.payment_id)
      setLastOrderResult(data.order)
      await loadPaymentDetail(data.order.payment_id)
    }
    await Promise.all([loadGroupBuyActivities(), loadOrders(), loadProfile(), loadMemberAndPoints()])
  }

  async function joinGroupBuy(groupId: number) {
    if (!profile) {
      api.warning('请先登录用户账号')
      return
    }
    if (!selectedAddressBelongsToUser || !selectedAddressId) {
      api.warning('请先选择或新增当前用户的收货地址')
      return
    }
    const safePoints = Math.min(Math.max(0, groupBuyPoints), groupBuyPointCap)
    const data = await run<GroupBuyOrderResult>('加入拼团', () =>
      groupBuyService.joinGroup({
        group_id: groupId,
        quantity: groupBuyQuantity,
        shipping_address_id: selectedAddressId,
        points_used: safePoints,
        client_order_token: randomToken('group_join'),
      }),
    )
    if (data?.order.payment_id) {
      setPaymentId(data.order.payment_id)
      setLastOrderResult(data.order)
      await loadPaymentDetail(data.order.payment_id)
    }
    await Promise.all([loadGroupBuyActivities(), loadOrders(), loadProfile(), loadMemberAndPoints()])
  }

  async function changeCartQuantity(item: CartItem, nextQuantity: number) {
    const data = await run<CartItem[]>('修改购物车数量', () =>
      orderService.updateCartItem(item.sku_id, { quantity: nextQuantity, checked: item.checked }),
    )
    if (data) setCart(data)
  }

  async function removeCartItem(item: CartItem) {
    const data = await run<CartItem[]>('移出购物车', () => orderService.deleteCartItem(item.sku_id))
    if (data) {
      setCart(data)
      setCheckoutPreview(null)
    }
  }

  async function batchSetCartChecked(checked: boolean) {
    const skuIds = cart.filter((item) => !item.invalid_reason).map((item) => item.sku_id)
    if (skuIds.length === 0) return
    const data = await run<CartItem[]>(checked ? '全选购物车' : '取消全选购物车', () =>
      orderService.batchUpdateCartItems({ sku_ids: skuIds, checked }),
    )
    if (data) {
      setCart(data)
      setCheckoutPreview(null)
    }
  }

  async function removeInvalidCartItems() {
    const skuIds = cart.filter((item) => item.invalid_reason).map((item) => item.sku_id)
    if (skuIds.length === 0) {
      api.info('当前没有失效商品')
      return
    }
    const data = await run<CartItem[]>('移除失效商品', () => orderService.batchDeleteCartItems({ sku_ids: skuIds }))
    if (data) {
      setCart(data)
      setCheckoutPreview(null)
    }
  }

  async function clearCart() {
    const data = await run<CartItem[]>('清空购物车', () => orderService.batchDeleteCartItems())
    if (data) {
      setCart(data)
      setCheckoutPreview(null)
    }
  }

  async function loadCoupons() {
    const data = await run<CouponTemplate[]>('可领优惠券', () => promotionService.listCoupons())
    setCoupons(data ?? [])
  }

  async function loadMyCoupons() {
    if (!authService.hasToken()) return
    const data = await run<UserCoupon[]>('我的优惠券', () => promotionService.listMyCoupons())
    const list = data ?? []
    setMyCoupons(list)
    const usable = list.find(isUserCouponUsable)
    if (!selectedUserCouponId && usable) setSelectedUserCouponId(usable.id)
    if (selectedUserCouponId && !list.some((coupon) => coupon.id === selectedUserCouponId && isUserCouponUsable(coupon))) {
      setSelectedUserCouponId(undefined)
    }
  }

  async function claimCoupon(couponId: number) {
    await run('领取优惠券', () => promotionService.claimCoupon(couponId))
    await loadCoupons()
    await loadMyCoupons()
  }

  async function loadFollowedMerchants() {
    if (!authService.hasToken()) return
    const data = await run<{ list?: MerchantFollowItem[] }>('我的关注店铺', () =>
      productService.listFollowedMerchants({ page_size: 20 }),
    )
    setFollowedMerchants(data?.list ?? [])
  }

  async function loadFavoriteProducts() {
    if (!authService.hasToken()) return
    const data = await run<{ list?: ProductFavoriteItem[] }>('我的收藏商品', () =>
      productService.listFavoriteProducts({ page_size: 20 }),
    )
    setFavoriteProducts(data?.list ?? [])
  }

  async function removeFavoriteProduct(productId: number) {
    await run<ProductFavoriteStatus>('取消收藏商品', () => productService.unfavoriteProduct(productId))
    if (favoriteStatus?.product_id === productId) {
      setFavoriteStatus({ product_id: productId, favorited: false, favorite_count: Math.max(0, favoriteStatus.favorite_count - 1) })
    }
    await loadFavoriteProducts()
  }

  async function checkout() {
    const data = await run<CheckoutResult>('结算预览', () =>
      orderService.checkout({
        full_discount_id: selectedFullDiscountId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        points_used: pointsToUse,
      }),
    )
    if (data) {
      setCheckoutPreview(data)
      setSelectedFullDiscountId(data.selected_full_discount_id ?? undefined)
      setSelectedUserCouponId(data.selected_coupon_id ?? undefined)
    }
  }

  async function createOrder() {
    if (!profile) {
      api.warning('请先登录用户账号')
      return
    }
    if (!selectedAddressId) {
      api.warning('请先新增或选择收货地址')
      return
    }
    if (validCheckedCart.length === 0) {
      api.warning('购物车没有可结算商品，请先加入购物车或移除失效商品')
      return
    }
    const data = await run<{ payment_id?: number; order_ids?: number[]; pay_amount_cent?: number }>('提交订单', () =>
      orderService.createOrder({
        client_order_token: randomToken('order'),
        shipping_address_id: selectedAddressId ?? null,
        full_discount_id: selectedFullDiscountId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        points_used: pointsToUse,
        source_post_id: selectedPost?.type === 'grass' ? selectedPost.id : null,
      }),
    )
    if (data?.payment_id) setPaymentId(data.payment_id)
    if (data?.order_ids?.[0]) setSelectedOrderId(data.order_ids[0])
    if (data) setLastOrderResult(data)
    setSelectedUserCouponId(undefined)
    setPointsToUse(0)
    await loadOrders()
    if (data?.payment_id) await loadPaymentDetail(data.payment_id)
    await loadCart()
    await loadMyCoupons()
  }

  async function createAlipayQrCode(force = false) {
    if (!paymentId) return
    if (alipayLoading) return
    setAlipayLoading(true)
    try {
      const data = await run('支付宝扫码支付', () => orderService.precreateAlipay(paymentId, force))
      if (data) {
        const alipayData = data as AlipayPrecreateResult
        setAlipayQrCode(alipayData.qr_code)
        setPaymentDetail(alipayData.payment)
      }
    } finally {
      setAlipayLoading(false)
    }
  }

  async function syncAlipayPayment() {
    if (!paymentId) return
    const data = await run<Payment>('同步支付宝支付结果', () => orderService.syncAlipay(paymentId))
    if (data) {
      setPaymentDetail(data)
      setAlipayQrCode(data.alipay_qr_code || '')
      if (data.status !== 'paid') {
        api.info('支付宝尚未查到已支付交易，请确认使用沙箱买家账号扫码付款后再同步')
      }
    }
    await loadOrders()
    await loadGroupBuyActivities()
  }

  async function loadPaymentDetail(nextPaymentId = paymentId) {
    if (!nextPaymentId) return
    const data = await run<Payment>('支付单详情', () => orderService.getPayment(nextPaymentId))
    if (data) {
      setPaymentDetail(data)
      setAlipayQrCode(data.alipay_qr_code || '')
    }
  }

  async function selectOrderForPayment(order: Order) {
    setSelectedOrderId(order.id)
    setPaymentId(order.payment_id)
    setSelectedReviewOrderItemId(order.items[0]?.id)
    setSelectedRefundOrderItemId(order.items[0]?.id)
    setRefundQuantity(1)
    setAlipayQrCode('')
    await loadPaymentDetail(order.payment_id)
  }

  async function loadOrders(nextPage = orderPage, nextPageSize = orderPageSize) {
    if (!authService.hasToken()) return
    const data = await run<{ list?: Order[]; page?: number; page_size?: number; total?: number }>('我的订单', () =>
      orderService.listOrders({ status: orderStatusFilter, page: nextPage, page_size: nextPageSize }),
    )
    const list = data?.list ?? []
    setOrderPage(data?.page ?? nextPage)
    setOrderPageSize(data?.page_size ?? nextPageSize)
    setOrderTotal(data?.total ?? list.length)
    setOrders(list)
    const currentOrder = selectedOrderId ? list.find((order) => order.id === selectedOrderId) : undefined
    if (!currentOrder && list[0]) {
      const firstOrder = list[0]
      setSelectedOrderId(firstOrder.id)
      setPaymentId(firstOrder.payment_id)
      setSelectedReviewOrderItemId(firstOrder.items[0]?.id)
      setSelectedRefundOrderItemId(firstOrder.items[0]?.id)
      await loadPaymentDetail(firstOrder.payment_id)
    }
  }

  async function confirmOrder(orderId: number) {
    await run('确认收货', () => orderService.confirmOrder(orderId))
    await loadOrders()
  }

  async function cancelOrder(orderId: number) {
    await run('取消订单', () => orderService.cancelOrder(orderId))
    await loadOrders()
    if (paymentId) await loadPaymentDetail(paymentId)
  }

  async function reviewSelectedOrder() {
    if (!selectedOrder || !selectedReviewOrderItem) return
    if (!reviewContent.trim()) {
      api.warning('请先填写评价内容')
      return
    }
    await run('发表评价', () =>
      orderService.reviewOrder(selectedOrder.id, {
        product_id: selectedReviewOrderItem.product_id,
        score: reviewScore,
        content: reviewContent.trim(),
        image_urls: reviewImages,
      }),
    )
    setReviewContent('')
    setReviewImages([])
    if (selectedProduct?.id === selectedReviewOrderItem.product_id) {
      await openProduct(selectedProduct.id)
    }
  }

  async function refundSelectedOrder() {
    if (!selectedOrder || !selectedRefundOrderItem) return
    const data = await run<Refund>('申请售后', () =>
      orderService.applyRefund(selectedOrder.id, {
        order_item_id: selectedRefundOrderItem.id,
        quantity: refundQuantity,
        reason_type: 'other',
        reason: '测试售后申请',
        image_urls: refundImages,
      }),
    )
    if (data) {
      setRefundImages([])
      await loadOrders()
      await loadRefunds()
    }
  }

  async function loadRefunds() {
    if (!authService.hasToken()) return
    const data = await run<{ list?: Refund[] }>('我的售后', () => orderService.listRefunds({ status: refundStatusFilter }))
    setRefunds(data?.list ?? [])
  }

  async function openRefundDetail(refundId: number) {
    const data = await run<Refund>('售后详情', () => orderService.getRefund(refundId))
    if (data) setSelectedRefundDetail(data)
  }

  async function loadPosts() {
    const data = await run<{ list?: CommunityPost[] }>('社区帖子', () =>
      communityService.listPosts({ section: communitySection, topic: communityTopic }),
    )
    setPosts(data?.list ?? [])
  }

  async function loadCommunityTopics() {
    const data = await run<CommunityTopic[]>('热门话题', () => communityService.listTopics({ limit: 12 }))
    setCommunityTopics(data ?? [])
  }

  async function filterByTopic(topic: string) {
    setCommunityTopic(topic)
    setCommunitySection(undefined)
  }

  function clearCommunityTopic() {
    setCommunityTopic(undefined)
  }

  async function openCommunityUser(userId: number) {
    const [profileData, postsData] = await Promise.all([
      run<CommunityUserProfile>('社区个人主页', () => communityService.getUserProfile(userId)),
      run<{ list?: CommunityPost[] }>('作者帖子', () => communityService.listUserPosts(userId, { page_size: 12 })),
    ])
    if (profileData) setSelectedCommunityUser(profileData)
    setSelectedCommunityUserPosts(postsData?.list ?? [])
  }

  async function openPost(post: CommunityPost) {
    setSelectedPost(post)
    const data = await run<{ list?: CommunityComment[] }>('帖子评论', () => communityService.listComments(post.id))
    setComments(data?.list ?? [])
  }

  async function createPost(type: 'normal' | 'grass') {
    await run(type === 'grass' ? '发布种草帖' : '发布普通帖', () =>
      communityService.createPost({
        type,
        section: type === 'grass' ? 'grass' : postSection,
        title: postTitle,
        content: postContent,
        product_ids: selectedPostProductIds,
        topic_tags: splitTags(postTopicTags),
        image_urls: postImages,
      }),
    )
    setPostImages([])
    await loadPosts()
    await loadCommunityTopics()
  }

  async function commentPost(postId: number) {
    await run('发表评论', () => communityService.createComment(postId, commentContent))
    await openPost(selectedPost as CommunityPost)
  }

  async function uploadPostImage(file: File) {
    const data = await run<{ url: string }>('上传帖子图片', () => uploadService.uploadImage(file))
    if (data?.url) setPostImages((items) => [...items, data.url])
    return false
  }

  async function uploadReviewImage(file: File) {
    const data = await run<{ url: string }>('上传评价图片', () => uploadService.uploadImage(file))
    if (data?.url) setReviewImages((items) => [...items, data.url])
    return false
  }

  async function uploadRefundImage(file: File) {
    const data = await run<{ url: string }>('上传售后凭证', () => uploadService.uploadImage(file))
    if (data?.url) setRefundImages((items) => [...items, data.url])
    return false
  }

  async function refreshUserData() {
    setSelectedAddressId(undefined)
    setEditingAddressId(undefined)
    setSelectedOrderId(undefined)
    setPaymentId(undefined)
    setPaymentDetail(null)
    setLastOrderResult(null)
    setSelectedUserCouponId(undefined)
    setCheckoutPreview(null)
    setRefundImages([])
    setGroupBuyPoints(0)
    await Promise.all([loadCart(), loadOrders(), loadRefunds(), loadAddresses(), loadMyCoupons(), loadFollowedMerchants(), loadFavoriteProducts()])
  }

  async function logout() {
    await run('用户登出', () => authService.logout())
    setProfile(null)
    setProfileNickname(nickname)
    setProfileGender(undefined)
    setProfileBirthday('')
    setProfileEmail('')
    setProfileAvatarUrl('')
    setCart([])
    setOrders([])
    setAddresses([])
    setMyCoupons([])
    setFollowedMerchants([])
    setFavoriteProducts([])
    setFavoriteStatus(null)
    setSelectedAddressId(undefined)
    setSelectedOrderId(undefined)
    setPaymentId(undefined)
    setPaymentDetail(null)
    setLastOrderResult(null)
    setSelectedUserCouponId(undefined)
    setCheckoutPreview(null)
    setRefunds([])
    setRefundImages([])
    setPointsAccount(null)
    setMemberLevel(null)
    setPointsLogs([])
    setGroupBuyPoints(0)
    api.success('用户已退出登录')
  }

  function renderCommunityProductCards(productIds: number[], compact = false) {
    if (productIds.length === 0) {
      return <Text type="secondary">暂无关联商品</Text>
    }
    return (
      <div className={compact ? 'community-product-cards compact' : 'community-product-cards'}>
        {productIds.map((productId) => {
          const product = communityProductMap[productId]
          return (
            <Card
              key={productId}
              size="small"
              hoverable={Boolean(product)}
              className="community-product-card"
              onClick={(event) => {
                event.stopPropagation()
                if (product) void openProduct(product.id)
              }}
            >
              {product ? (
                <Space size={10} align="center">
                  {product.cover_url ? (
                    <Image
                      width={compact ? 46 : 64}
                      height={compact ? 46 : 64}
                      preview={false}
                      src={absoluteAssetUrl(product.cover_url)}
                    />
                  ) : (
                    <div className="community-product-thumb">图</div>
                  )}
                  <Space direction="vertical" size={2}>
                    <Text strong ellipsis style={{ maxWidth: compact ? 135 : 260 }}>
                      {product.name}
                    </Text>
                    <Text type="secondary">商品 #{product.id} / {product.merchant_name}</Text>
                    <Text className="community-product-price">￥{yuan(product.price_cent)}</Text>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={2}>
                  <Text strong>商品 #{productId}</Text>
                  <Text type="secondary">正在加载商品信息</Text>
                </Space>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    void loadProducts(categoryId)
  }, [categoryId, minPriceYuan, maxPriceYuan, productSort])

  useEffect(() => {
    if (selectedProduct) {
      void loadProductReviews(selectedProduct.id)
    }
  }, [reviewFilterScore, reviewOnlyWithImage])

  useEffect(() => {
    void loadPosts()
  }, [communitySection, communityTopic])

  useEffect(() => {
    if (communityProductIds.length) void loadCommunityProducts(communityProductIds)
  }, [communityProductIds])

  useEffect(() => {
    void loadCategories()
    void loadCoupons()
    void loadGroupBuyActivities()
    void loadPosts()
    void loadCommunityTopics()
    void loadProfile()
    void loadMemberAndPoints()
    void loadCart()
    void loadOrders()
    void loadRefunds()
    void loadAddresses()
    void loadMyCoupons()
    void loadFollowedMerchants()
    void loadFavoriteProducts()
  }, [])

  useEffect(() => {
    void loadOrders(1, orderPageSize)
  }, [orderStatusFilter])

  useEffect(() => {
    void loadRefunds()
  }, [refundStatusFilter])

  useEffect(() => {
    void loadPosts()
  }, [communitySection])

  const uploadFiles: UploadFile[] = postImages.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `image-${index}`,
    status: 'done',
    url: absoluteAssetUrl(url),
  }))

  return (
    <main className="shop-page">
      {contextHolder}
      <section className="shop-hero">
        <div>
          <Text className="eyebrow">社交新零售电商平台</Text>
          <Title level={1}>一次买够 It's Mygo</Title>
          <Paragraph>浏览商品、领取优惠券、加入购物车、支付宝沙箱支付、确认收货，并在社区分享种草内容。</Paragraph>
          <Space size={16} wrap>
            <Statistic title="商品" value={products.length} />
            <Statistic title="购物车件数" value={cart.reduce((total, item) => total + item.quantity, 0)} />
            <Statistic title="订单" value={orderTotal} />
          </Space>
        </div>
      </section>

      <nav className="workbench-jump-nav" aria-label="用户端联调分区导航">
        <a href="#user-account">账号资料</a>
        <a href="#user-member">会员积分</a>
        <a href="#user-products">商品商城</a>
        <a href="#user-group-buy">拼团专区</a>
        <a href="#user-cart">购物结算</a>
        <a href="#user-community">社区种草</a>
        <a href="#user-orders">订单售后</a>
      </nav>

      <Row gutter={[24, 24]}>
        <Col span={24} id="user-account">
          <Card className="account-card" title={profile ? '账号与个人资料' : '用户登录 / 注册'}>
            <Row gutter={[16, 16]} align="middle">
              <Col span={profile ? 10 : 8}>
                {profile ? (
                  <Space align="center">
                    <Image
                      width={64}
                      height={64}
                      preview={false}
                      className="avatar-preview"
                      src={absoluteAssetUrl(profile.avatar_url) || undefined}
                      fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='16' fill='%23eef2ff'/%3E%3Ctext x='32' y='38' text-anchor='middle' font-size='18' fill='%236366f1'%3EUser%3C/text%3E%3C/svg%3E"
                    />
                    <Descriptions size="small" column={1}>
                      <Descriptions.Item label="用户">{profile.nickname} / #{profile.id}</Descriptions.Item>
                      <Descriptions.Item label="手机">{profile.mobile}</Descriptions.Item>
                      <Descriptions.Item label="积分">{profile.points}</Descriptions.Item>
                    </Descriptions>
                  </Space>
                ) : (
                  <Text type="secondary">登录后可查看订单、地址、优惠券和积分。</Text>
                )}
              </Col>
              <Col span={profile ? 14 : 16}>
                <Space wrap>
                  <Input style={{ width: 180 }} value={mobile} onChange={(event) => setMobile(event.target.value)} placeholder="手机号" />
                  <Input.Password style={{ width: 180 }} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" />
                  <Input style={{ width: 180 }} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="注册昵称" />
                  <Button type="primary" onClick={login}>登录</Button>
                  <Button onClick={register}>注册并登录</Button>
                  <Button onClick={loadProfile}>刷新用户</Button>
                  <Button danger disabled={!profile} onClick={logout}>退出登录</Button>
                </Space>
              </Col>
              {profile ? (
                <Col span={24}>
                  <Collapse
                    size="small"
                    items={[{
                      key: 'profile',
                      label: '编辑个人资料与头像',
                      children: (
                        <Row gutter={[12, 12]}>
                          <Col span={6}><Input value={profileNickname} onChange={(event) => setProfileNickname(event.target.value)} placeholder="资料昵称" /></Col>
                          <Col span={6}>
                            <Select
                              allowClear
                              placeholder="性别"
                              style={{ width: '100%' }}
                              value={profileGender}
                              onChange={setProfileGender}
                              options={[
                                { value: 'female', label: '女' },
                                { value: 'male', label: '男' },
                                { value: 'other', label: '其他' },
                              ]}
                            />
                          </Col>
                          <Col span={6}><Input value={profileBirthday} onChange={(event) => setProfileBirthday(event.target.value)} placeholder="生日：YYYY-MM-DD" /></Col>
                          <Col span={6}><Input value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} placeholder="邮箱" /></Col>
                          <Col span={12}><Input value={profileAvatarUrl} onChange={(event) => setProfileAvatarUrl(event.target.value)} placeholder="头像 URL" /></Col>
                          <Col span={12}>
                            <Space>
                              <Upload showUploadList={false} beforeUpload={(file) => uploadAvatar(file)}>
                                <Button>上传头像</Button>
                              </Upload>
                              <Button type="primary" onClick={updateProfile}>保存个人资料</Button>
                            </Space>
                          </Col>
                        </Row>
                      ),
                    }]}
                  />
                </Col>
              ) : null}
            </Row>
          </Card>
        </Col>

        {profile ? (
          <Col span={24} id="user-member">
            <Card className="section-card" title="会员与积分">
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={8}>
                  <Card size="small" className="member-card">
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="purple">{memberLevel?.level_name || profile.level}</Tag>
                        <Text type="secondary">成长值 ￥{yuan(memberLevel?.growth_value_cent ?? 0)}</Text>
                      </Space>
                      {memberLevel?.next_level_name ? (
                        <Text>
                          距离 {memberLevel.next_level_name} 还需消费 ￥{yuan(memberLevel.next_level_need_cent ?? 0)}
                        </Text>
                      ) : (
                        <Text>已达到当前最高会员等级</Text>
                      )}
                      <Space wrap>
                        {(memberLevel?.benefits ?? []).map((benefit) => (
                          <Tag key={benefit}>{benefit}</Tag>
                        ))}
                      </Space>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card size="small" className="member-card">
                    <Space direction="vertical" size={10}>
                      <Statistic title="当前积分" value={pointsAccount?.points ?? profile.points} />
                      <Text type="secondary">
                        连续签到 {pointsAccount?.current_streak_days ?? 0} 天，今日可得 {pointsAccount?.today_reward_points ?? 0} 分
                      </Text>
                      <Space wrap>
                        <Button type="primary" disabled={pointsAccount?.sign_in_today} onClick={signIn}>
                          {pointsAccount?.sign_in_today ? '今日已签到' : '每日签到'}
                        </Button>
                        <Button onClick={loadMemberAndPoints}>刷新积分</Button>
                      </Space>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} lg={8}>
                  <Card size="small" className="member-card" title="最近积分流水">
                    {pointsLogs.length ? (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {pointsLogs.slice(0, 5).map((log) => (
                          <Space key={log.id} direction="vertical" size={2}>
                            <Space wrap>
                              <Tag color={log.change_points > 0 ? 'green' : 'red'}>
                                {log.change_points > 0 ? '+' : ''}{log.change_points}
                              </Tag>
                              <Text type="secondary">{log.source_type}</Text>
                            </Space>
                            <Text>{log.description || '积分变动'}</Text>
                            <Text type="secondary">余额 {log.balance_points} / {log.created_at}</Text>
                          </Space>
                        ))}
                      </Space>
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无积分流水" />
                    )}
                  </Card>
                </Col>
              </Row>
            </Card>
          </Col>
        ) : null}

        {profile ? (
          <Col span={24}>
            <Card
              className="section-card"
              title="我关注的店铺"
              extra={<Button onClick={loadFollowedMerchants}>刷新关注</Button>}
            >
              {followedMerchants.length === 0 ? (
                <Empty description="还没有关注店铺，可进入店铺主页点击关注" />
              ) : (
                <Row gutter={[16, 16]}>
                  {followedMerchants.map((item) => (
                    <Col span={6} key={item.merchant.id}>
                      <Card size="small" className="followed-merchant-card">
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <Space align="center">
                            <Avatar
                              shape="square"
                              size={48}
                              src={absoluteAssetUrl(item.merchant.logo_url)}
                            >
                              店
                            </Avatar>
                            <Space direction="vertical" size={0}>
                              <Text strong>{item.merchant.name}</Text>
                              <Text type="secondary">店铺 #{item.merchant.id}</Text>
                            </Space>
                          </Space>
                          <Paragraph ellipsis={{ rows: 2 }}>
                            {item.merchant.announcement || '暂无店铺公告'}
                          </Paragraph>
                          <Space split={<Divider type="vertical" />}>
                            <Text type="secondary">关注 {item.follower_count}</Text>
                            <Link to={`/merchants/${item.merchant.id}`}>进入店铺</Link>
                          </Space>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>
        ) : null}

        {profile ? (
          <Col span={24}>
            <Card
              className="section-card"
              title="我收藏的商品"
              extra={<Button onClick={loadFavoriteProducts}>刷新收藏</Button>}
            >
              {favoriteProducts.length === 0 ? (
                <Empty description="还没有收藏商品，可进入商品详情点击收藏" />
              ) : (
                <Row gutter={[16, 16]}>
                  {favoriteProducts.map((item) => (
                    <Col span={6} key={item.product.id}>
                      <Card
                        size="small"
                        className="product-card"
                        cover={
                          item.product.cover_url ? (
                            <Image preview={false} src={absoluteAssetUrl(item.product.cover_url)} />
                          ) : (
                            <div className="product-cover">商品图</div>
                          )
                        }
                        actions={[
                          <Button type="link" onClick={() => openProduct(item.product.id)}>详情</Button>,
                          <Button danger type="link" onClick={() => removeFavoriteProduct(item.product.id)}>取消收藏</Button>,
                        ]}
                      >
                        <Space direction="vertical" size={6}>
                          <Space wrap>
                            <Tag color="blue">商品 #{item.product.id}</Tag>
                            <Link to={`/merchants/${item.product.merchant_id}`}>
                              <Tag color="purple">店铺 #{item.product.merchant_id}</Tag>
                            </Link>
                          </Space>
                          <Text strong>{item.product.name}</Text>
                          <Link to={`/merchants/${item.product.merchant_id}`}>{item.product.merchant_name}</Link>
                          <Space size={8} align="baseline">
                            <Text className="price">￥{yuan(item.product.price_cent)}</Text>
                            {item.product.market_price_cent ? (
                              <Text delete type="secondary">￥{yuan(item.product.market_price_cent)}</Text>
                            ) : null}
                          </Space>
                          <Text type="secondary">收藏 {item.favorite_count}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>
        ) : null}

        <Col span={24}>
          <Card
            className="category-card"
            title="分类导航"
            extra={<Text type="secondary">选择父级分类会展示其全部子分类商品</Text>}
          >
            <Space size={[12, 12]} wrap className="category-tree">
              <Button
                className="category-chip all"
                type={categoryId === undefined ? 'primary' : 'default'}
                onClick={() => {
                    setCategoryId(undefined)
                    void loadProducts(undefined, 1)
                  }}
              >
                全部
              </Button>
              {categoryTree.map((category) => (
                <Button
                  key={category.id}
                  className={`category-chip level-${category.depth}`}
                  type={categoryId === category.id ? 'primary' : 'default'}
                  onClick={() => {
                    setCategoryId(category.id)
                    void loadProducts(category.id, 1)
                  }}
                >
                  <span className="category-main">#{category.id} {category.name}</span>
                  <span className="category-meta">
                    {category.parentName ? `父级 ${category.parentName} · ` : '一级分类 · '}
                    排序 {category.sort_order}
                  </span>
                </Button>
              ))}
            </Space>
          </Card>
        </Col>

        <Col span={16} id="user-products">
          <Card
            title="商品商城"
            extra={
              <Space wrap>
                <Input.Search
                  allowClear
                  placeholder="搜索商品"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  onSearch={() => loadProducts(categoryId, 1)}
                />
                <InputNumber
                  min={0}
                  precision={2}
                  placeholder="最低价"
                  value={minPriceYuan}
                  onChange={setMinPriceYuan}
                  addonAfter="元"
                />
                <InputNumber
                  min={0}
                  precision={2}
                  placeholder="最高价"
                  value={maxPriceYuan}
                  onChange={setMaxPriceYuan}
                  addonAfter="元"
                />
                <Select
                  style={{ width: 132 }}
                  value={productSort}
                  onChange={setProductSort}
                  options={[
                    { value: 'newest:desc', label: '最新上架' },
                    { value: 'price:asc', label: '价格升序' },
                    { value: 'price:desc', label: '价格降序' },
                    { value: 'sales:desc', label: '销量优先' },
                  ]}
                />
                <Button onClick={() => loadProducts(categoryId, 1)}>刷新</Button>
              </Space>
            }
          >
            <Skeleton loading={loading} active>
              {products.length === 0 ? (
                <Empty description="暂无商品，请先在商家端上传商品" />
              ) : (
                <Row gutter={[16, 16]}>
                  {products.map((product) => (
                    <Col span={8} key={product.id}>
                      <Card
                        hoverable
                        className="product-card"
                        cover={
                          product.cover_url ? (
                            <Image preview={false} src={absoluteAssetUrl(product.cover_url)} />
                          ) : (
                            <div className="product-cover">商品图</div>
                          )
                        }
                        actions={[<Button type="link" onClick={() => openProduct(product.id)}>查看详情</Button>]}
                      >
                        <Space direction="vertical" size={6}>
                          <Space wrap>
                            <Tag color="blue">商品 #{product.id}</Tag>
                            <Link to={`/merchants/${product.merchant_id}`}>
                              <Tag color="purple">店铺 #{product.merchant_id}</Tag>
                            </Link>
                          </Space>
                          <Text strong>{product.name}</Text>
                          <Link to={`/merchants/${product.merchant_id}`}>{product.merchant_name}</Link>
                          <Space size={8} align="baseline">
                            <Text className="price">￥{yuan(product.price_cent)}</Text>
                            {product.market_price_cent ? (
                              <Text delete type="secondary">￥{yuan(product.market_price_cent)}</Text>
                            ) : null}
                          </Space>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
              <div className="pager-row">
                <Pagination
                  current={productPage}
                  pageSize={productPageSize}
                  total={productTotal}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 件商品`}
                  onChange={(page, pageSize) => loadProducts(categoryId, page, pageSize)}
                />
              </div>
            </Skeleton>
          </Card>

          <Card
            title="拼团专区"
            id="user-group-buy"
            className="section-card"
            extra={
              <Space wrap>
                <InputNumber
                  min={1}
                  precision={0}
                  value={groupBuyQuantity}
                  addonBefore="购买件数"
                  onChange={(value) => setGroupBuyQuantity(Math.max(1, Number(value) || 1))}
                />
                <Button onClick={loadGroupBuyActivities}>刷新拼团</Button>
              </Space>
            }
          >
            <Alert
              className="group-buy-alert"
              type={profile && selectedAddressBelongsToUser ? 'success' : 'warning'}
              showIcon
              message={groupBuyReadyText}
              description="拼团不加入购物车，不叠加满减或优惠券，不参与社区种草奖励；可使用积分抵扣，开团或参团后请在下方支付面板扫码支付。"
            />
            <Card size="small" className="group-buy-control">
              <Row gutter={[16, 12]} align="middle">
                <Col span={6}>
                  <Text type="secondary">当前用户积分</Text>
                  <Title level={4}>{availableGroupBuyPoints}</Title>
                </Col>
                <Col span={6}>
                  <Text type="secondary">本次使用积分</Text>
                  <InputNumber
                    min={0}
                    max={groupBuyPointCap}
                    precision={0}
                    value={groupBuyPoints}
                    style={{ width: '100%' }}
                    onChange={(value) => setGroupBuyPoints(Math.min(groupBuyPointCap, Math.max(0, Number(value) || 0)))}
                  />
                </Col>
                <Col span={6}>
                  <Text type="secondary">购买件数</Text>
                  <InputNumber
                    min={1}
                    precision={0}
                    value={groupBuyQuantity}
                    style={{ width: '100%' }}
                    onChange={(value) => setGroupBuyQuantity(Math.max(1, Number(value) || 1))}
                  />
                </Col>
                <Col span={6}>
                  <Text type="secondary">收货地址</Text>
                  <Select
                    value={selectedAddressId}
                    placeholder="选择地址"
                    style={{ width: '100%' }}
                    onChange={setSelectedAddressId}
                    options={addresses.map((address) => ({
                      value: address.id,
                      label: `#${address.id} ${address.receiver_name} ${address.city}${address.district ?? ''}`,
                    }))}
                  />
                </Col>
              </Row>
            </Card>
            {groupBuyActivities.length === 0 ? (
              <Empty description="暂无可用拼团活动，请商家先在商家端创建" />
            ) : (
              <Row gutter={[16, 16]}>
                {groupBuyActivities.map((activity) => (
                  <Col span={12} key={activity.id}>
                    <Card size="small" className="group-buy-card">
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="purple">拼团 #{activity.id}</Tag>
                          <Tag>{activity.group_size} 人团</Tag>
                          <Tag color={statusColor(activity.status)}>{statusText(activity.status)}</Tag>
                        </Space>
                        <Text strong>{activity.name}</Text>
                        <Space align="baseline">
                          <Text className="price">￥{yuan(activity.group_price_cent)}</Text>
                          <Text type="secondary">
                            商品 #{activity.product_id} / SKU #{activity.sku_id}
                          </Text>
                        </Space>
                        <div className="group-buy-price-line">
                          <Tag color="purple">{groupBuyQuantity} 件</Tag>
                          <Text>商品金额 ￥{yuan(activity.group_price_cent * groupBuyQuantity)}</Text>
                          {groupBuyPoints > 0 ? <Text type="secondary">积分抵扣以平台上限和后端核算为准</Text> : null}
                        </div>
                        {activity.product ? (
                          <Space align="start">
                            {activity.product.cover_url ? (
                              <Image width={72} height={72} preview={false} src={absoluteAssetUrl(activity.product.cover_url)} />
                            ) : null}
                            <Space direction="vertical" size={2}>
                              <Text>{activity.product.name}</Text>
                              <Button size="small" onClick={() => openProduct(activity.product_id)}>查看商品</Button>
                            </Space>
                          </Space>
                        ) : null}
                        <Button type="primary" onClick={() => startGroupBuy(activity)}>
                          发起拼团并支付
                        </Button>
                        <List
                          size="small"
                          dataSource={activity.active_groups}
                          locale={{ emptyText: '暂无正在拼的团' }}
                          renderItem={(group) => (
                            <List.Item
                              actions={[
                                <Button
                                  size="small"
                                  disabled={group.joined_count >= group.group_size}
                                  onClick={() => joinGroupBuy(group.id)}
                                >
                                  加入此团
                                </Button>,
                              ]}
                            >
                              <Space direction="vertical" size={2}>
                                <Space wrap>
                                  <Tag color="blue">团 #{group.id}</Tag>
                                  <Text>{group.joined_count}/{group.group_size} 人已支付</Text>
                                </Space>
                                <Text type="secondary">24h 截止：{new Date(group.expire_at).toLocaleString()}</Text>
                              </Space>
                            </List.Item>
                          )}
                        />
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>

        </Col>

        <Col span={8} id="user-cart">
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Card title="购物车">
              <Space wrap style={{ marginBottom: 12 }}>
                <Button size="small" onClick={() => batchSetCartChecked(true)}>全选有效商品</Button>
                <Button size="small" onClick={() => batchSetCartChecked(false)}>取消全选</Button>
                <Button size="small" onClick={removeInvalidCartItems}>移除失效商品</Button>
                <Button size="small" danger disabled={cart.length === 0} onClick={clearCart}>清空购物车</Button>
              </Space>
              <List
                dataSource={cart}
                locale={{ emptyText: '购物车为空' }}
                renderItem={(item) => (
                    <List.Item
                    className={item.invalid_reason ? 'cart-item-invalid' : undefined}
                    actions={[
                      <InputNumber
                        min={1}
                        value={item.quantity}
                        disabled={Boolean(item.invalid_reason)}
                        onChange={(value) => changeCartQuantity(item, Number(value) || 1)}
                      />,
                      <Button danger type="link" onClick={() => removeCartItem(item)}>移除</Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.product_name}
                      description={(
                        <Space direction="vertical" size={2}>
                          <Text type="secondary">{item.sku_name} / SKU #{item.sku_id}</Text>
                          {item.source_post_id ? <Tag color="purple">种草来源 #{item.source_post_id}</Tag> : null}
                          {item.invalid_reason ? <Tag color="red">{item.invalid_reason}</Tag> : null}
                        </Space>
                      )}
                    />
                    <Text>￥{yuan(item.price_cent * item.quantity)}</Text>
                  </List.Item>
                )}
              />
              <Divider />
              <Card size="small" className="checkout-panel" title="优惠与支付预览">
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Text strong>有效已选合计：￥{yuan(cartTotal)}</Text>
                  {cart.some((item) => item.invalid_reason) ? (
                    <Text type="secondary">失效商品不会参与结算，可调整商品后刷新购物车或直接移除。</Text>
                  ) : null}
                  <Select
                    allowClear
                    placeholder="选择本单满减活动"
                    style={{ width: '100%' }}
                    value={selectedFullDiscountId}
                    onChange={(value) => {
                      setSelectedFullDiscountId(value)
                      setCheckoutPreview(null)
                    }}
                    options={[
                      { value: undefined, label: '不使用满减' },
                      ...(checkoutPreview?.available_full_discounts ?? []).map((activity) => ({
                        value: activity.id,
                        disabled: !activity.available,
                        label: `#${activity.id} ${activity.name}｜适用 ￥${yuan(activity.applicable_amount_cent)}｜减 ￥${yuan(activity.discount_amount_cent)}${activity.available ? '' : `｜${activity.unavailable_reason ?? '不可用'}`}`,
                      })),
                    ]}
                  />
                  <Select
                    allowClear
                    placeholder="选择本单优惠券"
                    style={{ width: '100%' }}
                    value={selectedUserCouponId}
                    onChange={(value) => {
                      setSelectedUserCouponId(value)
                      setCheckoutPreview(null)
                    }}
                    options={[
                      { value: undefined, label: '不使用优惠券' },
                      ...(checkoutPreview?.available_coupons?.length
                        ? checkoutPreview.available_coupons.map((coupon) => ({
                            value: coupon.id,
                            disabled: !coupon.available,
                            label: `#${coupon.id} ${coupon.name}｜适用 ￥${yuan(coupon.applicable_amount_cent)}｜减 ￥${yuan(coupon.discount_amount_cent)}${coupon.available ? '' : `｜${coupon.unavailable_reason ?? '不可用'}`}`,
                          }))
                        : availableUserCoupons.map((coupon) => ({
                            value: coupon.id,
                            label: `#${coupon.id} ${coupon.template.name}（${statusText(coupon.status)}）`,
                          }))),
                    ]}
                  />
                  <InputNumber
                    min={0}
                    precision={0}
                    value={pointsToUse}
                    style={{ width: '100%' }}
                    addonBefore="使用积分"
                    addonAfter={`最多 ${checkoutPreview?.max_points_usable ?? pointsAccount?.points ?? profile?.points ?? 0}`}
                    onChange={(value) => {
                      setPointsToUse(Number(value) || 0)
                      setCheckoutPreview(null)
                    }}
                  />
                  <Space wrap>
                    <Button onClick={loadCart}>刷新购物车</Button>
                    <Button disabled={validCheckedCart.length === 0} onClick={checkout}>重新计算优惠</Button>
                    <Button type="primary" disabled={validCheckedCart.length === 0} onClick={createOrder}>提交订单</Button>
                  </Space>
                  {checkoutPreview ? (
                    <Descriptions size="small" column={1} bordered>
                      <Descriptions.Item label="商品合计">￥{yuan(checkoutPreview.total_amount_cent)}</Descriptions.Item>
                      <Descriptions.Item label="满减抵扣">￥{yuan(checkoutPreview.full_discount_amount_cent)}</Descriptions.Item>
                      <Descriptions.Item label="优惠券抵扣">￥{yuan(checkoutPreview.coupon_discount_amount_cent)}</Descriptions.Item>
                      <Descriptions.Item label="积分抵扣">
                        {checkoutPreview.points_used} 分 / ￥{yuan(checkoutPreview.points_discount_amount_cent)}
                      </Descriptions.Item>
                      <Descriptions.Item label="总抵扣">￥{yuan(checkoutPreview.discount_amount_cent)}</Descriptions.Item>
                      <Descriptions.Item label="支付宝应付">
                        <Text className="price">￥{yuan(checkoutPreview.pay_amount_cent)}</Text>
                      </Descriptions.Item>
                    </Descriptions>
                  ) : (
                    <Text type="secondary">调整购物车、满减、优惠券或积分后，请点击“重新计算优惠”查看应付金额。</Text>
                  )}
                </Space>
              </Card>
            </Card>

            <Card title="收货地址">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} placeholder="收货人" />
                <Input value={receiverMobile} onChange={(event) => setReceiverMobile(event.target.value)} placeholder="手机号" />
                <Input value={province} onChange={(event) => setProvince(event.target.value)} placeholder="省" />
                <Input value={city} onChange={(event) => setCity(event.target.value)} placeholder="市" />
                <Input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="区/县" />
                <Input value={street} onChange={(event) => setStreet(event.target.value)} placeholder="街道/乡镇" />
                <Input value={detailAddress} onChange={(event) => setDetailAddress(event.target.value)} placeholder="详细地址" />
                <Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} placeholder="邮编" />
                <Input value={addressTag} onChange={(event) => setAddressTag(event.target.value)} placeholder="地址标签，如家/公司" />
                <Space wrap>
                  <Button type={editingAddressId ? 'default' : 'primary'} onClick={createAddress}>新增地址</Button>
                  <Button type="primary" disabled={!editingAddressId} onClick={updateAddress}>保存修改</Button>
                  <Button disabled={!editingAddressId} onClick={resetAddressForm}>取消编辑</Button>
                </Space>
                <Select
                  placeholder="选择地址"
                  value={selectedAddressId}
                  onChange={setSelectedAddressId}
                  options={addresses.map((address) => ({
                    value: address.id,
                    label: `#${address.id} ${address.address_tag ? `[${address.address_tag}] ` : ''}${address.receiver_name} ${address.province}${address.city}${address.district ?? ''}${address.street ?? ''}${address.detail_address}`,
                  }))}
                />
                <List
                  size="small"
                  dataSource={addresses}
                  locale={{ emptyText: '暂无地址' }}
                  renderItem={(address) => (
                    <List.Item
                      actions={[
                        <Button type="link" onClick={() => fillAddressForm(address)}>编辑</Button>,
                        <Button type="link" disabled={address.is_default} onClick={() => setDefaultAddress(address.id)}>设默认</Button>,
                        <Button danger type="link" onClick={() => deleteAddress(address.id)}>删除</Button>,
                      ]}
                    >
                      <Space direction="vertical" size={2}>
                        <Space wrap>
                          <Tag color="blue">地址 #{address.id}</Tag>
                          {address.is_default ? <Tag color="green">默认</Tag> : null}
                          {address.address_tag ? <Tag>{address.address_tag}</Tag> : null}
                        </Space>
                        <Text>{address.receiver_name} {address.receiver_mobile}</Text>
                        <Text type="secondary">
                          {address.province}{address.city}{address.district ?? ''}{address.street ?? ''}{address.detail_address}
                          {address.postal_code ? ` 邮编 ${address.postal_code}` : ''}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Space>
            </Card>

            <Card title="优惠券">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Button onClick={loadCoupons}>刷新可领</Button>
                  <Button onClick={loadMyCoupons}>刷新我的</Button>
                </Space>
                {coupons.map((coupon) => (
                  <Card size="small" key={coupon.id}>
                    <Space direction="vertical">
                      <Space wrap>
                        <Text strong>{coupon.name}</Text>
                        <Tag color={coupon.status === 'active' ? 'green' : 'red'}>{statusText(coupon.status)}</Tag>
                        <Tag>模板 #{coupon.id}</Tag>
                      </Space>
                      <Text>满 ￥{yuan(coupon.min_amount_cent)} 减 ￥{yuan(coupon.discount_value)}</Text>
                      <Text type="secondary">
                        已领 {coupon.claimed_quantity}/{coupon.total_quantity || '不限'}，
                        本账号已领 {claimedCountByTemplateId.get(coupon.id) ?? 0}/{coupon.per_user_limit}
                      </Text>
                      <Button
                        type="primary"
                        disabled={
                          !isCouponTemplateClaimable(coupon)
                          || (claimedCountByTemplateId.get(coupon.id) ?? 0) >= coupon.per_user_limit
                        }
                        onClick={() => claimCoupon(coupon.id)}
                      >
                        {(claimedCountByTemplateId.get(coupon.id) ?? 0) >= coupon.per_user_limit ? '已领取' : '领取'}
                      </Button>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Space>
        </Col>

        <Col span={24} id="user-community">
          <Card
            title="社区广场"
            className="section-card community-section"
            extra={<Button onClick={loadPosts}>刷新帖子</Button>}
          >
            <Segmented
              className="community-tabs"
              value={communitySection ?? 'square'}
              onChange={(value) => setCommunitySection(value === 'square' ? undefined : String(value))}
              options={[
                { value: 'square', label: '综合广场' },
                { value: 'grass', label: '种草专区' },
                { value: 'merchant', label: '商家动态' },
                { value: 'help', label: '询问求助' },
                { value: 'experience', label: '体验分享' },
              ]}
            />
            <Paragraph type="secondary" className="community-hint">
              综合广场展示所有公开帖子；种草专区用于从帖子进入商品并保留种草来源，普通帖和商家动态可关联商品但不产生种草奖励。
            </Paragraph>
            <Space wrap className="community-topic-bar">
              <Text type="secondary">热门话题：</Text>
              {communityTopics.length ? communityTopics.map((topic) => (
                <Tag
                  key={topic.name}
                  color={communityTopic === topic.name ? 'purple' : 'default'}
                  className="clickable-tag"
                  onClick={() => filterByTopic(topic.name)}
                >
                  #{topic.name} {topic.post_count}
                </Tag>
              )) : <Text type="secondary">暂无话题</Text>}
              {communityTopic ? (
                <Button size="small" onClick={clearCommunityTopic}>清除话题：#{communityTopic}</Button>
              ) : null}
            </Space>
            <Row gutter={[16, 16]}>
              {posts.map((post) => (
                <Col span={6} key={post.id}>
                  <Card
                    hoverable
                    className="post-card"
                    cover={
                      post.image_urls[0] ? (
                        <Image preview={false} src={absoluteAssetUrl(post.image_urls[0])} />
                      ) : (
                        <div className="post-cover">{statusText(post.type)}</div>
                      )
                    }
                    onClick={() => openPost(post)}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                        <Tag>{statusText(post.section)}</Tag>
                        <Tag color={statusColor(post.status)}>{statusText(post.status)}</Tag>
                      </Space>
                      <Text strong>{post.title}</Text>
                      <Space size={6} onClick={(event) => event.stopPropagation()}>
                        <Avatar size="small" src={absoluteAssetUrl(post.author.avatar_url)}>{post.author.nickname?.[0] ?? '用'}</Avatar>
                        <Button type="link" size="small" onClick={() => openCommunityUser(post.author.id)}>
                          {post.author.nickname}
                        </Button>
                      </Space>
                      <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                      {post.topic_tags.length ? (
                        <Space wrap size={4}>
                          {post.topic_tags.map((tag) => (
                            <Tag
                              key={tag}
                              className="clickable-tag"
                              color={communityTopic === tag ? 'purple' : 'default'}
                              onClick={(event) => {
                                event.stopPropagation()
                                void filterByTopic(tag)
                              }}
                            >
                              #{tag}
                            </Tag>
                          ))}
                        </Space>
                      ) : null}
                      {renderCommunityProductCards(post.product_ids, true)}
                      <Space split={<Divider type="vertical" />}>
                        <Text>赞 {post.like_count}</Text>
                        <Text>评 {post.comment_count}</Text>
                        <Text>{new Date(post.created_at).toLocaleDateString()}</Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
            {posts.length === 0 ? <Empty description="暂无社区内容" /> : null}
            <Divider />
            <Card size="small" title="发布社区内容">
              <Row gutter={[12, 12]}>
                <Col span={8}><Input value={postTitle} onChange={(event) => setPostTitle(event.target.value)} placeholder="标题" /></Col>
                <Col span={8}>
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    filterOption={false}
                    style={{ width: '100%' }}
                    value={selectedPostProductIds}
                    onChange={setSelectedPostProductIds}
                    onSearch={(value) => searchPostProducts(value)}
                    onFocus={() => searchPostProducts()}
                    options={postProductOptions}
                    placeholder="搜索并选择关联商品；种草帖需选择已完成订单商品"
                  />
                </Col>
                <Col span={8}>
                  <Select
                    style={{ width: '100%', marginBottom: 8 }}
                    value={postSection}
                    onChange={setPostSection}
                    options={[
                      { value: 'square', label: '综合广场' },
                      { value: 'grass', label: '种草专区' },
                      { value: 'experience', label: '体验分享' },
                      { value: 'help', label: '询问求助' },
                      { value: 'merchant', label: '商家动态' },
                    ]}
                  />
                  <Upload
                    fileList={uploadFiles}
                    beforeUpload={(file) => uploadPostImage(file)}
                    onRemove={(file) => {
                      setPostImages((items) => items.filter((item) => absoluteAssetUrl(item) !== file.url))
                      return true
                    }}
                  >
                    <Button>上传帖子图片</Button>
                  </Upload>
                </Col>
                <Col span={24}>
                  <Input
                    value={postTopicTags}
                    onChange={(event) => setPostTopicTags(event.target.value)}
                    placeholder="话题标签，例如：开箱 零食测评；支持中文逗号、英文逗号或空格"
                  />
                </Col>
                <Col span={24}><Input.TextArea rows={3} value={postContent} onChange={(event) => setPostContent(event.target.value)} /></Col>
                <Col span={24}>
                  <Space>
                    <Button onClick={() => createPost('normal')}>发布普通帖</Button>
                    <Button type="primary" onClick={() => createPost('grass')}>发布种草帖</Button>
                    <Button onClick={loadPosts}>刷新帖子</Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Card>
        </Col>

        <Col span={24} id="user-orders">
          <Card
            title="我的订单"
            extra={
              <Space wrap>
                <Select
                  allowClear
                  style={{ width: 160 }}
                  placeholder="订单状态"
                  value={orderStatusFilter}
                  onChange={(value) => {
                    setOrderStatusFilter(value)
                    setOrderPage(1)
                  }}
                  options={[
                    { value: 'pending_payment', label: '待支付' },
                    { value: 'group_pending', label: '待成团' },
                    { value: 'pending_shipment', label: '待发货' },
                    { value: 'shipping', label: '待收货' },
                    { value: 'completed', label: '已完成' },
                    { value: 'after_sale', label: '售后中' },
                    { value: 'cancelled', label: '已取消' },
                    { value: 'closed', label: '已关闭' },
                  ]}
                />
                <Button onClick={() => loadOrders(1, orderPageSize)}>刷新订单</Button>
              </Space>
            }
          >
            <List
              grid={{ gutter: 16, column: 3 }}
              dataSource={orders}
              locale={{ emptyText: '暂无订单' }}
              renderItem={(order) => (
                <List.Item>
                  <Card
                    className={selectedOrderId === order.id ? 'selected-order-card' : ''}
                    onClick={() => void selectOrderForPayment(order)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="blue">订单 #{order.id}</Tag>
                        <Tag>支付单 #{order.payment_id}</Tag>
                        {order.order_type ? <Tag color={order.order_type === 'group_buy' ? 'purple' : 'default'}>{statusText(order.order_type)}</Tag> : null}
                        {order.group_buy_group_id ? <Tag color="purple">团 #{order.group_buy_group_id}</Tag> : null}
                        <Badge color={statusColor(order.status)} text={statusText(order.status)} />
                      </Space>
                      <Text strong>{order.order_no}</Text>
                      <Space direction="vertical" size={4}>
                        {order.items.map((item) => (
                          <Text key={item.id}>
                            明细 #{item.id} / 商品 #{item.product_id} / SKU #{item.sku_id}：
                            {item.product_name} {item.sku_name} x{item.quantity}，￥{yuan(item.total_amount_cent)}
                          </Text>
                        ))}
                      </Space>
                      <Text className="price">￥{yuan(order.pay_amount_cent)}</Text>
                      {order.logistics_company ? <Text type="secondary">物流：{order.logistics_company} / {order.tracking_no}</Text> : null}
                      <Space wrap>
                        <Button danger disabled={order.status !== 'pending_payment'} onClick={() => cancelOrder(order.id)}>取消订单</Button>
                        <Button type="primary" disabled={order.status !== 'shipping'} onClick={() => confirmOrder(order.id)}>确认收货</Button>
                        <Button
                          disabled={order.status !== 'completed'}
                          onClick={() => void selectOrderForPayment(order)}
                        >
                          选中评价
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </List.Item>
              )}
              pagination={{
                current: orderPage,
                pageSize: orderPageSize,
                total: orderTotal,
                showSizeChanger: true,
                pageSizeOptions: [3, 6, 9, 12],
                showTotal: (count) => `共 ${count} 个订单`,
                onChange: (nextPage, nextPageSize) => {
                  void loadOrders(nextPage, nextPageSize)
                },
              }}
            />
            <Divider />
            <Card
              size="small"
              className="payment-panel"
              title="当前支付单"
              extra={
                <Space wrap>
                  <InputNumber
                    size="small"
                    value={paymentId}
                    onChange={(value) => {
                      setPaymentId(Number(value) || undefined)
                      setPaymentDetail(null)
                      setAlipayQrCode('')
                    }}
                    placeholder="排查用支付单 ID"
                  />
                  <Button size="small" onClick={() => loadPaymentDetail()} disabled={!paymentId}>
                    查询
                  </Button>
                </Space>
              }
            >
              <Row gutter={[24, 16]} align="top">
                <Col xs={24} lg={15}>
                  <Space direction="vertical" size={14} style={{ width: '100%' }}>
                    {selectedOrder ? (
                      <Card size="small" className="payment-summary-card">
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <Space wrap>
                            <Tag color="blue">选中订单 #{selectedOrder.id}</Tag>
                            <Tag>支付单 #{selectedOrder.payment_id}</Tag>
                            <Badge color={statusColor(selectedOrder.status)} text={statusText(selectedOrder.status)} />
                            <Text className="price">￥{yuan(selectedOrder.pay_amount_cent)}</Text>
                          </Space>
                          <Text strong>{selectedOrder.order_no}</Text>
                          <Text type="secondary">
                            订单明细：{selectedOrder.items.map((item) => `#${item.id} ${item.product_name} x${item.quantity}`).join('；')}
                          </Text>
                        </Space>
                      </Card>
                    ) : (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先从上方选择订单" />
                    )}

                    {lastOrderResult ? (
                      <Card size="small" className="payment-summary-card">
                        <Space direction="vertical" size={6}>
                          <Space wrap>
                            <Tag color="blue">最近支付单 #{lastOrderResult.payment_id}</Tag>
                            <Text>应付 ￥{yuan(lastOrderResult.pay_amount_cent)}</Text>
                            {(lastOrderResult.order_ids?.length ?? 0) > 1 ? <Tag color="purple">跨店拆单</Tag> : null}
                          </Space>
                          <Text type="secondary">
                            生成订单：{lastOrderResult.order_ids?.map((id) => `#${id}`).join('、') || '-'}
                            {(lastOrderResult.order_ids?.length ?? 0) > 1 ? '。这些订单共用同一个支付单，支付会一起推进；待支付取消会关闭整笔支付并取消全部待支付子订单。' : ''}
                          </Text>
                        </Space>
                      </Card>
                    ) : null}

                    {paymentDetail ? (
                      <Descriptions size="small" column={2} bordered>
                        <Descriptions.Item label="支付单 ID">{paymentDetail.id}</Descriptions.Item>
                        <Descriptions.Item label="支付单号">{paymentDetail.payment_no}</Descriptions.Item>
                        <Descriptions.Item label="状态">
                          <Badge color={statusColor(paymentDetail.status)} text={statusText(paymentDetail.status)} />
                        </Descriptions.Item>
                        <Descriptions.Item label="金额">￥{yuan(paymentDetail.pay_amount_cent)}</Descriptions.Item>
                        <Descriptions.Item label="支付渠道">{paymentDetail.channel || '-'}</Descriptions.Item>
                        <Descriptions.Item label="买家账号">{paymentDetail.alipay_buyer_logon_id || '-'}</Descriptions.Item>
                        <Descriptions.Item label="支付宝交易号" span={2}>{paymentDetail.alipay_trade_no || '-'}</Descriptions.Item>
                        <Descriptions.Item label="关联订单" span={2}>{paymentDetail.order_ids?.map((id) => `#${id}`).join('、') || '-'}</Descriptions.Item>
                        <Descriptions.Item label="支付时间" span={2}>{paymentDetail.paid_at || '-'}</Descriptions.Item>
                      </Descriptions>
                    ) : (
                      <Text type="secondary">选择订单后会自动加载支付单详情；也可在右上角输入支付单 ID 查询。</Text>
                    )}

                    <Space wrap>
                      <Button
                        type="primary"
                        loading={alipayLoading}
                        onClick={() => createAlipayQrCode(true)}
                        disabled={alipayLoading || !paymentId || paymentDetail?.status === 'paid'}
                      >
                        生成/刷新支付宝二维码
                      </Button>
                      <Button onClick={syncAlipayPayment} disabled={alipayLoading || !paymentId}>
                        同步支付宝结果
                      </Button>
                    </Space>
                  </Space>
                </Col>
                <Col xs={24} lg={9}>
                  <Card size="small" className="payment-qr-card" title="支付宝扫码支付">
                    <Spin spinning={alipayLoading} tip="正在生成支付宝二维码，请勿重复点击">
                      {visibleAlipayQrCode ? (
                        <Space direction="vertical" size={12} align="center" style={{ width: '100%' }}>
                          <QRCode value={visibleAlipayQrCode} size={210} />
                          <Text type="secondary">请使用支付宝沙箱买家账号扫码付款，付款后点击“同步支付宝结果”。</Text>
                          <Text type="secondary">生成期间按钮会锁定，避免多个二维码请求排队导致前一个二维码过时。</Text>
                          <Text type="secondary">二维码内容不是网页支付链接，直接在浏览器打开不会进入该订单支付。</Text>
                          <Text copyable className="qr-link">调试用订单码内容：{visibleAlipayQrCode}</Text>
                        </Space>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={alipayLoading ? '正在生成二维码' : '待生成二维码'} />
                      )}
                    </Spin>
                  </Card>
                </Col>
              </Row>
            </Card>
            <Divider />
            <Card size="small" title="当前选中订单操作">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>申请售后</Text>
                    <Space wrap align="center">
                      <Select
                        style={{ width: 420 }}
                        placeholder="选择要退款的商品明细"
                        value={selectedRefundOrderItem?.id}
                        onChange={setSelectedRefundOrderItemId}
                        options={(selectedOrder?.items ?? []).map((item) => ({
                          value: item.id,
                          label: `明细 #${item.id} / 商品 #${item.product_id} / SKU #${item.sku_id} / ${item.product_name} x${item.quantity}`,
                        }))}
                      />
                      <InputNumber
                        min={1}
                        max={selectedRefundOrderItem?.quantity ?? 1}
                        value={refundQuantity}
                        onChange={(value) => setRefundQuantity(Number(value) || 1)}
                        addonBefore="退款数量"
                      />
                      <Button
                        disabled={!selectedOrder || !selectedRefundOrderItem || !['shipping', 'pending_receipt', 'completed'].includes(selectedOrder.status)}
                        onClick={refundSelectedOrder}
                      >
                        申请售后
                      </Button>
                    </Space>
                    <Upload
                      multiple
                      listType="picture-card"
                      fileList={refundImages.map((url, index) => ({
                        uid: `refund-${index}`,
                        name: url.split('/').pop() || `refund-${index}`,
                        status: 'done',
                        url: absoluteAssetUrl(url),
                      }))}
                      beforeUpload={(file) => uploadRefundImage(file)}
                      onRemove={(file) => {
                        setRefundImages((items) => items.filter((item) => absoluteAssetUrl(item) !== file.url))
                        return true
                      }}
                    >
                      <Button>上传售后凭证</Button>
                    </Upload>
                    <Text type="secondary">按单件全额退款：可退购买数量中的一件或多件，但不支持 10 元商品只退 5 元。</Text>
                  </Space>
                </Col>
                <Col span={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>发表评价</Text>
                    <Space wrap align="center">
                      <Select
                        style={{ width: 420 }}
                        placeholder="选择要评价的商品"
                        value={selectedReviewOrderItem?.id}
                        onChange={setSelectedReviewOrderItemId}
                        options={(selectedOrder?.items ?? []).map((item) => ({
                          value: item.id,
                          label: `明细 #${item.id} / 商品 #${item.product_id} / ${item.product_name}`,
                        }))}
                      />
                      <Rate value={reviewScore} onChange={setReviewScore} />
                      <Text type="secondary">{reviewScore} 分</Text>
                    </Space>
                    <Input
                      value={reviewContent}
                      onChange={(event) => setReviewContent(event.target.value)}
                      placeholder="请输入真实评价内容"
                    />
                    <Upload
                      multiple
                      listType="picture-card"
                      fileList={reviewImages.map((url, index) => ({
                        uid: `review-${index}`,
                        name: url.split('/').pop() || `review-${index}`,
                        status: 'done',
                        url: absoluteAssetUrl(url),
                      }))}
                      beforeUpload={(file) => uploadReviewImage(file)}
                      onRemove={(file) => {
                        setReviewImages((items) => items.filter((item) => absoluteAssetUrl(item) !== file.url))
                        return true
                      }}
                    >
                      <Button>上传评价图片</Button>
                    </Upload>
                    <Button
                      type="primary"
                      disabled={!selectedOrder || !selectedReviewOrderItem || selectedOrder.status !== 'completed' || !reviewContent.trim()}
                      onClick={reviewSelectedOrder}
                    >
                      提交评价
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
            <Divider />
            <Card size="small" title="我的售后记录" extra={(
              <Space wrap>
                <Select
                  allowClear
                  style={{ width: 160 }}
                  placeholder="售后状态"
                  value={refundStatusFilter}
                  onChange={setRefundStatusFilter}
                  options={[
                    { value: 'pending_approval', label: '待审核' },
                    { value: 'approved', label: '已同意' },
                    { value: 'rejected', label: '已拒绝' },
                    { value: 'received', label: '已收货' },
                    { value: 'refunded', label: '已退款' },
                  ]}
                />
                <Button onClick={loadRefunds}>刷新售后</Button>
              </Space>
            )}>
              <List
                grid={{ gutter: 12, column: 4 }}
                dataSource={refunds}
                locale={{ emptyText: '暂无售后记录' }}
                renderItem={(refund) => (
                  <List.Item>
                    <Card size="small">
                      <Space direction="vertical" size={6}>
                        <Space wrap>
                          <Tag color="blue">售后 #{refund.id}</Tag>
                          <Tag>订单 #{refund.order_id}</Tag>
                        </Space>
                        <Badge color={statusColor(refund.status)} text={statusText(refund.status)} />
                        <Text type="secondary">
                          明细 #{refund.order_item_id ?? '-'} / 商品 #{refund.product_id ?? '-'} / SKU #{refund.sku_id ?? '-'} / 数量 {refund.quantity}
                        </Text>
                        <Text>￥{yuan(refund.refund_amount_cent)}</Text>
                        <Text type="secondary">{refund.reason_type}：{refund.reason}</Text>
                        {refund.image_urls.length ? <Text type="secondary">凭证 {refund.image_urls.length} 张</Text> : null}
                        <Text type="secondary">申请时间：{refund.created_at || '-'}</Text>
                        <Button size="small" onClick={() => openRefundDetail(refund.id)}>查看详情</Button>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            </Card>
          </Card>
        </Col>
      </Row>

      <Drawer
        open={!!selectedRefundDetail}
        width={720}
        title={selectedRefundDetail ? `售后详情 #${selectedRefundDetail.id}` : '售后详情'}
        onClose={() => setSelectedRefundDetail(null)}
      >
        {selectedRefundDetail ? (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="售后 ID">{selectedRefundDetail.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Badge color={statusColor(selectedRefundDetail.status)} text={statusText(selectedRefundDetail.status)} />
              </Descriptions.Item>
              <Descriptions.Item label="订单 ID">{selectedRefundDetail.order_id}</Descriptions.Item>
              <Descriptions.Item label="订单明细 ID">{selectedRefundDetail.order_item_id ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="商品 ID">{selectedRefundDetail.product_id ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="SKU ID">{selectedRefundDetail.sku_id ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="退款数量">{selectedRefundDetail.quantity}</Descriptions.Item>
              <Descriptions.Item label="退款金额">￥{yuan(selectedRefundDetail.refund_amount_cent)}</Descriptions.Item>
              <Descriptions.Item label="原因分类">{selectedRefundDetail.reason_type}</Descriptions.Item>
              <Descriptions.Item label="原订单状态">{statusText(selectedRefundDetail.origin_order_status)}</Descriptions.Item>
              <Descriptions.Item label="申请时间">{selectedRefundDetail.created_at || '-'}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{selectedRefundDetail.updated_at || '-'}</Descriptions.Item>
              <Descriptions.Item label="原因说明" span={2}>{selectedRefundDetail.reason}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="售后凭证">
              {selectedRefundDetail.image_urls.length ? (
                <Image.PreviewGroup>
                  <Space wrap>
                    {selectedRefundDetail.image_urls.map((url) => (
                      <Image key={url} width={120} height={120} src={absoluteAssetUrl(url)} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无凭证图片" />
              )}
            </Card>
            <Card size="small" title="处理时间线">
              {selectedRefundDetail.logs.length ? (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  {selectedRefundDetail.logs.map((log) => (
                    <Card key={log.id} size="small" className="refund-log-card">
                      <Space direction="vertical" size={4}>
                        <Space wrap>
                          <Tag color="purple">{log.action}</Tag>
                          <Tag>{log.operator_type}{log.operator_id ? ` #${log.operator_id}` : ''}</Tag>
                          <Text type="secondary">{log.created_at || '-'}</Text>
                        </Space>
                        <Text>{log.message}</Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无处理记录" />
              )}
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <Drawer
        open={!!selectedProduct}
        width={980}
        title="商品详情"
        onClose={() => setSelectedProduct(null)}
      >
        {selectedProduct ? (
          <Row gutter={[24, 24]} className="product-detail-layout">
            <Col span={11}>
              {selectedProductImages[0] ? (
                <Image
                  className="detail-image"
                  src={absoluteAssetUrl(selectedProductImages[0])}
                  fallback=""
                  preview={false}
                />
              ) : (
                <div className="detail-image product-cover">商品图片</div>
              )}
              {selectedProductImages.length ? (
                <Image.PreviewGroup>
                  <Space wrap className="detail-gallery">
                    {selectedProductImages.map((url, index) => (
                      <Image
                        key={`${url}-${index}`}
                        width={92}
                        height={92}
                        src={absoluteAssetUrl(url)}
                      />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              ) : null}
              <Card size="small" title="评价区" className="section-card">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color="gold">
                      平均 {selectedProduct.review_summary.average_score ?? '-'} 分
                    </Tag>
                    <Tag>共 {selectedProduct.review_summary.count} 条评价</Tag>
                    <Select
                      allowClear
                      style={{ width: 120 }}
                      placeholder="评分筛选"
                      value={reviewFilterScore}
                      onChange={setReviewFilterScore}
                      options={[5, 4, 3, 2, 1].map((score) => ({ value: score, label: `${score} 星` }))}
                    />
                    <Button
                      type={reviewOnlyWithImage ? 'primary' : 'default'}
                      onClick={() => setReviewOnlyWithImage((value) => !value)}
                    >
                      只看有图
                    </Button>
                    <Button size="small" onClick={() => loadProductReviews(selectedProduct.id)}>刷新评价</Button>
                  </Space>
                  <List
                    size="small"
                    dataSource={productReviews}
                    locale={{ emptyText: '暂无公开评价' }}
                    renderItem={(review) => (
                      <List.Item>
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap>
                            <Rate disabled value={review.score} />
                            <Space size={6}>
                              <Avatar size="small" src={absoluteAssetUrl(review.user_avatar_url)}>{review.user_nickname?.[0] ?? '用'}</Avatar>
                              <Text type="secondary">{review.user_nickname || `用户 #${review.user_id}`}</Text>
                            </Space>
                          </Space>
                          <Text>{review.content || '用户未填写文字评价'}</Text>
                          {review.image_urls.length ? (
                            <Image.PreviewGroup>
                              <Space wrap>
                                {review.image_urls.map((url) => (
                                  <Image key={url} width={72} height={72} src={absoluteAssetUrl(url)} />
                                ))}
                              </Space>
                            </Image.PreviewGroup>
                          ) : null}
                        </Space>
                      </List.Item>
                    )}
                  />
                </Space>
              </Card>
            </Col>
            <Col span={13}>
              <Space direction="vertical" size={18} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue">商品 #{selectedProduct.id}</Tag>
                  <Link to={`/merchants/${selectedProduct.merchant.id}`}>
                    <Tag color="purple">店铺 #{selectedProduct.merchant.id}</Tag>
                  </Link>
                  <Tag>分类 #{selectedProduct.category_id ?? '-'}</Tag>
                  <Tag color="gold">
                    {selectedProduct.review_summary.average_score ?? '-'} 分 / {selectedProduct.review_summary.count} 评
                  </Tag>
                </Space>
                <Title level={2}>{selectedProduct.name}</Title>
                <Space size={12} align="baseline">
                  <Text className="detail-price">￥{yuan(selectedSku?.price_cent)}</Text>
                  {selectedSku?.market_price_cent ? (
                    <Text delete type="secondary">￥{yuan(selectedSku.market_price_cent)}</Text>
                  ) : null}
                </Space>
                <div className="sku-grid">
                  {selectedProduct.skus.map((sku) => (
                    <Button
                      key={sku.id}
                      type={selectedSkuId === sku.id ? 'primary' : 'default'}
                      onClick={() => setSelectedSkuId(sku.id)}
                    >
                      {sku.name} / SKU #{sku.id} / 库存 {sku.stock}
                    </Button>
                  ))}
                </div>
                <Space>
                  <InputNumber min={1} value={quantity} onChange={(value) => setQuantity(Number(value) || 1)} />
                  <Button type="primary" size="large" onClick={addCart}>
                    {selectedPostSourceEnabled ? `种草来源加购 #${selectedPost?.id}` : '加入购物车'}
                  </Button>
                  <Button size="large" onClick={() => toggleFavoriteProduct(selectedProduct.id)}>
                    {favoriteStatus?.favorited ? '已收藏，点击取消' : '收藏商品'}
                  </Button>
                  <Tag color="magenta">收藏 {favoriteStatus?.favorite_count ?? 0}</Tag>
                </Space>
                {selectedProductGroupBuys.length ? (
                  <Card size="small" title="此商品正在拼团">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {selectedProductGroupBuys.map((activity) => (
                        <Card size="small" key={activity.id}>
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <Space wrap>
                              <Tag color="purple">拼团 #{activity.id}</Tag>
                              <Tag>{activity.group_size} 人团</Tag>
                              <Text strong>￥{yuan(activity.group_price_cent)}</Text>
                              <Tag>{groupBuyQuantity} 件</Tag>
                              <Text type="secondary">预计商品金额 ￥{yuan(activity.group_price_cent * groupBuyQuantity)}</Text>
                            </Space>
                            <Space wrap>
                              <Button type="primary" onClick={() => startGroupBuy(activity)}>
                                直接发起拼团
                              </Button>
                              <Button onClick={loadGroupBuyActivities}>刷新团</Button>
                            </Space>
                            <List
                              size="small"
                              dataSource={activity.active_groups}
                              locale={{ emptyText: '暂无可加入的团' }}
                              renderItem={(group) => (
                                <List.Item
                                  actions={[
                                    <Button
                                      size="small"
                                      disabled={group.joined_count >= group.group_size}
                                      onClick={() => joinGroupBuy(group.id)}
                                    >
                                      加入团 #{group.id}
                                    </Button>,
                                  ]}
                                >
                                  <Text>{group.joined_count}/{group.group_size} 人已支付，截止 {new Date(group.expire_at).toLocaleString()}</Text>
                                </List.Item>
                              )}
                            />
                          </Space>
                        </Card>
                      ))}
                    </Space>
                  </Card>
                ) : null}
                <Card size="small" title="图文详情">
                  <Paragraph style={{ whiteSpace: 'pre-line' }}>{selectedProduct.description || '暂无描述'}</Paragraph>
                  {selectedProductImages.length ? (
                    <Space direction="vertical" size={12} className="detail-content-images">
                      {selectedProductImages.map((url, index) => (
                        <Image key={`${url}-content-${index}`} src={absoluteAssetUrl(url)} />
                      ))}
                    </Space>
                  ) : null}
                </Card>
              </Space>
            </Col>
          </Row>
        ) : null}
      </Drawer>

      <Modal
        open={!!selectedPost}
        title={selectedPost?.title}
        onCancel={() => setSelectedPost(null)}
        footer={null}
        width={760}
      >
        {selectedPost ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space>
              <Tag color={selectedPost.type === 'grass' ? 'purple' : 'blue'}>{statusText(selectedPost.type)}</Tag>
              <Tag>{statusText(selectedPost.section)}</Tag>
              <Tag color={statusColor(selectedPost.status)}>{statusText(selectedPost.status)}</Tag>
              <Button type="link" onClick={() => openCommunityUser(selectedPost.author.id)}>
                作者：{selectedPost.author?.nickname || '匿名'}
              </Button>
            </Space>
            <Paragraph>{selectedPost.content}</Paragraph>
            {selectedPost.topic_tags.length ? (
              <Space wrap>
                {selectedPost.topic_tags.map((tag) => (
                  <Tag
                    key={tag}
                    className="clickable-tag"
                    color={communityTopic === tag ? 'purple' : 'default'}
                    onClick={() => filterByTopic(tag)}
                  >
                    #{tag}
                  </Tag>
                ))}
              </Space>
            ) : null}
            {selectedPost.image_urls.length ? (
              <Image.PreviewGroup>
                <Space wrap>{selectedPost.image_urls.map((url) => <Image width={120} key={url} src={absoluteAssetUrl(url)} />)}</Space>
              </Image.PreviewGroup>
            ) : null}
            <Card size="small" title="关联商品">
              {renderCommunityProductCards(selectedPost.product_ids)}
            </Card>
            <Space>
              <Button onClick={() => communityService.likePost(selectedPost.id).then(() => loadPosts())}>点赞</Button>
              {selectedPost.product_ids.map((productId) => (
                <Button key={productId} onClick={() => openProduct(productId)}>
                  查看商品 #{productId}
                </Button>
              ))}
            </Space>
            <Divider />
            <List
              header="评论"
              dataSource={comments}
              locale={{ emptyText: '暂无评论' }}
              renderItem={(comment) => (
                <List.Item>
                  <List.Item.Meta title={comment.author?.nickname || '匿名'} description={comment.content} />
                </List.Item>
              )}
            />
            <Space.Compact style={{ width: '100%' }}>
              <Input value={commentContent} onChange={(event) => setCommentContent(event.target.value)} placeholder="写评论" />
              <Button type="primary" onClick={() => commentPost(selectedPost.id)}>发送</Button>
            </Space.Compact>
          </Space>
        ) : null}
      </Modal>

      <Drawer
        open={!!selectedCommunityUser}
        width={760}
        title={selectedCommunityUser ? `${selectedCommunityUser.user.nickname} 的社区主页` : '社区主页'}
        onClose={() => setSelectedCommunityUser(null)}
      >
        {selectedCommunityUser ? (
          <Space direction="vertical" size={18} style={{ width: '100%' }}>
            <Card className="community-profile-card">
              <Space align="center" size={16}>
                <Avatar size={72} src={absoluteAssetUrl(selectedCommunityUser.user.avatar_url)}>
                  {selectedCommunityUser.user.nickname?.[0] ?? '用'}
                </Avatar>
                <Space direction="vertical" size={4}>
                  <Title level={4}>{selectedCommunityUser.user.nickname}</Title>
                  <Text type="secondary">社区用户 #{selectedCommunityUser.user.id}</Text>
                </Space>
              </Space>
            </Card>
            <Row gutter={[12, 12]}>
              <Col span={6}><Card><Statistic title="帖子" value={selectedCommunityUser.post_count} /></Card></Col>
              <Col span={6}><Card><Statistic title="种草" value={selectedCommunityUser.grass_post_count} /></Card></Col>
              <Col span={6}><Card><Statistic title="评论" value={selectedCommunityUser.comment_count} /></Card></Col>
              <Col span={6}><Card><Statistic title="获赞" value={selectedCommunityUser.like_received_count} /></Card></Col>
            </Row>
            <Card title="近期帖子">
              <List
                grid={{ gutter: 12, column: 2 }}
                dataSource={selectedCommunityUserPosts}
                locale={{ emptyText: '暂无公开帖子' }}
                renderItem={(post) => (
                  <List.Item>
                    <Card size="small" hoverable onClick={() => openPost(post)}>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                          <Tag>{statusText(post.section)}</Tag>
                        </Space>
                        <Text strong>{post.title}</Text>
                        <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                        {post.topic_tags.length ? (
                          <Space wrap size={4}>
                            {post.topic_tags.map((tag) => <Tag key={tag}>#{tag}</Tag>)}
                          </Space>
                        ) : null}
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <ApiHistory results={apiHistory} />
    </main>
  )
}
