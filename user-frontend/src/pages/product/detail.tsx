import {
  Avatar,
  Button,
  Card,
  Empty,
  Image,
  Input,
  InputNumber,
  List,
  Rate,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  HeartFilled,
  HeartOutlined,
  ShoppingCartOutlined,
  ArrowLeftOutlined,
  FireOutlined,
  ShopOutlined,
  CustomerServiceOutlined,
  CloseOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/auth'
import {
  customerService,
  type CustomerServiceConversation,
  type CustomerServiceMessage,
} from '../../services/customerService'
import { getApiErrorMessage } from '../../services/http'
import { groupBuyService, type GroupBuyActivity } from '../../services/groupBuy'
import { orderService } from '../../services/order'
import {
  productService,
  type ProductDetail,
  type ProductFavoriteStatus,
  type ProductReview,
} from '../../services/product'
import { absoluteAssetUrl, yuan } from '../../utils/format'

const { Title, Text, Paragraph } = Typography

type PageData<T> = {
  list?: T[]
  total?: number
  page?: number
  page_size?: number
}

export function ProductDetailPage() {
  const params = useParams<{ productId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const productId = params.productId ? Number(params.productId) : NaN
  const sourcePostId = searchParams.get('source_post_id') ? Number(searchParams.get('source_post_id')) : undefined
  const groupBuyActivityId = searchParams.get('group_buy_activity_id') ? Number(searchParams.get('group_buy_activity_id')) : undefined

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewFilterScore, setReviewFilterScore] = useState<number | undefined>()
  const [reviewOnlyWithImage, setReviewOnlyWithImage] = useState(false)
  const [selectedSkuId, setSelectedSkuId] = useState<number | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [favoriteStatus, setFavoriteStatus] = useState<ProductFavoriteStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [groupBuyActivity, setGroupBuyActivity] = useState<GroupBuyActivity | null>(null)
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [merchantChatOpen, setMerchantChatOpen] = useState(false)
  const [merchantConversation, setMerchantConversation] = useState<CustomerServiceConversation | null>(null)
  const [merchantMessages, setMerchantMessages] = useState<CustomerServiceMessage[]>([])
  const [merchantChatInput, setMerchantChatInput] = useState('')
  const [merchantChatLoading, setMerchantChatLoading] = useState(false)
  const [merchantChatSending, setMerchantChatSending] = useState(false)

  const selectedSku = useMemo(() => {
    return product?.skus.find((sku) => sku.id === selectedSkuId) ?? product?.skus[0]
  }, [product, selectedSkuId])

  const productImages = useMemo(() => {
    if (!product) return []
    const urls = [...product.images]
    if (product.cover_url && !urls.includes(product.cover_url)) {
      urls.unshift(product.cover_url)
    }
    return urls
  }, [product])

  const visibleReviews = useMemo(() => (showAllReviews ? reviews : reviews.slice(0, 3)), [reviews, showAllReviews])

  function requireLogin(actionText: string) {
    if (authService.hasToken()) return true
    message.info(`登录后即可${actionText}`)
    navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    return false
  }

  function formatChatTime(time: string) {
    const date = new Date(time)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  async function loadProduct(id: number) {
    setLoading(true)
    try {
      const [detailResponse, statusResponse] = await Promise.all([
        productService.getProduct(id).catch((error) => {
          message.error(`商品详情加载失败：${getApiErrorMessage(error)}`)
          return null
        }),
        authService.hasToken() ? productService.getProductFavoriteStatus(id).catch((error) => {
          message.error(`商品收藏状态加载失败：${getApiErrorMessage(error)}`)
          return null
        }) : Promise.resolve(null),
      ])
      if (detailResponse) {
        const data = detailResponse.data as ProductDetail
        setProduct(data)
        setSelectedSkuId(data.skus[0]?.id)
        setFavoriteStatus(statusResponse ? (statusResponse.data as ProductFavoriteStatus) : null)
        setActiveImageIndex(0)
        await loadProductReviews(data.id)
      } else {
        setProduct(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadGroupBuyActivity() {
    if (!groupBuyActivityId) return
    try {
      const response = await groupBuyService.listActivities()
      const activity = response.data?.find((a) => a.id === groupBuyActivityId)
      setGroupBuyActivity(activity ?? null)
    } catch (error) {
      message.error(`拼团活动信息加载失败：${getApiErrorMessage(error)}`)
      setGroupBuyActivity(null)
    }
  }

  async function loadProductReviews(id: number) {
    try {
      const response = await productService.listProductReviews(id, {
        page_size: 20,
        score: reviewFilterScore,
        has_image: reviewOnlyWithImage || undefined,
      })
      const data = response.data as PageData<ProductReview>
      setReviews(data?.list ?? [])
    } catch (error) {
      message.error(`商品评价加载失败：${getApiErrorMessage(error)}`)
      setReviews([])
    }
  }

  async function contactMerchant() {
    if (!product) return
    if (!requireLogin('咨询商家')) return
    setMerchantChatOpen(true)
    setMerchantChatLoading(true)
    try {
      const conversationResponse = await customerService.createConversation({
        target_type: 'merchant',
        merchant_id: product.merchant.id,
        product_id: product.id,
      })
      const conversation = conversationResponse.data
      setMerchantConversation(conversation)
      const messagesResponse = await customerService.listMessages(conversation.id, { page_size: 50 })
      setMerchantMessages(messagesResponse.data.list ?? [])
    } catch (error) {
      message.error(`创建客服会话失败：${getApiErrorMessage(error)}`)
      setMerchantChatOpen(false)
    } finally {
      setMerchantChatLoading(false)
    }
  }

  async function sendMerchantMessage() {
    if (!merchantConversation) return
    const content = merchantChatInput.trim()
    if (!content) return
    setMerchantChatSending(true)
    try {
      const response = await customerService.sendMessage(merchantConversation.id, { content })
      setMerchantMessages((items) => [...items, response.data])
      setMerchantChatInput('')
    } catch (error) {
      message.error(`发送消息失败：${getApiErrorMessage(error)}`)
    } finally {
      setMerchantChatSending(false)
    }
  }

  async function toggleFavorite() {
    if (!product) return
    if (!requireLogin('收藏商品')) return
    try {
      const response = favoriteStatus?.favorited
        ? await productService.unfavoriteProduct(product.id)
        : await productService.favoriteProduct(product.id)
      setFavoriteStatus(response.data as ProductFavoriteStatus)
      message.success(favoriteStatus?.favorited ? '已取消收藏' : '收藏成功')
    } catch (error) {
      message.error(`${favoriteStatus?.favorited ? '取消收藏' : '收藏'}失败：${getApiErrorMessage(error)}`)
    }
  }

  async function addCart() {
    if (!selectedSku) return
    if (!requireLogin('加入购物车')) return
    try {
      await orderService.addCartItem({
        sku_id: selectedSku.id,
        quantity,
        source_post_id: sourcePostId ?? undefined,
      })
      message.success('已加入购物车')
    } catch (error) {
      message.error(`加入购物车失败：${getApiErrorMessage(error)}`)
    }
  }

  useEffect(() => {
    if (Number.isFinite(productId)) {
      setProduct(null)
      setReviews([])
      setShowAllReviews(false)
      setQuantity(1)
      setReviewFilterScore(undefined)
      setReviewOnlyWithImage(false)
      void loadProduct(productId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  useEffect(() => {
    void loadGroupBuyActivity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupBuyActivityId])

  useEffect(() => {
    if (product) {
      void loadProductReviews(product.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewFilterScore, reviewOnlyWithImage])

  if (!Number.isFinite(productId)) {
    return (
      <div className="detail-page">
        <Empty description="商品 ID 无效">
          <Link to="/products">返回商品列表</Link>
        </Empty>
      </div>
    )
  }

  return (
    <div className="detail-page">
      {/* ── Breadcrumb ── */}
      <div className="detail-breadcrumb">
        <Link to="/products"><ArrowLeftOutlined /> 返回商品列表</Link>
      </div>

      <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
        {product ? (
          <>
            {/* ── Product Hero: Image + Info ── */}
            <div className="detail-hero">
              {/* Left: Image Gallery */}
              <div className="detail-gallery">
                <div className="detail-main-image">
                  {productImages[activeImageIndex] ? (
                    <Image
                      src={absoluteAssetUrl(productImages[activeImageIndex])}
                      fallback=""
                      preview={false}
                      className="detail-main-image-img"
                    />
                  ) : (
                    <div className="detail-image-placeholder">
                      <Text type="secondary">暂无图片</Text>
                    </div>
                  )}
                </div>
                {productImages.length > 1 && (
                  <div className="detail-thumb-list">
                    {productImages.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className={`detail-thumb ${index === activeImageIndex ? 'detail-thumb-active' : ''}`}
                        onClick={() => setActiveImageIndex(index)}
                      >
                        <img src={absoluteAssetUrl(url)} alt={`缩略图 ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Product Info */}
              <div className="detail-info">
                {/* Title + Tags */}
                <div className="detail-title-row">
                  <h1 className="detail-title">{product.name}</h1>
                  <div className="detail-tags">
                    {product.category_name ? (
                      <Tag className="detail-tag-cat">{product.category_name}</Tag>
                    ) : null}
                  </div>
                </div>

                {/* Merchant Card */}
                <Link to={`/merchants/${product.merchant.id}`} className="detail-merchant-card">
                  <ShopOutlined className="detail-merchant-icon" />
                  <div className="detail-merchant-info">
                    <span className="detail-merchant-name">{product.merchant.name}</span>
                    <span className="detail-merchant-action">进店逛逛 →</span>
                  </div>
                </Link>

                {/* Price Block */}
                <div className="detail-price-block">
                  {groupBuyActivity ? (
                    <div className="detail-price-row">
                      <span className="detail-price-label">拼团价</span>
                      <FireOutlined className="detail-tag-group-buy" style={{ color: '#ff4d4f', fontSize: 18 }} />
                      <span className="detail-price detail-price-group">¥{yuan(groupBuyActivity.group_price_cent)}</span>
                      <span className="detail-market-price">¥{yuan(selectedSku?.price_cent ?? 0)}</span>
                      <span className="detail-price-savings">
                        省 ¥{yuan((selectedSku?.price_cent ?? 0) - groupBuyActivity.group_price_cent)}
                      </span>
                    </div>
                  ) : (
                    <div className="detail-price-row">
                      <span className="detail-price-label">价格</span>
                      <span className="detail-price">¥{yuan(selectedSku?.price_cent)}</span>
                      {selectedSku?.market_price_cent ? (
                        <span className="detail-market-price">¥{yuan(selectedSku.market_price_cent)}</span>
                      ) : null}
                    </div>
                  )}
                  <div className="detail-review-brief">
                    <Rate disabled value={product.review_summary.average_score ?? 0} allowHalf className="detail-rate-sm" />
                    <span className="detail-review-score">{product.review_summary.average_score ?? '-'}</span>
                    <span className="detail-review-count">{product.review_summary.count} 条评价</span>
                    <Text style={{ color: '#999', fontSize: 13 }}>已售 {product.sales_count} 件</Text>
                    <span className="detail-fav-count">
                      {favoriteStatus?.favorited ? <HeartFilled style={{ color: '#f5222d' }} /> : <HeartOutlined />}
                      {' '}{favoriteStatus?.favorite_count ?? 0} 收藏
                    </span>
                  </div>
                </div>

                {/* SKU Selection */}
                <div className="detail-sku-section">
                  <Text type="secondary" className="detail-section-label">规格</Text>
                  <div className="detail-sku-grid">
                    {product.skus.map((sku) => (
                      <Button
                        key={sku.id}
                        type={selectedSkuId === sku.id ? 'primary' : 'default'}
                        onClick={() => setSelectedSkuId(sku.id)}
                        disabled={sku.stock <= 0}
                        className={`detail-sku-btn ${selectedSkuId === sku.id ? 'detail-sku-btn-active' : ''}`}
                      >
                        {sku.name}
                        {sku.stock <= 0 && <span className="detail-sku-oos">缺货</span>}
                      </Button>
                    ))}
                  </div>
                  {selectedSku && (
                    <Text type="secondary" className="detail-sku-stock">
                      {selectedSku.name} · 库存 {selectedSku.stock} 件
                    </Text>
                  )}
                </div>

                {/* Quantity */}
                <div className="detail-qty-section">
                  <Text type="secondary" className="detail-section-label">数量</Text>
                  <InputNumber
                    min={1}
                    max={selectedSku?.stock ?? 99}
                    value={quantity}
                    onChange={(value) => setQuantity(Number(value) || 1)}
                    className="detail-qty-input"
                  />
                </div>

                {/* Action Buttons */}
                <div className="detail-actions">
                  {groupBuyActivity ? (
                    <Button
                      type="primary"
                      size="large"
                      icon={<FireOutlined />}
                      onClick={() => navigate(`/checkout?group_buy=${groupBuyActivity.id}`)}
                      disabled={!selectedSku || selectedSku.stock <= 0}
                      className="btn-add-cart"
                    >
                      发起拼团
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      icon={<ShoppingCartOutlined />}
                      onClick={addCart}
                      disabled={!selectedSku || selectedSku.stock <= 0}
                      className="btn-add-cart"
                    >
                      加入购物车
                    </Button>
                  )}
                  <Button
                    size="large"
                    onClick={toggleFavorite}
                    icon={favoriteStatus?.favorited ? <HeartFilled /> : <HeartOutlined />}
                    className="btn-toggle-fav"
                  >
                    {favoriteStatus?.favorited ? '已收藏' : '收藏'}
                  </Button>
                  <Button
                    size="large"
                    icon={<CustomerServiceOutlined />}
                    onClick={contactMerchant}
                    className="btn-contact-merchant"
                  >
                    联系商家
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Reviews + Description ── */}
            <div className="detail-tabs">
              <Card
                className="detail-tab-card"
                title={<span className="detail-tab-title">商品评价</span>}
                extra={
                  <Space wrap size={8}>
                    <Select
                      allowClear
                      style={{ width: 110 }}
                      placeholder="评分筛选"
                      value={reviewFilterScore}
                      onChange={setReviewFilterScore}
                      options={[5, 4, 3, 2, 1].map((score) => ({ value: score, label: `${score} 星` }))}
                    />
                    <Button
                      type={reviewOnlyWithImage ? 'primary' : 'default'}
                      onClick={() => setReviewOnlyWithImage((v) => !v)}
                      size="small"
                    >
                      只看有图
                    </Button>
                    <Button size="small" onClick={() => loadProductReviews(product.id)}>刷新</Button>
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={visibleReviews}
                  locale={{ emptyText: '暂无公开评价' }}
                  renderItem={(review) => (
                    <List.Item className="detail-review-item">
                      <div className="detail-review">
                        <div className="detail-review-header">
                          <Space size={8}>
                            <Avatar size="small" src={absoluteAssetUrl(review.user_avatar_url)}>
                              {review.user_nickname?.[0] ?? '用'}
                            </Avatar>
                            <Text type="secondary">{review.user_nickname || `用户 ${review.user_id}`}</Text>
                          </Space>
                          <Rate disabled value={review.score} className="detail-rate-sm" />
                        </div>
                        <Text className="detail-review-content">{review.content || '用户未填写文字评价'}</Text>
                        {review.image_urls.length > 0 && (
                          <Image.PreviewGroup>
                            <div className="detail-review-images">
                              {review.image_urls.map((url) => (
                                <Image
                                  key={url}
                                  width={80}
                                  height={80}
                                  src={absoluteAssetUrl(url)}
                                  className="detail-review-thumb"
                                />
                              ))}
                            </div>
                          </Image.PreviewGroup>
                        )}
                      </div>
                    </List.Item>
                  )}
                />
                {reviews.length > 3 ? (
                  <div className="detail-review-more">
                    <Button type="link" onClick={() => setShowAllReviews((value) => !value)}>
                      {showAllReviews ? '收起评价' : `查看全部 ${reviews.length} 条评价`}
                    </Button>
                  </div>
                ) : null}
              </Card>

              <Card
                className="detail-tab-card"
                title={<span className="detail-tab-title">图文详情</span>}
              >
                <Paragraph style={{ whiteSpace: 'pre-line' }}>{product.description || '暂无文字介绍'}</Paragraph>
                {product.detail_images && product.detail_images.length > 0 ? (
                  <div className="detail-content-images">
                    {product.detail_images.map((url, index) => (
                      <img
                        key={`${url}-detail-${index}`}
                        src={absoluteAssetUrl(url)}
                        alt={`商品详情图 ${index + 1}`}
                        className="detail-content-image"
                      />
                    ))}
                  </div>
                ) : (
                  <Text type="secondary">暂无详情图片</Text>
                )}
              </Card>
            </div>

            {merchantChatOpen && (
              <div className="detail-chat-panel">
                <div className="detail-chat-header">
                  <div>
                    <Text strong>商家客服</Text>
                    <div className="detail-chat-subtitle">
                      {product.merchant.name}
                      {merchantConversation?.product_name ? ` · ${merchantConversation.product_name}` : ''}
                    </div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => setMerchantChatOpen(false)}
                  />
                </div>
                <div className="detail-chat-messages">
                  {merchantChatLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : merchantMessages.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="可以直接向商家咨询商品规格、库存和发货等问题"
                    />
                  ) : (
                    merchantMessages.map((item) => {
                      const isSelf = item.sender_type === 'user'
                      return (
                        <div
                          key={item.id}
                          className={`detail-chat-message ${isSelf ? 'detail-chat-message-self' : ''}`}
                        >
                          <div className="detail-chat-bubble">
                            <span>{item.content}</span>
                            <em>{formatChatTime(item.created_at)}</em>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="detail-chat-input">
                  <Input
                    value={merchantChatInput}
                    onChange={(event) => setMerchantChatInput(event.target.value)}
                    onPressEnter={() => void sendMerchantMessage()}
                    placeholder="请输入咨询内容"
                    disabled={!merchantConversation || merchantChatLoading}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={merchantChatSending}
                    disabled={!merchantConversation || !merchantChatInput.trim()}
                    onClick={() => void sendMerchantMessage()}
                  >
                    发送
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Empty description="商品不存在或已下架">
            <Link to="/products">返回商品列表</Link>
          </Empty>
        )}
      </Skeleton>
    </div>
  )
}
