import { Button, Card, Drawer, Empty, Image, InputNumber, Select, Skeleton, Space, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ShopOutlined,
  HeartOutlined,
  HeartFilled,
  GiftOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'

import { orderService } from '../../services/order'
import {
  productService,
  type Merchant,
  type MerchantFollowStatus,
  type ProductDetail,
  type ProductListItem,
} from '../../services/product'
import { promotionService, type CouponTemplate } from '../../services/promotion'
import { absoluteAssetUrl, pickErrorMessage, yuan } from '../../utils/format'

const { Text, Paragraph } = Typography

export function MerchantPage() {
  const { merchantId } = useParams()
  const numericMerchantId = Number(merchantId)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [minPriceYuan, setMinPriceYuan] = useState<number | null>(null)
  const [maxPriceYuan, setMaxPriceYuan] = useState<number | null>(null)
  const [sort, setSort] = useState('newest:desc')
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null)
  const [selectedSkuId, setSelectedSkuId] = useState<number>()
  const [quantity, setQuantity] = useState(1)
  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [followStatus, setFollowStatus] = useState<MerchantFollowStatus | null>(null)

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

  async function loadMerchant() {
    if (!Number.isFinite(numericMerchantId) || numericMerchantId <= 0) return
    setLoading(true)
    try {
      const [merchantResponse, productResponse, followResponse] = await Promise.all([
        productService.getMerchant(numericMerchantId),
        productService.listMerchantProducts(numericMerchantId, buildProductParams()),
        productService.getMerchantFollowStatus(numericMerchantId),
      ])
      setMerchant(merchantResponse.data)
      setProducts(productResponse.data.list)
      setTotal(productResponse.data.total)
      setFollowStatus(followResponse.data)
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '店铺信息加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function loadCoupons() {
    if (!Number.isFinite(numericMerchantId) || numericMerchantId <= 0) return
    try {
      const response = await promotionService.listCoupons({ merchant_id: numericMerchantId })
      setCoupons(response.data)
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '店铺优惠券加载失败')
    }
  }

  async function claimCoupon(couponId: number) {
    try {
      await promotionService.claimCoupon(couponId)
      message.success('优惠券领取成功')
      await loadCoupons()
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '领取失败，请确认已登录且未超过领取限制')
    }
  }

  async function toggleFollow() {
    try {
      const response = followStatus?.followed
        ? await productService.unfollowMerchant(numericMerchantId)
        : await productService.followMerchant(numericMerchantId)
      setFollowStatus(response.data)
      message.success(response.data.followed ? '已关注店铺' : '已取消关注')
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '请先登录用户账号')
    }
  }

  function buildProductParams() {
    const [sortBy, sortOrder] = sort.split(':')
    return {
      min_price_cent: minPriceYuan === null ? undefined : Math.round(minPriceYuan * 100),
      max_price_cent: maxPriceYuan === null ? undefined : Math.round(maxPriceYuan * 100),
      sort_by: sortBy,
      sort_order: sortOrder,
      page: 1,
      page_size: 24,
    }
  }

  async function openProduct(productId: number) {
    try {
      const response = await productService.getProduct(productId)
      setSelectedProduct(response.data)
      setSelectedSkuId(response.data.skus[0]?.id)
      setQuantity(1)
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '商品详情加载失败')
    }
  }

  async function addCart() {
    if (!selectedSku) {
      message.warning('请先选择 SKU')
      return
    }
    try {
      await orderService.addCartItem({ sku_id: selectedSku.id, quantity })
      message.success('已加入购物车')
    } catch (error) {
      message.error(pickErrorMessage(error) ?? '加入购物车失败，请确认已登录用户账号')
    }
  }

  useEffect(() => {
    void loadMerchant()
    void loadCoupons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericMerchantId])

  if (!Number.isFinite(numericMerchantId) || numericMerchantId <= 0) {
    return (
      <div className="shop-page">
        <Empty description="店铺 ID 不正确" style={{ padding: '80px 0' }} />
      </div>
    )
  }

  return (
    <div className="shop-page">
      {/* ── Shop Hero Banner ── */}
      <div className="shop-hero">
        <div className="shop-hero-bg" />
        <div className="shop-hero-content">
          <Skeleton loading={loading && !merchant} active avatar={{ size: 72 }}>
            <div className="shop-hero-left">
              {merchant?.logo_url ? (
                <img className="shop-logo" src={absoluteAssetUrl(merchant.logo_url)} alt={merchant.name} />
              ) : (
                <div className="shop-logo-placeholder">
                  <ShopOutlined />
                </div>
              )}
              <div className="shop-hero-info">
                <h1 className="shop-name">{merchant?.name ?? `店铺 #${numericMerchantId}`}</h1>
                <div className="shop-hero-meta">
                  <Tag className="shop-tag-id">店铺 #{numericMerchantId}</Tag>
                  <Tag className="shop-tag-stat">在售 {total}</Tag>
                  <Tag className="shop-tag-follow">
                    <HeartOutlined /> {followStatus?.follower_count ?? 0}
                  </Tag>
                </div>
                <div className="shop-announcement">
                  <EnvironmentOutlined />
                  <span>{merchant?.announcement || '店铺暂未填写公告'}</span>
                </div>
              </div>
            </div>
            <div className="shop-hero-actions">
              <Button
                type={followStatus?.followed ? 'default' : 'primary'}
                icon={followStatus?.followed ? <HeartFilled /> : <HeartOutlined />}
                onClick={() => void toggleFollow()}
                className={followStatus?.followed ? 'shop-btn-followed' : 'btn-shop-primary'}
              >
                {followStatus?.followed ? '已关注' : '关注店铺'}
              </Button>
              <Link to="/">
                <Button className="shop-btn-back">返回首页</Button>
              </Link>
            </div>
          </Skeleton>
        </div>
      </div>

      {/* ── Coupon Strip ── */}
      {coupons.length > 0 && (
        <div className="shop-coupon-strip">
          <div className="shop-coupon-header">
            <GiftOutlined />
            <span>店铺优惠券</span>
            <Button size="small" type="link" icon={<ReloadOutlined />} onClick={() => void loadCoupons()}>
              刷新
            </Button>
          </div>
          <div className="shop-coupon-list">
            {coupons.map((coupon) => {
              const soldOut = coupon.total_quantity !== 0 && coupon.claimed_quantity >= coupon.total_quantity
              return (
                <div key={coupon.id} className={`shop-coupon-card ${soldOut ? 'shop-coupon-soldout' : ''}`}>
                  <div className="shop-coupon-left">
                    <span className="shop-coupon-discount">¥{yuan(coupon.discount_value)}</span>
                    <span className="shop-coupon-min">满¥{yuan(coupon.min_amount_cent)}可用</span>
                  </div>
                  <div className="shop-coupon-right">
                    <span className="shop-coupon-name">{coupon.name}</span>
                    <Tag className="shop-coupon-scope">
                      {coupon.scope_type === 'merchant' ? '本店可用' : '平台通用'}
                    </Tag>
                    <span className="shop-coupon-remain">
                      {coupon.total_quantity === 0 ? '不限量' : `剩余 ${coupon.total_quantity - coupon.claimed_quantity}`}
                    </span>
                  </div>
                  <Button
                    size="small"
                    type="primary"
                    disabled={soldOut}
                    onClick={() => void claimCoupon(coupon.id)}
                    className="btn-shop-primary"
                  >
                    {soldOut ? '已领完' : '领取'}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="shop-filter-bar">
        <div className="shop-filter-left">
          <span className="shop-filter-label">价格</span>
          <InputNumber
            size="small"
            min={0}
            precision={2}
            placeholder="最低"
            value={minPriceYuan}
            onChange={setMinPriceYuan}
            className="shop-price-input"
          />
          <span className="shop-price-sep">—</span>
          <InputNumber
            size="small"
            min={0}
            precision={2}
            placeholder="最高"
            value={maxPriceYuan}
            onChange={setMaxPriceYuan}
            className="shop-price-input"
          />
          <span className="shop-filter-label">排序</span>
          <Select
            size="small"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'newest:desc', label: '最新上架' },
              { value: 'price:asc', label: '价格升序' },
              { value: 'price:desc', label: '价格降序' },
              { value: 'sales:desc', label: '销量优先' },
            ]}
            className="shop-sort-select"
          />
        </div>
        <div className="shop-filter-right">
          <span className="shop-filter-total">共 {total} 件商品</span>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadMerchant()}>
            刷新
          </Button>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="shop-product-section">
        <Skeleton loading={loading} active>
          {products.length === 0 ? (
            <Empty description="当前店铺暂无符合条件的在售商品" style={{ padding: '60px 0' }} />
          ) : (
            <div className="shop-product-grid">
              {products.map((product) => (
                <div key={product.id} className="shop-product-card" onClick={() => void openProduct(product.id)}>
                  <div className="shop-product-img">
                    {product.cover_url ? (
                      <img src={absoluteAssetUrl(product.cover_url)} alt={product.name} loading="lazy" />
                    ) : (
                      <div className="shop-product-noimg">暂无图片</div>
                    )}
                  </div>
                  <div className="shop-product-body">
                    <Text className="shop-product-name" ellipsis>{product.name}</Text>
                    <div className="shop-product-meta">
                      <Tag className="shop-product-tag-id">#{product.id}</Tag>
                    </div>
                    <div className="shop-product-price-row">
                      <span className="shop-product-price">¥{yuan(product.price_cent)}</span>
                      {product.market_price_cent ? (
                        <span className="shop-product-market">¥{yuan(product.market_price_cent)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Skeleton>
      </div>

      {/* ── Product Detail Drawer ── */}
      <Drawer
        title="商品详情"
        width={980}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        destroyOnClose
        className="shop-drawer"
      >
        {selectedProduct ? (
          <div className="shop-detail">
            {/* Tags row */}
            <div className="shop-detail-tags">
              <Tag className="shop-tag-id">商品 #{selectedProduct.id}</Tag>
              <Tag className="shop-tag-stat">店铺 #{selectedProduct.merchant.id}</Tag>
              {selectedProduct.category_id && <Tag className="shop-tag-stat">分类 #{selectedProduct.category_id}</Tag>}
              <Tag className="shop-tag-review">
                {selectedProduct.review_summary.average_score ?? '-'} 分 / {selectedProduct.review_summary.count} 评
              </Tag>
            </div>

            <div className="shop-detail-layout">
              {/* Left: Images */}
              <div className="shop-detail-left">
                {selectedProductImages[0] ? (
                  <Image className="shop-detail-main-img" src={absoluteAssetUrl(selectedProductImages[0])} />
                ) : (
                  <div className="shop-product-noimg shop-detail-main-img">暂无图片</div>
                )}
                {selectedProductImages.length > 1 && (
                  <div className="shop-detail-gallery">
                    {selectedProductImages.slice(1).map((url, index) => (
                      <Image
                        key={`${url}-${index}`}
                        width={80}
                        height={80}
                        src={absoluteAssetUrl(url)}
                        className="shop-detail-thumb"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Info */}
              <div className="shop-detail-right">
                <h2 className="shop-detail-name">{selectedProduct.name}</h2>
                <div className="shop-detail-price-box">
                  <span className="shop-detail-price">¥{yuan(selectedSku?.price_cent)}</span>
                  {selectedSku?.market_price_cent && (
                    <span className="shop-detail-market">¥{yuan(selectedSku.market_price_cent)}</span>
                  )}
                </div>

                {/* SKU Selection */}
                <div className="shop-detail-sku-section">
                  <Text type="secondary" className="shop-detail-section-label">规格选择</Text>
                  <div className="shop-detail-sku-grid">
                    {selectedProduct.skus.map((sku) => (
                      <button
                        key={sku.id}
                        className={`shop-sku-btn ${selectedSkuId === sku.id ? 'shop-sku-btn-active' : ''}`}
                        onClick={() => setSelectedSkuId(sku.id)}
                      >
                        <span className="shop-sku-name">{sku.name}</span>
                        <span className="shop-sku-info">SKU #{sku.id} · 库存 {sku.stock}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity + Actions */}
                <div className="shop-detail-actions">
                  <div className="shop-detail-qty">
                    <Text type="secondary" className="shop-detail-section-label">数量</Text>
                    <InputNumber min={1} value={quantity} onChange={(value) => setQuantity(Number(value) || 1)} />
                  </div>
                  <div className="shop-detail-btns">
                    <Button
                      type="primary"
                      size="large"
                      icon={<ShoppingCartOutlined />}
                      onClick={() => void addCart()}
                      className="btn-shop-primary"
                    >
                      加入购物车
                    </Button>
                    <Link to="/cart">
                      <Button size="large">去购物车</Button>
                    </Link>
                  </div>
                </div>

                {/* Description */}
                <Card size="small" title="图文详情" className="shop-detail-desc-card">
                  <Paragraph style={{ whiteSpace: 'pre-line' }}>{selectedProduct.description || '暂无描述'}</Paragraph>
                  {selectedProductImages.length > 0 && (
                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                      {selectedProductImages.map((url, index) => (
                        <Image key={`${url}-content-${index}`} src={absoluteAssetUrl(url)} width="100%" />
                      ))}
                    </Space>
                  )}
                </Card>
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  )
}
