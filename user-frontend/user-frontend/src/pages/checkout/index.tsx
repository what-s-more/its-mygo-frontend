import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  InputNumber,
  QRCode,
  Radio,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  CreditCardOutlined,
  EnvironmentOutlined,
  FireOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from '@ant-design/icons'

import { addressService, type Address } from '../../services/address'
import { authService, type PointsAccount, type UserProfile } from '../../services/auth'
import { getApiErrorMessage } from '../../services/http'
import { groupBuyService, type GroupBuyActivity, type GroupBuyGroup } from '../../services/groupBuy'
import { orderService, type CheckoutResult, type Payment } from '../../services/order'
import { pickErrorMessage, randomToken, statusColor, statusText, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

type GroupBuyMode =
  | { kind: 'start'; activityId: number }
  | { kind: 'join'; groupId: number }
  | null

export function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const groupBuyParam = searchParams.get('group_buy')
  const groupJoinParam = searchParams.get('group_join')

  const groupBuyMode: GroupBuyMode = useMemo(() => {
    if (groupBuyParam) {
      const id = Number(groupBuyParam)
      if (!Number.isNaN(id) && id > 0) return { kind: 'start', activityId: id }
    }
    if (groupJoinParam) {
      const id = Number(groupJoinParam)
      if (!Number.isNaN(id) && id > 0) return { kind: 'join', groupId: id }
    }
    return null
  }, [groupBuyParam, groupJoinParam])

  // ===== Cart checkout state =====
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [selectedFullDiscountId, setSelectedFullDiscountId] = useState<number | undefined>()
  const [selectedUserCouponId, setSelectedUserCouponId] = useState<number | undefined>()
  const [pointsToUse, setPointsToUse] = useState(0)

  // ===== Group-buy state =====
  const [activity, setActivity] = useState<GroupBuyActivity | null>(null)
  const [group, setGroup] = useState<GroupBuyGroup | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [groupQuantity, setGroupQuantity] = useState(1)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [pointsAccount, setPointsAccount] = useState<PointsAccount | null>(null)

  // ===== Shared state =====
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [createdInfo, setCreatedInfo] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isGroupBuyMode = groupBuyMode !== null
  const availablePoints = pointsAccount?.points ?? profile?.points ?? 0
  const groupPointCap = Math.max(0, availablePoints)
  const groupTotalCent = activity ? activity.group_price_cent * groupQuantity : 0
  const visibleAlipayQrCode = alipayQrCode || paymentDetail?.alipay_qr_code || ''

  // ===== Cart checkout =====
  async function loadCheckout() {
    setMessage('')
    setLoading(true)
    try {
      const response = await orderService.checkout({
        full_discount_id: selectedFullDiscountId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        points_used: pointsToUse,
      })
      setCheckout(response.data)
      setSelectedFullDiscountId(response.data.selected_full_discount_id ?? undefined)
      setSelectedUserCouponId(response.data.selected_coupon_id ?? undefined)
      if (selectedAddressId === null) {
        const defaultAddress = response.data.addresses.find((address) => address.is_default)
        setSelectedAddressId(defaultAddress?.id ?? response.data.addresses[0]?.id ?? null)
      }
    } catch (error) {
      setMessage(`结算预览失败：${pickErrorMessage(error) ?? '请求失败'}`)
      setCheckout(null)
    } finally {
      setLoading(false)
    }
  }

  // ===== Group-buy checkout =====
  async function loadGroupBuyContext() {
    if (!groupBuyMode) return
    setLoading(true)
    setMessage('')
    try {
      const activityResponse = await groupBuyService.listActivities()
      const allActivities = activityResponse.data ?? []
      let matchedActivity: GroupBuyActivity | null = null
      let matchedGroup: GroupBuyGroup | null = null

      if (groupBuyMode.kind === 'start') {
        matchedActivity = allActivities.find((item) => item.id === groupBuyMode.activityId) ?? null
        if (!matchedActivity) {
          setMessage(`未找到拼团活动 #${groupBuyMode.activityId}`)
          return
        }
      } else {
        for (const item of allActivities) {
          const found = item.active_groups.find((g) => g.id === groupBuyMode.groupId)
          if (found) {
            matchedActivity = item
            matchedGroup = found
            break
          }
        }
        if (!matchedActivity || !matchedGroup) {
          setMessage(`未找到拼团 #${groupBuyMode.groupId}，可能已成团或失效`)
          return
        }
      }

      setActivity(matchedActivity)
      setGroup(matchedGroup)

      const [addressRes, profileRes, pointsRes] = await Promise.all([
        addressService.listAddresses(),
        authService.profile(),
        authService.pointsAccount(),
      ])
      const addressList = addressRes.data ?? []
      setAddresses(addressList)
      setProfile(profileRes.data)
      setPointsAccount(pointsRes.data)
      const defaultAddress = addressList.find((address) => address.is_default)
      setSelectedAddressId(defaultAddress?.id ?? addressList[0]?.id ?? null)
    } catch (error) {
      setMessage(`加载拼团信息失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isGroupBuyMode) {
      void loadGroupBuyContext()
    } else {
      void loadCheckout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGroupBuyMode, groupBuyParam, groupJoinParam])

  async function loadPaymentDetail(paymentId: number) {
    try {
      const response = await orderService.getPayment(paymentId)
      setPaymentDetail(response.data)
      setAlipayQrCode(response.data.alipay_qr_code || '')
    } catch (error) {
      setMessage(`加载支付单失败：${getApiErrorMessage(error)}`)
    }
  }

  async function handleSubmitCart() {
    if (!checkout || checkout.items.length === 0) {
      setMessage('暂无可结算商品，请先在购物车勾选有效商品')
      return
    }
    setMessage('')
    setCreatedInfo('')
    setAlipayQrCode('')
    setPaymentDetail(null)
    setLoading(true)
    try {
      const orderResponse = await orderService.createOrder({
        client_order_token: randomToken('order'),
        shipping_address_id: selectedAddressId,
        full_discount_id: selectedFullDiscountId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        points_used: pointsToUse,
      })
      const paymentId = orderResponse.data.payment_id
      const orderIds = orderResponse.data.order_ids
      setCreatedInfo(`支付单 ID：${paymentId}；订单 ID：${orderIds.join(', ')}`)
      try {
        const alipayResponse = await orderService.precreateAlipay(paymentId)
        setAlipayQrCode(alipayResponse.data.qr_code)
        await loadPaymentDetail(paymentId)
        setMessage('订单已提交，请使用支付宝沙箱买家账号扫码支付。')
      } catch (error) {
        setMessage(`支付宝二维码生成失败：${pickErrorMessage(error) ?? '请求失败'}`)
      }
      setPointsToUse(0)
      setSelectedUserCouponId(undefined)
      await loadCheckout()
    } catch (error) {
      setMessage(`提交订单失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitGroupBuy() {
    if (!activity) {
      setMessage('拼团活动信息缺失')
      return
    }
    if (!selectedAddressId) {
      setMessage('请先选择收货地址')
      return
    }
    if (groupBuyMode?.kind === 'join' && !group) {
      setMessage('拼团信息缺失')
      return
    }
    setMessage('')
    setCreatedInfo('')
    setAlipayQrCode('')
    setPaymentDetail(null)
    setLoading(true)
    try {
      const safePoints = Math.min(Math.max(0, pointsToUse), groupPointCap)
      const response =
        groupBuyMode?.kind === 'start'
          ? await groupBuyService.startGroup({
              activity_id: activity.id,
              quantity: groupQuantity,
              shipping_address_id: selectedAddressId,
              points_used: safePoints,
              client_order_token: randomToken('group_start'),
            })
          : await groupBuyService.joinGroup({
              group_id: group!.id,
              quantity: groupQuantity,
              shipping_address_id: selectedAddressId,
              points_used: safePoints,
              client_order_token: randomToken('group_join'),
            })
      const data = response.data
      const paymentId = data.order.payment_id
      const orderIds = data.order.order_ids
      setCreatedInfo(
        `支付单 ID：${paymentId}；订单 ID：${orderIds.join(', ')}；拼团 #${data.group.id}（${data.group.joined_count}/${data.group.group_size} 人）`,
      )
      try {
        const alipayResponse = await orderService.precreateAlipay(paymentId)
        setAlipayQrCode(alipayResponse.data.qr_code)
        await loadPaymentDetail(paymentId)
        setMessage(
          groupBuyMode?.kind === 'start' ? '拼团已发起，请扫码完成支付。' : '已加入拼团，请扫码完成支付。',
        )
      } catch (error) {
        setMessage(`支付宝二维码生成失败：${pickErrorMessage(error) ?? '请求失败'}`)
      }
      setPointsToUse(0)
    } catch (error) {
      setMessage(`拼团提交失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  // ===== Shared render helpers =====
  function renderAddressList(addressList: Address[]) {
    if (addressList.length === 0) {
      return (
        <div className="checkout-empty-block">
          <Text type="secondary">暂无收货地址，请先到个人中心新增地址。</Text>
        </div>
      )
    }
    return (
      <Radio.Group
        value={selectedAddressId ?? undefined}
        onChange={(event) => setSelectedAddressId(event.target.value as number)}
        className="checkout-address-list"
      >
        {addressList.map((address) => (
          <Radio key={address.id} value={address.id} className="checkout-address-radio">
            <div
              className={`checkout-address-card ${selectedAddressId === address.id ? 'checkout-address-card-active' : ''}`}
            >
              <div className="checkout-address-row">
                <div className="checkout-address-tags">
                  <Tag className="checkout-tag-id">地址 #{address.id}</Tag>
                  {address.is_default ? <Tag color="green">默认</Tag> : null}
                  {address.address_tag ? <Tag>{address.address_tag}</Tag> : null}
                </div>
                <div className="checkout-address-user">
                  <Text strong>{address.receiver_name}</Text>
                  <Text type="secondary">{address.receiver_mobile}</Text>
                </div>
              </div>
              <div className="checkout-address-detail">
                {address.province}
                {address.city}
                {address.district ?? ''}
                {address.street ?? ''}
                {address.detail_address}
              </div>
            </div>
          </Radio>
        ))}
      </Radio.Group>
    )
  }

  function renderCheckoutResult() {
    if (!createdInfo) return null
    return (
      <Card className="checkout-result-card">
        <div className="checkout-result-body">
          <div className="checkout-result-header">
            <CreditCardOutlined className="checkout-result-icon" />
            <div>
              <Text strong className="checkout-result-title">
                订单已提交
              </Text>
              <Text type="secondary" className="checkout-result-info">
                {createdInfo}
              </Text>
            </div>
          </div>
          {paymentDetail ? (
            <div className="checkout-payment-status">
              <Tag color="blue">支付单 #{paymentDetail.id}</Tag>
              <Tag color={statusColor(paymentDetail.status)}>{statusText(paymentDetail.status)}</Tag>
              <Text className="checkout-result-price">
                应付 ￥{yuan(paymentDetail.pay_amount_cent)}
              </Text>
              {paymentDetail.points_used > 0 ? (
                <Text type="secondary">
                  积分抵扣 ￥{yuan(paymentDetail.points_discount_amount_cent)}（{paymentDetail.points_used} 分）
                </Text>
              ) : null}
            </div>
          ) : null}
          {visibleAlipayQrCode ? (
            <div className="checkout-qr-area">
              <QRCode value={visibleAlipayQrCode} size={180} />
              <Text type="secondary" className="checkout-qr-hint">
                请使用支付宝沙箱买家账号扫码付款
              </Text>
              <Text copyable type="secondary" className="checkout-qr-raw">
                {visibleAlipayQrCode}
              </Text>
            </div>
          ) : null}
        </div>
      </Card>
    )
  }

  // ===== Group-buy mode render =====
  if (isGroupBuyMode) {
    const groupBuyReadyText = !authService.hasToken()
      ? '请先登录用户账号'
      : addresses.length === 0
        ? '请先到个人中心新增收货地址'
        : !activity
          ? '拼团活动信息加载中或不存在'
          : groupBuyMode?.kind === 'join' && !group
            ? '拼团不存在或已不可加入'
            : '可以提交拼团订单'

    return (
      <div className="checkout-page">
        <Spin spinning={loading && !activity}>
          <header className="checkout-header">
            <Title level={3} className="checkout-header-title">
              {groupBuyMode?.kind === 'start' ? (
                <><FireOutlined /> 发起拼团</>
              ) : (
                <><TeamOutlined /> 加入拼团</>
              )}
            </Title>
            <Paragraph className="checkout-header-sub">
              选择收货地址、购买件数和积分抵扣后提交，将生成支付宝沙箱二维码。拼团不叠加满减或优惠券。
            </Paragraph>
          </header>

          <Alert
            className="checkout-alert"
            type={activity ? 'success' : 'warning'}
            showIcon
            message={groupBuyReadyText}
            description="首位用户支付后团有效期 24 小时；成团后订单进入商家待发货。"
          />

          {activity ? (
            <div className="checkout-layout">
              <div className="checkout-left">
                {/* Activity info */}
                <Card className="checkout-card" title={<span className="checkout-card-title">拼团活动</span>}>
                  <div className="checkout-gb-tags">
                    <Tag className="gb-tag-id">拼团 #{activity.id}</Tag>
                    <Tag className="gb-tag-group-size">
                      <TeamOutlined /> {activity.group_size} 人团
                    </Tag>
                    <Tag color={statusColor(activity.status)}>{statusText(activity.status)}</Tag>
                    {group ? (
                      <Tag className="gb-tag-group-id">
                        团 #{group.id} {group.joined_count}/{group.group_size} 人
                      </Tag>
                    ) : null}
                  </div>
                  <div className="checkout-gb-name">{activity.name}</div>
                  <div className="checkout-gb-meta">
                    商品 #{activity.product_id} · SKU #{activity.sku_id}
                  </div>
                  {activity.valid_to && (
                    <div className="checkout-gb-deadline">
                      活动截止：{new Date(activity.valid_to).toLocaleString()}
                    </div>
                  )}
                </Card>

                {/* Address */}
                <Card
                  className="checkout-card"
                  title={<span className="checkout-card-title"><EnvironmentOutlined /> 收货地址</span>}
                >
                  {renderAddressList(addresses)}
                </Card>
              </div>

              <div className="checkout-right">
                <div className="checkout-sticky">
                  <Card
                    className="checkout-card checkout-summary-card"
                    title={<span className="checkout-card-title">金额明细</span>}
                  >
                    <div className="checkout-summary-row">
                      <Text type="secondary">拼团单价</Text>
                      <Text className="price">￥{yuan(activity.group_price_cent)}</Text>
                    </div>
                    <div className="checkout-summary-row">
                      <Text type="secondary">购买件数</Text>
                      <InputNumber
                        min={1}
                        precision={0}
                        value={groupQuantity}
                        onChange={(value) => setGroupQuantity(Math.max(1, Number(value) || 1))}
                        className="checkout-qty-input"
                      />
                    </div>
                    <div className="checkout-summary-row">
                      <Text type="secondary">商品总额</Text>
                      <Text>￥{yuan(groupTotalCent)}</Text>
                    </div>
                    <div className="checkout-summary-row checkout-points-row">
                      <Text type="secondary">积分抵扣</Text>
                      <InputNumber
                        min={0}
                        max={groupPointCap}
                        precision={0}
                        value={pointsToUse}
                        addonAfter={`最多 ${groupPointCap}`}
                        onChange={(value) => setPointsToUse(Number(value) || 0)}
                        className="checkout-points-input"
                      />
                    </div>
                    <Divider className="checkout-divider" />
                    <div className="checkout-summary-row checkout-pay-row">
                      <Text strong>支付宝应付</Text>
                      <Text type="secondary">提交后核算</Text>
                    </div>
                    <Button
                      type="primary"
                      block
                      size="large"
                      loading={loading}
                      disabled={!activity || !selectedAddressId}
                      onClick={() => void handleSubmitGroupBuy()}
                      className="btn-checkout-submit"
                    >
                      {groupBuyMode?.kind === 'start' ? '提交拼团并生成支付二维码' : '加入拼团并生成支付二维码'}
                    </Button>
                    <div className="checkout-back-actions">
                      <Button onClick={() => navigate('/group-buy')}>返回拼团专区</Button>
                      <Button onClick={() => navigate('/orders')}>查看订单</Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          ) : !loading ? (
            <Card className="checkout-empty-card">
              <Empty description={message || '拼团活动不存在或已结束。'} />
            </Card>
          ) : null}

          {renderCheckoutResult()}

          {message && !createdInfo ? (
            <Card size="small" className="checkout-message-card">
              <Text>{message}</Text>
            </Card>
          ) : null}
        </Spin>
      </div>
    )
  }

  // ===== Cart checkout render =====
  return (
    <div className="checkout-page">
      <Spin spinning={loading && !checkout}>
        <header className="checkout-header">
          <Title level={3} className="checkout-header-title">
            <ShoppingCartOutlined /> 订单结算
          </Title>
          <Paragraph className="checkout-header-sub">
            选择收货地址、满减、优惠券和积分抵扣后提交订单，将生成支付宝沙箱二维码。
          </Paragraph>
        </header>

        {checkout ? (
          <div className="checkout-layout">
            <div className="checkout-left">
              {/* Address */}
              <Card
                className="checkout-card"
                title={<span className="checkout-card-title"><EnvironmentOutlined /> 收货地址</span>}
              >
                {renderAddressList(checkout.addresses)}
              </Card>

              {/* Items */}
              <Card className="checkout-card" title={<span className="checkout-card-title">商品明细</span>}>
                {checkout.items.length === 0 ? (
                  <Empty description="暂无可结算商品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div className="checkout-item-list">
                    {checkout.items.map((item) => (
                      <div key={item.sku_id} className="checkout-item-card">
                        <div className="checkout-item-info">
                          <div className="checkout-item-name">{item.product_name}</div>
                          <div className="checkout-item-meta">
                            <Tag className="checkout-tag-sku">SKU #{item.sku_id}</Tag>
                            <Tag>{item.sku_name}</Tag>
                          </div>
                          {(item.source_label || item.source_post_id) && (
                            <div className="checkout-item-source">
                              {item.source_label ? (
                                <Tag color="purple">{item.source_label}</Tag>
                              ) : null}
                              {item.source_post_id ? (
                                <Tag color="purple">种草来源 #{item.source_post_id}</Tag>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="checkout-item-right">
                          <Text className="checkout-item-price">￥{yuan(item.price_cent)}</Text>
                          <Text type="secondary" className="checkout-item-qty">x{item.quantity}</Text>
                          <Text className="checkout-item-total price">
                            ￥{yuan(item.price_cent * item.quantity)}
                          </Text>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="checkout-right">
              <div className="checkout-sticky">
                <Card
                  className="checkout-card checkout-summary-card"
                  title={<span className="checkout-card-title">结算明细</span>}
                >
                  {/* Full discount */}
                  <div className="checkout-promo-row">
                    <Text type="secondary">满减活动</Text>
                    <Select
                      allowClear
                      placeholder="选择满减"
                      value={selectedFullDiscountId}
                      onChange={(value: number | undefined) => {
                        setSelectedFullDiscountId(value)
                      }}
                      options={[
                        { value: undefined, label: '不使用满减' },
                        ...checkout.available_full_discounts.map((activity) => ({
                          value: activity.id,
                          disabled: !activity.available,
                          label: `#${activity.id} ${activity.name}｜减 ￥${yuan(activity.discount_amount_cent)}${activity.available ? '' : `｜${activity.unavailable_reason ?? '不可用'}`}`,
                        })),
                      ]}
                      className="checkout-promo-select"
                    />
                  </div>
                  <div className="checkout-promo-row">
                    <Text type="secondary">优惠券</Text>
                    <Select
                      allowClear
                      placeholder="选择优惠券"
                      value={selectedUserCouponId}
                      onChange={(value: number | undefined) => {
                        setSelectedUserCouponId(value)
                      }}
                      options={[
                        { value: undefined, label: '不使用优惠券' },
                        ...checkout.available_coupons.map((coupon) => ({
                          value: coupon.id,
                          disabled: !coupon.available,
                          label: `#${coupon.id} ${coupon.name}｜减 ￥${yuan(coupon.discount_amount_cent)}${coupon.available ? '' : `｜${coupon.unavailable_reason ?? '不可用'}`}`,
                        })),
                      ]}
                      className="checkout-promo-select"
                    />
                  </div>

                  <Divider className="checkout-divider" />

                  <div className="checkout-summary-row">
                    <Text type="secondary">商品总额</Text>
                    <Text>￥{yuan(checkout.total_amount_cent)}</Text>
                  </div>
                  <div className="checkout-summary-row">
                    <Text type="secondary">满减抵扣</Text>
                    <Text className="checkout-deduct">-￥{yuan(checkout.full_discount_amount_cent)}</Text>
                  </div>
                  <div className="checkout-summary-row">
                    <Text type="secondary">优惠券抵扣</Text>
                    <Text className="checkout-deduct">-￥{yuan(checkout.coupon_discount_amount_cent)}</Text>
                  </div>
                  <div className="checkout-summary-row checkout-points-row">
                    <Text type="secondary">积分抵扣</Text>
                    <InputNumber
                      min={0}
                      max={checkout.max_points_usable}
                      precision={0}
                      value={pointsToUse}
                      addonAfter={`最多 ${checkout.max_points_usable}`}
                      onChange={(value) => setPointsToUse(Number(value) || 0)}
                      className="checkout-points-input"
                    />
                  </div>
                  <div className="checkout-summary-row">
                    <Text type="secondary">总抵扣</Text>
                    <Text className="checkout-deduct">-￥{yuan(checkout.discount_amount_cent)}</Text>
                  </div>
                  <Divider className="checkout-divider" />
                  <div className="checkout-summary-row checkout-pay-row">
                    <Text strong>支付宝应付</Text>
                    <Text className="checkout-pay-amount price">
                      ￥{yuan(checkout.pay_amount_cent)}
                    </Text>
                  </div>

                  <Button
                    type="primary"
                    block
                    size="large"
                    disabled={checkout.items.length === 0}
                    loading={loading}
                    onClick={() => void handleSubmitCart()}
                    className="btn-checkout-submit"
                  >
                    提交订单并生成支付宝二维码
                  </Button>
                  <Button
                    onClick={() => void loadCheckout()}
                    loading={loading}
                    block
                    className="checkout-recalc-btn"
                  >
                    重新计算优惠与积分
                  </Button>
                  <Button onClick={() => navigate('/orders')} block>
                    查看订单
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <Card className="checkout-empty-card">
            <Empty description={message || '暂无可结算商品，请先在购物车勾选有效商品。'} />
          </Card>
        )}

        {renderCheckoutResult()}

        {message && !createdInfo ? (
          <Card size="small" className="checkout-message-card">
            <Text>{message}</Text>
          </Card>
        ) : null}
      </Spin>
    </div>
  )
}
