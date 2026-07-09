import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  QRCode,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message as antdMessage,
} from 'antd'
import {
  EnvironmentOutlined,
  FireOutlined,
  PlusOutlined,
  PhoneOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'

import { addressService, type Address, type AddressPayload } from '../../services/address'
import { authService, type PointsAccount, type UserProfile } from '../../services/auth'
import { getApiErrorMessage } from '../../services/http'
import { groupBuyService, type GroupBuyActivity, type GroupBuyGroup } from '../../services/groupBuy'
import { orderService, type AlipayPrecreateResult, type CheckoutResult, type Payment } from '../../services/order'
import { ProductThumb } from '../../components/ProductThumb'
import { pickErrorMessage, randomToken, statusColor, statusText, yuan } from '../../utils/format'
import { fillMissingProductCovers } from '../../utils/product-cover'
import { REGION_DATA } from '../../utils/region-data'

const { Text, Title, Paragraph } = Typography

type AddressFormValues = {
  receiver_name: string
  receiver_mobile: string
  province: string
  city: string
  district?: string
  street?: string
  detail_address: string
  postal_code?: string
  address_tag?: string
  is_default?: boolean
}

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
  const [createdInfo, setCreatedInfo] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdPaymentId, setCreatedPaymentId] = useState<number | null>(null)
  const [createdOrderIds, setCreatedOrderIds] = useState<number[]>([])
  const [paymentDetail, setPaymentDetail] = useState<Payment | null>(null)
  const [alipayQrCode, setAlipayQrCode] = useState('')
  const [alipayLoading, setAlipayLoading] = useState(false)

  // ===== New Address Modal =====
  const [addrModalOpen, setAddrModalOpen] = useState(false)
  const [addrForm] = Form.useForm<AddressFormValues>()
  const [addrSubmitting, setAddrSubmitting] = useState(false)
  const [addrProvince, setAddrProvince] = useState<string>('')
  const [addrCity, setAddrCity] = useState<string>('')

  const isGroupBuyMode = groupBuyMode !== null
  const availablePoints = pointsAccount?.points ?? profile?.points ?? 0
  const groupPointCap = Math.max(0, availablePoints)
  const groupTotalCent = activity ? activity.group_price_cent * groupQuantity : 0

  async function prepareAlipayPayment(paymentId: number, orderIds: number[]) {
    setCreatedPaymentId(paymentId)
    setCreatedOrderIds(orderIds)
    setAlipayLoading(true)
    setAlipayQrCode('')
    try {
      const response = await orderService.precreateAlipay(paymentId, true)
      const data = response.data as AlipayPrecreateResult
      setPaymentDetail(data.payment)
      setAlipayQrCode(data.qr_code)
      setCreatedInfo(`订单已提交，请使用支付宝App扫码完成支付。`)
    } catch (error) {
      setMessage(`支付宝二维码生成失败：${pickErrorMessage(error) ?? getApiErrorMessage(error)}`)
    } finally {
      setAlipayLoading(false)
    }
  }

  async function syncCreatedPayment() {
    if (!createdPaymentId) return
    setLoading(true)
    try {
      const response = await orderService.syncAlipay(createdPaymentId)
      setPaymentDetail(response.data)
      setAlipayQrCode(response.data.alipay_qr_code || alipayQrCode)
      if (response.data.status === 'paid') {
        antdMessage.success('支付成功，订单状态已同步')
        window.setTimeout(() => navigate('/orders'), 800)
      } else {
        antdMessage.info('暂未查询到支付成功，请完成扫码支付后再同步')
      }
    } catch (error) {
      setMessage(`同步支付结果失败：${pickErrorMessage(error) ?? getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

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
      const nextCheckout = {
        ...response.data,
        items: await fillMissingProductCovers(response.data.items ?? []),
      }
      setCheckout(nextCheckout)
      setSelectedFullDiscountId(nextCheckout.selected_full_discount_id ?? undefined)
      setSelectedUserCouponId(nextCheckout.selected_coupon_id ?? undefined)
      if (selectedAddressId === null) {
        const defaultAddress = nextCheckout.addresses.find((address) => address.is_default)
        setSelectedAddressId(defaultAddress?.id ?? nextCheckout.addresses[0]?.id ?? null)
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
          setMessage(`未找到拼团活动 ${groupBuyMode.activityId}`)
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
          setMessage(`未找到拼团 ${groupBuyMode.groupId}，可能已成团或失效`)
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

  // 动态计算：满减/优惠券/积分变化时自动重新计算
  useEffect(() => {
    if (checkout && !isGroupBuyMode) {
      const timer = setTimeout(() => void loadCheckout(), 300)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFullDiscountId, selectedUserCouponId, pointsToUse])

  async function handleSubmitCart() {
    if (!checkout || checkout.items.length === 0) {
      setMessage('暂无可结算商品，请先在购物车勾选有效商品')
      return
    }
    setMessage('')
    setLoading(true)
    try {
      const sourcePostId = checkout.items.find((item) => item.source_post_id)?.source_post_id
      const response = await orderService.createOrder({
        client_order_token: randomToken('order'),
        shipping_address_id: selectedAddressId,
        full_discount_id: selectedFullDiscountId ?? null,
        coupon_id: selectedUserCouponId ?? null,
        points_used: pointsToUse,
        source_post_id: sourcePostId ?? undefined,
      })
      const result = response.data
      await prepareAlipayPayment(result.payment_id, result.order_ids)
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
    setLoading(true)
    try {
      const safePoints = Math.min(Math.max(0, pointsToUse), groupPointCap)
      let result
      if (groupBuyMode?.kind === 'start') {
        const response = await groupBuyService.startGroup({
          activity_id: activity.id,
          quantity: groupQuantity,
          shipping_address_id: selectedAddressId,
          points_used: safePoints,
          client_order_token: randomToken('group_start'),
        })
        result = response.data.order
      } else {
        const response = await groupBuyService.joinGroup({
          group_id: group!.id,
          quantity: groupQuantity,
          shipping_address_id: selectedAddressId,
          points_used: safePoints,
          client_order_token: randomToken('group_join'),
        })
        result = response.data.order
      }
      await prepareAlipayPayment(result.payment_id, result.order_ids)
    } catch (error) {
      setMessage(`拼团提交失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  // ===== New Address handlers =====
  function openAddrModal() {
    addrForm.resetFields()
    addrForm.setFieldValue('is_default', true)
    setAddrProvince('')
    setAddrCity('')
    setAddrModalOpen(true)
  }

  function closeAddrModal() {
    setAddrModalOpen(false)
    addrForm.resetFields()
  }

  async function handleAddrSubmit() {
    let values: AddressFormValues
    try {
      values = await addrForm.validateFields()
    } catch {
      return
    }
    setAddrSubmitting(true)
    const payload: AddressPayload = {
      receiver_name: values.receiver_name,
      receiver_mobile: values.receiver_mobile,
      province: values.province,
      city: values.city,
      district: values.district || null,
      street: values.street || null,
      detail_address: values.detail_address,
      postal_code: values.postal_code || null,
      address_tag: values.address_tag || null,
      is_default: values.is_default ?? true,
    }
    try {
      const response = await addressService.createAddress(payload)
      const newAddressId = response.data?.id
      closeAddrModal()
      // Refresh addresses and auto-select the new one
      if (isGroupBuyMode) {
        const addressRes = await addressService.listAddresses()
        const addressList = addressRes.data ?? []
        setAddresses(addressList)
        if (newAddressId) setSelectedAddressId(newAddressId)
      } else {
        await loadCheckout()
        if (newAddressId) setSelectedAddressId(newAddressId)
      }
    } catch (error) {
      antdMessage.error(`保存地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setAddrSubmitting(false)
    }
  }

  // ===== Shared render helpers =====
  function renderAddressList(addressList: Address[]) {
    if (addressList.length === 0) {
      return (
        <div className="checkout-empty-block">
          <Text type="secondary">暂无收货地址，</Text>
          <Button type="link" size="small" icon={<PlusOutlined />} onClick={openAddrModal} style={{ padding: 0 }}>
            新增收货地址
          </Button>
        </div>
      )
    }
    return (
      <>
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
      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        onClick={openAddrModal}
        style={{ marginTop: 12 }}
      >
        新增收货地址
      </Button>
      </>
    )
  }

  function renderPaymentCard() {
    if (!createdPaymentId) return null
    return (
      <Card className="checkout-card checkout-payment-card" title="支付宝支付">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type={paymentDetail?.status === 'paid' ? 'success' : 'info'}
            showIcon
            message={paymentDetail?.status === 'paid' ? '支付已完成' : '请扫码完成支付'}
            description={createdInfo || '订单已提交，二维码生成期间请不要重复刷新页面。'}
          />
          <div className="checkout-payment-meta">
            <Text type="secondary">支付单 {createdPaymentId}</Text>
            <Text type="secondary">订单 {createdOrderIds.map((id) => `${id}`).join('、')}</Text>
            {paymentDetail ? <Tag color={statusColor(paymentDetail.status)}>{statusText(paymentDetail.status)}</Tag> : null}
          </div>
          <Spin spinning={alipayLoading} tip="正在生成支付宝二维码">
            {alipayQrCode ? (
              <div className="checkout-qrcode-box">
                <QRCode value={alipayQrCode} size={192} />
                <Text type="secondary">请使用支付宝沙箱买家账号扫码</Text>
              </div>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={alipayLoading ? '正在生成二维码' : '二维码暂不可用'} />
            )}
          </Spin>
          <Space wrap>
            <Button disabled={!createdPaymentId || alipayLoading} onClick={() => void prepareAlipayPayment(createdPaymentId, createdOrderIds)}>
              重新生成二维码
            </Button>
            <Button type="primary" disabled={!createdPaymentId} loading={loading} onClick={() => void syncCreatedPayment()}>
              我已支付，同步结果
            </Button>
            <Button onClick={() => navigate('/orders')}>查看订单</Button>
          </Space>
        </Space>
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
              选择收货地址、购买件数和积分抵扣后提交。拼团不叠加满减或优惠券。
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
                    <Tag className="gb-tag-group-size">
                      <TeamOutlined /> {activity.group_size} 人团
                    </Tag>
                    <Tag color={statusColor(activity.status)}>{statusText(activity.status)}</Tag>
                    {group ? (
                      <Tag className="gb-tag-group-id">
                        {group.joined_count}/{group.group_size} 人
                      </Tag>
                    ) : null}
                  </div>
                  <div className="checkout-gb-name">{activity.name}</div>
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
                  {renderPaymentCard()}
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
                    disabled={!activity || !selectedAddressId || !!createdPaymentId}
                    onClick={() => void handleSubmitGroupBuy()}
                    className="btn-checkout-submit"
                  >
                      {createdPaymentId ? '订单已提交' : '提交并支付'}
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
            选择收货地址、满减、优惠券和积分抵扣后提交订单。
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
                        <div className="checkout-item-cover">
                          <ProductThumb src={item.cover_url} alt={item.product_name} />
                        </div>
                        <div className="checkout-item-info">
                          <div className="checkout-item-name">{item.product_name}</div>
                          <div className="checkout-item-meta">
                            <Tag>{item.sku_name}</Tag>
                          </div>
                          {(item.source_label || item.source_post_id) && (
                            <div className="checkout-item-source">
                              {item.source_label ? (
                                <Tag color="purple">{item.source_label}</Tag>
                              ) : null}
                              {item.source_post_id ? (
                                <Tag color="purple">种草来源</Tag>
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
                {renderPaymentCard()}
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
                          label: `${activity.id} ${activity.name}｜减 ￥${yuan(activity.discount_amount_cent)}${activity.available ? '' : `｜${activity.unavailable_reason ?? '不可用'}`}`,
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
                          label: `${coupon.id} ${coupon.name}｜减 ￥${yuan(coupon.discount_amount_cent)}${coupon.available ? '' : `｜${coupon.unavailable_reason ?? '不可用'}`}`,
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
                    disabled={checkout.items.length === 0 || !!createdPaymentId}
                    loading={loading}
                    onClick={() => void handleSubmitCart()}
                    className="btn-checkout-submit"
                  >
                    {createdPaymentId ? '订单已提交' : '提交并支付'}
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

        {message && !createdInfo ? (
          <Card size="small" className="checkout-message-card">
            <Text>{message}</Text>
          </Card>
        ) : null}
      </Spin>

      {/* ── New Address Modal ── */}
      <Modal
        open={addrModalOpen}
        title="新增收货地址"
        onCancel={closeAddrModal}
        width={640}
        footer={[
          <Button key="cancel" onClick={closeAddrModal}>取消</Button>,
          <Button key="submit" type="primary" loading={addrSubmitting} onClick={() => void handleAddrSubmit()}>
            保存地址
          </Button>,
        ]}
      >
        <Form form={addrForm} layout="vertical">
          <Form.Item name="receiver_name" label="收货人" rules={[{ required: true, message: '请输入收货人姓名' }]}>
            <Input placeholder="收货人姓名" prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="receiver_mobile" label="手机号" rules={[{ required: true, message: '请输入收货人手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' }]}>
            <Input placeholder="收货人手机号" prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="province" label="省" rules={[{ required: true, message: '请选择省' }]}>
            <Select
              showSearch
              placeholder="请选择省"
              optionFilterProp="label"
              onChange={(value: string) => {
                setAddrProvince(value)
                setAddrCity('')
                addrForm.setFieldValue('city', undefined)
                addrForm.setFieldValue('district', undefined)
              }}
              options={REGION_DATA.map((p) => ({ value: p.value, label: p.label }))}
            />
          </Form.Item>
          <Form.Item name="city" label="市" rules={[{ required: true, message: '请选择市' }]}>
            <Select
              showSearch
              placeholder="请选择市"
              optionFilterProp="label"
              disabled={!addrProvince}
              onChange={(value: string) => {
                setAddrCity(value)
                addrForm.setFieldValue('district', undefined)
              }}
              options={REGION_DATA.find((p) => p.value === addrProvince)?.children?.map((c) => ({ value: c.value, label: c.label })) ?? []}
            />
          </Form.Item>
          <Form.Item name="district" label="区县">
            <Select
              showSearch
              placeholder="请选择区县"
              optionFilterProp="label"
              disabled={!addrCity}
              options={REGION_DATA.find((p) => p.value === addrProvince)?.children?.find((c) => c.value === addrCity)?.children?.map((d) => ({ value: d.value, label: d.label })) ?? []}
            />
          </Form.Item>
          <Form.Item name="street" label="街道">
            <Input placeholder="街道/乡镇" />
          </Form.Item>
          <Form.Item name="detail_address" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
            <Input.TextArea placeholder="楼栋、门牌等详细地址" autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="postal_code" label="邮政编码">
            <Input placeholder="邮政编码" />
          </Form.Item>
          <Form.Item name="address_tag" label="地址标签">
            <Input placeholder="例如：家、公司" />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Switch checkedChildren="设为默认地址" unCheckedChildren="非默认" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
