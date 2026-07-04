import {
  Avatar,
  Button,
  Card,
  Empty,
  Image,
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
} from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { authService } from '../../services/auth'
import { getApiErrorMessage } from '../../services/http'
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
  const productId = params.productId ? Number(params.productId) : NaN

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [reviewFilterScore, setReviewFilterScore] = useState<number | undefined>()
  const [reviewOnlyWithImage, setReviewOnlyWithImage] = useState(false)
  const [selectedSkuId, setSelectedSkuId] = useState<number | undefined>()
  const [quantity, setQuantity] = useState(1)
  const [favoriteStatus, setFavoriteStatus] = useState<ProductFavoriteStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)

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

  async function loadProduct(id: number) {
    setLoading(true)
    try {
      const [detailResponse, statusResponse] = await Promise.all([
        productService.getProduct(id).catch((error) => {
          message.error(`商品详情加载失败：${getApiErrorMessage(error)}`)
          return null
        }),
        productService.getProductFavoriteStatus(id).catch((error) => {
          message.error(`商品收藏状态加载失败：${getApiErrorMessage(error)}`)
          return null
        }),
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

  async function toggleFavorite() {
    if (!product) return
    if (!authService.hasToken()) {
      message.warning('请先登录用户账号')
      return
    }
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
    try {
      await orderService.addCartItem({
        sku_id: selectedSku.id,
        quantity,
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
      setQuantity(1)
      setReviewFilterScore(undefined)
      setReviewOnlyWithImage(false)
      void loadProduct(productId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

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
                    <Tag className="detail-tag-id">#{product.id}</Tag>
                    <Link to={`/merchants/${product.merchant.id}`}>
                      <Tag className="detail-tag-merchant">{product.merchant.name}</Tag>
                    </Link>
                    {product.category_id ? (
                      <Tag className="detail-tag-cat">分类 #{product.category_id}</Tag>
                    ) : null}
                  </div>
                </div>

                {/* Price Block */}
                <div className="detail-price-block">
                  <div className="detail-price-row">
                    <span className="detail-price-label">价格</span>
                    <span className="detail-price">¥{yuan(selectedSku?.price_cent)}</span>
                    {selectedSku?.market_price_cent ? (
                      <span className="detail-market-price">¥{yuan(selectedSku.market_price_cent)}</span>
                    ) : null}
                  </div>
                  <div className="detail-review-brief">
                    <Rate disabled value={product.review_summary.average_score ?? 0} allowHalf className="detail-rate-sm" />
                    <span className="detail-review-score">{product.review_summary.average_score ?? '-'}</span>
                    <span className="detail-review-count">{product.review_summary.count} 条评价</span>
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
                      SKU #{selectedSku.id} · 库存 {selectedSku.stock} 件
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
                  <Button
                    size="large"
                    onClick={toggleFavorite}
                    icon={favoriteStatus?.favorited ? <HeartFilled /> : <HeartOutlined />}
                    className="btn-toggle-fav"
                  >
                    {favoriteStatus?.favorited ? '已收藏' : '收藏'}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Tabs: Description + Reviews ── */}
            <div className="detail-tabs">
              {/* Description Tab */}
              <Card
                className="detail-tab-card"
                title={<span className="detail-tab-title">图文详情</span>}
              >
                <Paragraph style={{ whiteSpace: 'pre-line' }}>{product.description || '暂无描述'}</Paragraph>
                {productImages.length > 0 && (
                  <div className="detail-content-images">
                    <Image.PreviewGroup>
                      {productImages.map((url, index) => (
                        <Image
                          key={`${url}-content-${index}`}
                          src={absoluteAssetUrl(url)}
                          className="detail-content-image"
                        />
                      ))}
                    </Image.PreviewGroup>
                  </div>
                )}
              </Card>

              {/* Reviews Tab */}
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
                  dataSource={reviews}
                  locale={{ emptyText: '暂无公开评价' }}
                  renderItem={(review) => (
                    <List.Item className="detail-review-item">
                      <div className="detail-review">
                        <div className="detail-review-header">
                          <Space size={8}>
                            <Avatar size="small" src={absoluteAssetUrl(review.user_avatar_url)}>
                              {review.user_nickname?.[0] ?? '用'}
                            </Avatar>
                            <Text type="secondary">{review.user_nickname || `用户 #${review.user_id}`}</Text>
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
              </Card>
            </div>
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
