import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Modal,
  QRCode,
  Rate,
  Skeleton,
  Select,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  CloseCircleOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
  SendOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
} from '@ant-design/icons'

import { ProductThumb } from '../../components/ProductThumb'
import {
  customerService,
  type CustomerServiceConversation,
  type CustomerServiceMessage,
} from '../../services/customerService'
import { getApiErrorMessage } from '../../services/http'
import { orderService, type Order, type Payment } from '../../services/order'
import { uploadService } from '../../services/upload'
import { absoluteAssetUrl, statusColor, statusText, yuan } from '../../utils/format'
import { fillMissingProductCovers } from '../../utils/product-cover'

const { Paragraph, Text, Title } = Typography

const FLOW_STEPS = [
  { key: 'pending_payment', title: '提交订单' },
  { key: 'paid', title: '完成支付' },
  { key: 'shipping', title: '商家发货' },
  { key: 'completed', title: '确认收货' },
]

const REFUNDABLE_ORDER_STATUS = ['shipping', 'pending_receipt', 'completed']

function imageListToFileList(urls: string[]): UploadFile[] {
  return urls.map((url, index) => ({
    uid: `img-${index}`,
    name: url.split('/').pop() || `图片 ${index + 1}`,
    url: absoluteAssetUrl(url),
    status: 'done',
  }))
}

function removeUploadedImage(items: string[], file: UploadFile) {
  const index = Number(String(file.uid).replace('img-', ''))
  if (Number.isFinite(index)) {
    return items.filter((_, idx) => idx !== index)
  }
  return items.filter((item) => item !== file.url && absoluteAssetUrl(item) !== file.url)
}

function flowIndex(order?: Order | null, payment?: Payment | null) {
  if (!order) return 0
  if (['cancelled', 'closed'].includes(order.status)) return 0
  if (order.status === 'completed') return 3
  if (['shipping', 'pending_receipt'].includes(order.status)) return 2
  if (payment?.status === 'paid' || ['pending_shipment', 'group_pending', 'after_sale'].includes(order.status)) return 1
  return 0
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function formatChatTime(time: string) {
  const date = new Date(time)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatAddress(order: Order) {
  const address = order.shipping_address
  if (!address) return '未保存收货地址'
  return `${address.province}${address.city}${address.district ?? ''}${address.street ?? ''}${address.detail_address}`
}

export function OrderDetailPage() {
  const navigate = useNavigate()
  const { orderId } = useParams()
  const numericOrderId = Number(orderId)

  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [qrCode, setQrCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatTitle, setChatTitle] = useState('客服')
  const [chatSubtitle, setChatSubtitle] = useState('')
  const [chatConversation, setChatConversation] = useState<CustomerServiceConversation | null>(null)
  const [chatMessages, setChatMessages] = useState<CustomerServiceMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [selectedReviewOrderItemId, setSelectedReviewOrderItemId] = useState<number | undefined>()
  const [selectedRefundOrderItemId, setSelectedRefundOrderItemId] = useState<number | undefined>()
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewImages, setReviewImages] = useState<string[]>([])
  const [refundQuantity, setRefundQuantity] = useState(1)
  const [refundReason, setRefundReason] = useState('')
  const [refundImages, setRefundImages] = useState<string[]>([])

  const currentStep = useMemo(() => flowIndex(order, payment), [order, payment])
  const hasDiscount = Boolean(
    order &&
      (order.full_discount_amount_cent > 0 ||
        order.coupon_discount_amount_cent > 0 ||
        order.points_discount_amount_cent > 0),
  )
  const selectedReviewOrderItem = useMemo(
    () => order?.items.find((item) => item.id === selectedReviewOrderItemId) ?? order?.items[0],
    [order, selectedReviewOrderItemId],
  )
  const selectedRefundOrderItem = useMemo(
    () => order?.items.find((item) => item.id === selectedRefundOrderItemId) ?? order?.items[0],
    [order, selectedRefundOrderItemId],
  )
  const reviewItemValue = selectedReviewOrderItemId ?? selectedReviewOrderItem?.id
  const refundItemValue = selectedRefundOrderItemId ?? selectedRefundOrderItem?.id

  async function loadDetail() {
    if (!numericOrderId) return
    setLoading(true)
    try {
      const orderResponse = await orderService.getOrder(numericOrderId)
      const filledItems = await fillMissingProductCovers(orderResponse.data.items ?? [])
      const filledOrder = { ...orderResponse.data, items: filledItems }
      setOrder(filledOrder)
      setSelectedReviewOrderItemId((current) => current ?? filledOrder.items[0]?.id)
      setSelectedRefundOrderItemId((current) => current ?? filledOrder.items[0]?.id)
      const paymentResponse = await orderService.getPayment(filledOrder.payment_id)
      setPayment(paymentResponse.data)
      setQrCode(paymentResponse.data.alipay_qr_code || '')
    } catch (error) {
      message.error(`加载订单详情失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function createAlipayQrCode(force = true) {
    if (!order || paymentLoading) return
    setPaymentLoading(true)
    try {
      const response = await orderService.precreateAlipay(order.payment_id, force)
      setPayment(response.data.payment)
      setQrCode(response.data.qr_code)
      message.success('支付宝二维码已生成')
    } catch (error) {
      message.error(`生成支付宝二维码失败：${getApiErrorMessage(error)}`)
    } finally {
      setPaymentLoading(false)
    }
  }

  async function syncAlipayPayment() {
    if (!order) return
    setPaymentLoading(true)
    try {
      const response = await orderService.syncAlipay(order.payment_id)
      setPayment(response.data)
      setQrCode(response.data.alipay_qr_code || qrCode)
      if (response.data.status === 'paid') {
        message.success('支付成功，订单状态已同步')
        await loadDetail()
      } else {
        message.info('暂未查询到支付成功，请完成扫码支付后再同步')
      }
    } catch (error) {
      message.error(`同步支付宝结果失败：${getApiErrorMessage(error)}`)
    } finally {
      setPaymentLoading(false)
    }
  }

  async function cancelOrder() {
    if (!order) return
    setLoading(true)
    try {
      await orderService.cancelOrder(order.id)
      message.success('订单已取消')
      await loadDetail()
    } catch (error) {
      message.error(`取消订单失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function confirmOrder() {
    if (!order) return
    setLoading(true)
    try {
      await orderService.confirmOrder(order.id)
      message.success('确认收货成功')
      await loadDetail()
    } catch (error) {
      message.error(`确认收货失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function openOrderChat(target: 'merchant' | 'platform') {
    if (!order) return
    if (target === 'merchant' && !order.merchant_id) {
      message.warning('该订单暂未关联商家客服')
      return
    }
    setChatOpen(true)
    setChatLoading(true)
    setChatTitle(target === 'merchant' ? '商家客服' : '平台客服')
    setChatSubtitle(target === 'merchant' ? `订单 ${order.order_no}` : `订单 ${order.order_no}`)
    try {
      const payload =
        target === 'merchant'
          ? { target_type: 'merchant' as const, merchant_id: order.merchant_id, order_id: order.id }
          : { target_type: 'platform' as const, order_id: order.id }
      const conversationResponse = await customerService.createConversation(payload)
      const conversation = conversationResponse.data
      setChatConversation(conversation)
      setChatTitle(target === 'merchant' ? conversation.merchant_name ?? '商家客服' : '平台客服')
      setChatSubtitle(
        [
          conversation.order_no ? `订单 ${conversation.order_no}` : order.order_no,
          conversation.product_name,
        ]
          .filter(Boolean)
          .join(' · '),
      )
      const messagesResponse = await customerService.listMessages(conversation.id, { page_size: 50 })
      setChatMessages(messagesResponse.data.list ?? [])
    } catch (error) {
      message.error(`打开客服会话失败：${getApiErrorMessage(error)}`)
      setChatOpen(false)
    } finally {
      setChatLoading(false)
    }
  }

  async function sendChatMessage() {
    if (!chatConversation) return
    const content = chatInput.trim()
    if (!content) return
    setChatSending(true)
    try {
      const response = await customerService.sendMessage(chatConversation.id, { content })
      setChatMessages((items) => [...items, response.data])
      setChatInput('')
    } catch (error) {
      message.error(`发送消息失败：${getApiErrorMessage(error)}`)
    } finally {
      setChatSending(false)
    }
  }

  async function uploadReviewImage(file: File) {
    try {
      const response = await uploadService.uploadImage(file)
      if (response.data?.url) setReviewImages((items) => [...items, response.data.url])
    } catch (error) {
      message.error(`上传评价图片失败：${getApiErrorMessage(error)}`)
    }
    return false
  }

  async function uploadRefundImage(file: File) {
    try {
      const response = await uploadService.uploadImage(file)
      if (response.data?.url) setRefundImages((items) => [...items, response.data.url])
    } catch (error) {
      message.error(`上传售后凭证失败：${getApiErrorMessage(error)}`)
    }
    return false
  }

  async function reviewSelectedOrder() {
    if (!order || !selectedReviewOrderItem) return
    if (!reviewContent.trim()) {
      message.warning('请先填写评价内容')
      return
    }
    setLoading(true)
    try {
      await orderService.reviewOrder(order.id, {
        product_id: selectedReviewOrderItem.product_id,
        score: reviewScore,
        content: reviewContent.trim(),
        image_urls: reviewImages,
      })
      message.success('评价已发布')
      setReviewContent('')
      setReviewImages([])
      setReviewModalOpen(false)
    } catch (error) {
      message.error(`发表评价失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  async function refundSelectedOrder() {
    if (!order || !selectedRefundOrderItem) return
    if (!refundReason.trim()) {
      message.warning('请填写售后原因')
      return
    }
    setLoading(true)
    try {
      await orderService.applyRefund(order.id, {
        order_item_id: selectedRefundOrderItem.id,
        quantity: refundQuantity,
        reason_type: 'other',
        reason: refundReason.trim(),
        image_urls: refundImages,
      })
      message.success('售后申请已提交')
      setRefundImages([])
      setRefundReason('')
      setRefundQuantity(1)
      setRefundModalOpen(false)
      await loadDetail()
    } catch (error) {
      message.error(`申请售后失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDetail()
  }, [numericOrderId])

  if (!numericOrderId) {
    return <Empty description="订单不存在" />
  }

  return (
    <div className="order-detail-page">
      <Spin spinning={loading}>
        <div className="order-detail-topbar">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')}>
            返回订单列表
          </Button>
          {order ? (
            <Space wrap>
              <Badge color={statusColor(order.status)} text={statusText(order.status)} />
              <Tag>订单 {order.id}</Tag>
              <Tag>支付单 {order.payment_id}</Tag>
            </Space>
          ) : null}
        </div>

        {!order ? (
          <Card className="od2-card">
            <Empty description="未找到订单详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Card>
        ) : (
          <>
            <Card className="od2-card od2-hero">
              <div className="od2-hero-main">
                <Title level={3}>订单详情</Title>
                <Paragraph type="secondary">
                  {order.order_no} · {formatDateTime(order.created_at)}
                </Paragraph>
                <div className="od2-merchant">
                  <Avatar
                    size={48}
                    shape="square"
                    src={absoluteAssetUrl(order.merchant_logo_url)}
                    className="od2-merchant-avatar"
                  >
                    {(order.merchant_name || '店铺')[0]}
                  </Avatar>
                  <div className="od2-merchant-info">
                    <Text strong>{order.merchant_name || '未知商家'}</Text>
                  </div>
                </div>
              </div>
              <div className="od2-hero-actions">
                {order.status === 'pending_payment' ? (
                  <>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      loading={paymentLoading}
                      onClick={() => void createAlipayQrCode(true)}
                    >
                      继续支付
                    </Button>
                    <Button danger icon={<CloseCircleOutlined />} onClick={() => void cancelOrder()}>
                      取消订单
                    </Button>
                  </>
                ) : null}
                {['shipping', 'pending_receipt'].includes(order.status) ? (
                  <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => void confirmOrder()}>
                    确认收货
                  </Button>
                ) : null}
                {order.status === 'completed' ? (
                  <Button icon={<StarOutlined />} onClick={() => setReviewModalOpen(true)}>
                    评价商品
                  </Button>
                ) : null}
                {REFUNDABLE_ORDER_STATUS.includes(order.status) ? (
                  <Button icon={<SafetyCertificateOutlined />} onClick={() => setRefundModalOpen(true)}>
                    申请售后
                  </Button>
                ) : null}
                <Button icon={<ShopOutlined />} onClick={() => void openOrderChat('merchant')}>
                  联系商家客服
                </Button>
                <Button icon={<CustomerServiceOutlined />} onClick={() => void openOrderChat('platform')}>
                  联系平台客服
                </Button>
              </div>
            </Card>

            <Card className="od2-card">
              <Steps
                current={currentStep}
                items={FLOW_STEPS.map((step) => ({
                  title: step.title,
                  description:
                    step.key === 'pending_payment'
                      ? formatDateTime(order.created_at)
                      : step.key === 'paid'
                        ? formatDateTime(payment?.paid_at)
                        : step.key === 'shipping'
                          ? formatDateTime(order.shipped_at)
                          : formatDateTime(order.received_at),
                }))}
              />
            </Card>

            <div className="od2-layout">
              <div className="od2-main">
                <Card className="od2-card" title="商品明细">
                  <div className="od2-items">
                    {order.items.map((item) => (
                      <div key={item.id} className="od2-item">
                        <div className="od2-item-cover">
                          <ProductThumb src={item.cover_url} alt={item.product_name} />
                        </div>
                        <div className="od2-item-info">
                          <Text strong>{item.product_name}</Text>
                          <Text type="secondary">
                            明细 {item.id} · SKU {item.sku_id} · {item.sku_name}
                          </Text>
                        </div>
                        <div className="od2-item-price">
                          <Text>¥{yuan(item.unit_price_cent)}</Text>
                          <Text type="secondary">x{item.quantity}</Text>
                          <Text strong>¥{yuan(item.total_amount_cent)}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="od2-card" title="收货与物流">
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="商家">{order.merchant_name || '未知商家'}</Descriptions.Item>
                    <Descriptions.Item label="收货人">
                      {order.shipping_address
                        ? `${order.shipping_address.receiver_name} ${order.shipping_address.receiver_mobile}`
                        : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="收货地址">{formatAddress(order)}</Descriptions.Item>
                    <Descriptions.Item label="物流信息">
                      {order.tracking_no
                        ? `${order.logistics_company || '物流'} / ${order.tracking_no}`
                        : '商家暂未发货或未填写物流单号'}
                    </Descriptions.Item>
                    <Descriptions.Item label="发货时间">{formatDateTime(order.shipped_at)}</Descriptions.Item>
                    <Descriptions.Item label="收货时间">{formatDateTime(order.received_at)}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </div>

              <div className="od2-side">
                <Card className="od2-card" title="金额与优惠">
                  <div className="od2-price-row">
                    <Text type="secondary">商品总额</Text>
                    <Text>¥{yuan(order.total_amount_cent)}</Text>
                  </div>
                  <div className="od2-price-row">
                    <Text type="secondary">满减优惠</Text>
                    <Text>-¥{yuan(order.full_discount_amount_cent)}</Text>
                  </div>
                  <div className="od2-price-row">
                    <Text type="secondary">优惠券</Text>
                    <Text>-¥{yuan(order.coupon_discount_amount_cent)}</Text>
                  </div>
                  <div className="od2-price-row">
                    <Text type="secondary">积分抵扣</Text>
                    <Text>-¥{yuan(order.points_discount_amount_cent)}</Text>
                  </div>
                  {order.points_used > 0 ? (
                    <Text type="secondary">使用积分 {order.points_used}</Text>
                  ) : null}
                  {!hasDiscount ? <Alert type="info" showIcon message="本订单未使用优惠" /> : null}
                  <div className="od2-pay-total">
                    <Text>实付金额</Text>
                    <span>¥{yuan(order.pay_amount_cent)}</span>
                  </div>
                </Card>

                <Card className="od2-card" title="支付信息">
                  {payment ? (
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="支付单号">{payment.payment_no}</Descriptions.Item>
                        <Descriptions.Item label="支付状态">
                          <Badge color={statusColor(payment.status)} text={statusText(payment.status)} />
                        </Descriptions.Item>
                        <Descriptions.Item label="支付渠道">{payment.channel}</Descriptions.Item>
                        <Descriptions.Item label="支付宝交易号">{payment.alipay_trade_no || '-'}</Descriptions.Item>
                      </Descriptions>
                      {order.status === 'pending_payment' ? (
                        <Spin spinning={paymentLoading} tip="正在生成支付宝二维码">
                          {qrCode ? (
                            <div className="od2-qr-box">
                              <QRCode value={qrCode} size={176} />
                              <Text type="secondary">请使用支付宝沙箱买家账号扫码</Text>
                            </div>
                          ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击继续支付生成二维码" />
                          )}
                          <Space wrap>
                            <Button disabled={paymentLoading} onClick={() => void createAlipayQrCode(true)}>
                              生成/刷新二维码
                            </Button>
                            <Button type="primary" onClick={() => void syncAlipayPayment()}>
                              我已支付，同步结果
                            </Button>
                          </Space>
                        </Spin>
                      ) : null}
                    </Space>
                  ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无支付信息" />
                  )}
                </Card>
              </div>
            </div>

            <Modal
              title={<span><StarOutlined /> 评价商品</span>}
              open={reviewModalOpen}
              onCancel={() => setReviewModalOpen(false)}
              footer={null}
              destroyOnClose
            >
              <div className="od-form">
                <div className="od-form-row">
                  <Text type="secondary" className="od-form-label">评价商品</Text>
                  <Select
                    style={{ width: 320 }}
                    value={reviewItemValue}
                    onChange={(value) => setSelectedReviewOrderItemId(value as number)}
                    options={order.items.map((item) => ({
                      value: item.id,
                      label: `${item.id} ${item.product_name} x${item.quantity}`,
                    }))}
                  />
                </div>
                <div className="od-form-row">
                  <Text type="secondary" className="od-form-label">评分</Text>
                  <Rate value={reviewScore} onChange={setReviewScore} />
                </div>
                <Input.TextArea
                  rows={3}
                  value={reviewContent}
                  onChange={(event) => setReviewContent(event.target.value)}
                  placeholder="说说商品体验..."
                  className="od-textarea"
                />
                <Upload
                  listType="picture-card"
                  beforeUpload={(file) => {
                    void uploadReviewImage(file)
                    return false
                  }}
                  fileList={imageListToFileList(reviewImages)}
                  onRemove={(file) => {
                    setReviewImages((items) => removeUploadedImage(items, file))
                    return true
                  }}
                >
                  {reviewImages.length >= 5 ? null : <div>上传图片</div>}
                </Upload>
                <Button
                  type="primary"
                  loading={loading}
                  disabled={!selectedReviewOrderItem || !reviewContent.trim()}
                  onClick={() => void reviewSelectedOrder()}
                >
                  提交评价
                </Button>
              </div>
            </Modal>

            <Modal
              title={<span><SafetyCertificateOutlined /> 申请售后</span>}
              open={refundModalOpen}
              onCancel={() => setRefundModalOpen(false)}
              footer={null}
              destroyOnClose
            >
              <div className="od-form">
                <div className="od-form-row">
                  <Text type="secondary" className="od-form-label">售后商品</Text>
                  <Select
                    style={{ width: 320 }}
                    value={refundItemValue}
                    onChange={(value) => {
                      setSelectedRefundOrderItemId(value as number)
                      setRefundQuantity(1)
                    }}
                    options={order.items.map((item) => ({
                      value: item.id,
                      label: `${item.id} ${item.product_name} x${item.quantity}`,
                    }))}
                  />
                </div>
                <div className="od-form-row">
                  <Text type="secondary" className="od-form-label">数量</Text>
                  <InputNumber
                    min={1}
                    max={selectedRefundOrderItem?.quantity || 1}
                    value={refundQuantity}
                    onChange={(value) => setRefundQuantity(Number(value) || 1)}
                  />
                </div>
                <Input
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  placeholder="请填写售后原因"
                />
                <Upload
                  listType="picture-card"
                  beforeUpload={(file) => {
                    void uploadRefundImage(file)
                    return false
                  }}
                  fileList={imageListToFileList(refundImages)}
                  onRemove={(file) => {
                    setRefundImages((items) => removeUploadedImage(items, file))
                    return true
                  }}
                >
                  {refundImages.length >= 5 ? null : <div>上传凭证</div>}
                </Upload>
                <Button
                  type="primary"
                  loading={loading}
                  disabled={!selectedRefundOrderItem || !refundReason.trim()}
                  onClick={() => void refundSelectedOrder()}
                >
                  提交售后
                </Button>
              </div>
            </Modal>

            {chatOpen && (
              <div className="detail-chat-panel">
                <div className="detail-chat-header">
                  <div>
                    <Text strong>{chatTitle}</Text>
                    <div className="detail-chat-subtitle">{chatSubtitle || '订单咨询'}</div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => setChatOpen(false)}
                  />
                </div>
                <div className="detail-chat-messages">
                  {chatLoading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                  ) : chatMessages.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="可以直接咨询订单、发货、售后等问题"
                    />
                  ) : (
                    chatMessages.map((item) => {
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
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onPressEnter={() => void sendChatMessage()}
                    placeholder="请输入咨询内容"
                    disabled={!chatConversation || chatLoading}
                  />
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={chatSending}
                    disabled={!chatConversation || !chatInput.trim()}
                    onClick={() => void sendChatMessage()}
                  >
                    发送
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Spin>
    </div>
  )
}
