import { Button, Empty, InputNumber, Select, Skeleton, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ShopOutlined,
  HeartOutlined,
  HeartFilled,
  GiftOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'

import {
  productService,
  type Merchant,
  type MerchantFollowStatus,
  type ProductListItem,
} from '../../services/product'
import { promotionService, type CouponTemplate } from '../../services/promotion'
import { absoluteAssetUrl, pickErrorMessage, yuan } from '../../utils/format'

const { Text, Paragraph, Title } = Typography

export function MerchantPage() {
  const { merchantId } = useParams()
  const navigate = useNavigate()
  const numericMerchantId = Number(merchantId)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [minPriceYuan, setMinPriceYuan] = useState<number | null>(null)
  const [maxPriceYuan, setMaxPriceYuan] = useState<number | null>(null)
  const [sort, setSort] = useState('newest:desc')
  const [coupons, setCoupons] = useState<CouponTemplate[]>([])
  const [followStatus, setFollowStatus] = useState<MerchantFollowStatus | null>(null)

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
      const couponResponse = await promotionService.listCoupons({ merchant_id: numericMerchantId })
      setCoupons(couponResponse.data)
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
      {/* ── Page Header ── */}
      <header className="shop-header">
        <Title level={3} className="shop-header-title">
          <ShopOutlined /> 店铺主页
        </Title>
        <Paragraph className="shop-header-sub">
          浏览店铺商品、关注店铺、参与店铺活动
        </Paragraph>
      </header>

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
              const claimed = coupon.received
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
                    disabled={soldOut || claimed}
                    onClick={() => void claimCoupon(coupon.id)}
                    className="btn-shop-primary"
                  >
                    {soldOut ? '已领完' : claimed ? '已领取' : '领取'}
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
                <div key={product.id} className="shop-product-card" onClick={() => navigate(`/products/${product.id}`)}>
                  <div className="shop-product-img">
                    {product.cover_url ? (
                      <img src={absoluteAssetUrl(product.cover_url)} alt={product.name} loading="lazy" />
                    ) : (
                      <div className="shop-product-noimg">暂无图片</div>
                    )}
                  </div>
                  <div className="shop-product-body">
                    <Text className="shop-product-name" ellipsis>{product.name}</Text>
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
    </div>
  )
}
