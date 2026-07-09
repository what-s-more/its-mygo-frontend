import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Rate,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  ShoppingCartOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { orderService, type Order, type Refund } from '../../services/order'
import { uploadService } from '../../services/upload'
import { ProductThumb } from '../../components/ProductThumb'
import { getApiErrorMessage } from '../../services/http'
import { absoluteAssetUrl, yuan, statusText, statusColor } from '../../utils/format'
import { fillMissingProductCovers } from '../../utils/product-cover'

const { Paragraph, Text, Title } = Typography

const ORDER_STATUS_TABS = [
  { value: undefined as string | undefined, label: '全部订单' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'group_pending', label: '待成团' },
  { value: 'pending_shipment', label: '待发货' },
  { value: 'shipping', label: '待收货' },
  { value: 'completed', label: '已完成' },
  { value: 'after_sale', label: '售后中' },
  { value: 'cancelled', label: '已取消' },
  { value: 'closed', label: '已关闭' },
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

async function fillOrderItemCovers(orders: Order[]): Promise<Order[]> {
  const items = orders.flatMap((order) => order.items)
  const filledItems = await fillMissingProductCovers(items)
  const itemMap = new Map(filledItems.map((item) => [item.id, item]))
  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => itemMap.get(item.id) ?? item),
  }))
}

export function OrderPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>()
  const [orderStatusFilter, setOrderStatusFilter] = useState<string | undefined>()
  const [orderPage, setOrderPage] = useState(1)
  const [orderPageSize, setOrderPageSize] = useState(6)
  const [orderTotal, setOrderTotal] = useState(0)
  const [reviewScore, setReviewScore] = useState(5)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewImages, setReviewImages] = useState<string[]>([])
  const [refundQuantity, setRefundQuantity] = useState(1)
  const [refundImages, setRefundImages] = useState<string[]>([])
  const [refundReason, setRefundReason] = useState('')
  const [selectedReviewOrderItemId, setSelectedReviewOrderItemId] = useState<number | undefined>()
  const [selectedRefundOrderItemId, setSelectedRefundOrderItemId] = useState<number | undefined>()
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId])
  const selectedReviewOrderItem = useMemo(
    () => selectedOrder?.items.find((item) => item.id === selectedReviewOrderItemId) ?? selectedOrder?.items[0],
    [selectedOrder, selectedReviewOrderItemId],
  )
  const selectedRefundOrderItem = useMemo(
    () => selectedOrder?.items.find((item) => item.id === selectedRefundOrderItemId) ?? selectedOrder?.items[0],
    [selectedOrder, selectedRefundOrderItemId],
  )

  async function run<T>(title: string, action: () => Promise<{ data: T }>): Promise<T | null> {
    try {
      const response = await action()
      return response.data
    } catch (error) {
      message.error(`${title}失败：${getApiErrorMessage(error)}`)
      return null
    }
  }

  async function loadOrders(nextPage = orderPage, nextPageSize = orderPageSize) {
    setLoading(true)
    try {
      const data = await run('我的订单', () =>
        orderService.listOrders({ status: orderStatusFilter, page: nextPage, page_size: nextPageSize }),
      )
      if (data) {
        const list = await fillOrderItemCovers(data.list ?? [])
        setOrderPage(data.page ?? nextPage)
        setOrderPageSize(data.page_size ?? nextPageSize)
        setOrderTotal(data.total ?? list.length)
        setOrders(list)
        const currentOrder = selectedOrderId ? list.find((order) => order.id === selectedOrderId) : undefined
        if (!currentOrder && list[0]) {
          selectOrderForAction(list[0])
        }
      }
    } finally {
      setLoading(false)
    }
  }

  function selectOrderForAction(order: Order) {
    setSelectedOrderId(order.id)
    setSelectedReviewOrderItemId(order.items[0]?.id)
    setSelectedRefundOrderItemId(order.items[0]?.id)
    setRefundQuantity(1)
  }

  async function confirmOrder(orderId: number) {
    setLoading(true)
    try {
      const data = await run<Order>('确认收货', () => orderService.confirmOrder(orderId))
      if (data) {
        message.success('确认收货成功')
        await loadOrders()
      }
    } finally {
      setLoading(false)
    }
  }

  async function cancelOrder(orderId: number) {
    setLoading(true)
    try {
      const data = await run<Order>('取消订单', () => orderService.cancelOrder(orderId))
      if (data) {
        message.success('订单已取消')
        await loadOrders()
      }
    } finally {
      setLoading(false)
    }
  }

  async function reviewSelectedOrder() {
    if (!selectedOrder || !selectedReviewOrderItem) return
    if (!reviewContent.trim()) {
      message.warning('请先填写评价内容')
      return
    }
    setLoading(true)
    try {
      const data = await run('发表评价', () =>
        orderService.reviewOrder(selectedOrder.id, {
          product_id: selectedReviewOrderItem.product_id,
          score: reviewScore,
          content: reviewContent.trim(),
          image_urls: reviewImages,
        }),
      )
      if (data) {
        message.success('评价已发布')
        setReviewContent('')
        setReviewImages([])
        setReviewModalOpen(false)
      }
    } finally {
      setLoading(false)
    }
  }

  async function refundSelectedOrder() {
    if (!selectedOrder || !selectedRefundOrderItem) return
    if (!refundReason.trim()) {
      message.warning('请填写售后原因')
      return
    }
    setLoading(true)
    try {
      const data = await run<Refund>('申请售后', () =>
        orderService.applyRefund(selectedOrder.id, {
          order_item_id: selectedRefundOrderItem.id,
          quantity: refundQuantity,
          reason_type: 'other',
          reason: refundReason.trim(),
          image_urls: refundImages,
        }),
      )
      if (data) {
        message.success('售后申请已提交')
        setRefundImages([])
        setRefundReason('')
        setRefundModalOpen(false)
        await loadOrders()
      }
    } finally {
      setLoading(false)
    }
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

  useEffect(() => {
    setOrderPage(1)
    void loadOrders(1, orderPageSize)
  }, [orderStatusFilter])

  const reviewItemValue = selectedReviewOrderItemId ?? selectedReviewOrderItem?.id
  const refundItemValue = selectedRefundOrderItemId ?? selectedRefundOrderItem?.id

  return (
    <div className="order-page">
      <Spin spinning={loading}>
        {/* ── Page Header ── */}
        <header className="order-header">
          <Title level={3} className="order-header-title">
            我的订单
          </Title>
          <Paragraph className="order-header-sub">
            查看订单、完成支付、确认收货、评价商品和发起售后
          </Paragraph>
        </header>

        {/* ── Status Tabs ── */}
        <div className="order-tabs">
          {ORDER_STATUS_TABS.map((tab) => (
            <Button
              key={tab.label}
              type={orderStatusFilter === tab.value ? 'primary' : 'default'}
              shape="round"
              size="small"
              className="order-tab-btn"
              onClick={() => setOrderStatusFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* ── Order List ── */}
        <div className="order-list-section">
          {orders.length === 0 && !loading ? (
            <Empty
              description="暂无订单"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '60px 0' }}
            />
          ) : (
            <div className="order-cards">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`order-card ${order.id === selectedOrderId ? 'order-card-selected' : ''}`}
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  {/* Card Header */}
                  <div className="oc-header">
                    <div className="oc-header-left">
                      <div className="oc-merchant">
                        <Avatar
                          size={42}
                          shape="square"
                          src={absoluteAssetUrl(order.merchant_logo_url)}
                          className="oc-merchant-avatar"
                        >
                          {(order.merchant_name || '店铺')[0]}
                        </Avatar>
                        <div className="oc-merchant-info">
                          <Text strong>{order.merchant_name || '未知商家'}</Text>
                          <Text type="secondary" className="oc-order-no">{order.order_no}</Text>
                        </div>
                      </div>
                      {order.order_type === 'grass' ? <Tag color="purple" className="oc-tag-type">{statusText(order.order_type)}</Tag> : order.order_type === 'group_buy' ? <Tag className="oc-tag-type">{statusText(order.order_type)}</Tag> : null}
                      {order.source_post_id && (
                        <Tag color="purple">种草来源</Tag>
                      )}
                    </div>
                    <div className="oc-header-right">
                      <Badge color={statusColor(order.status)} text={<span className="oc-status-text">{statusText(order.status)}</span>} />
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="oc-items">
                    {order.items.map((item) => (
                      <div key={item.id} className="oc-item">
                        <div className="oc-item-cover">
                          <ProductThumb src={item.cover_url} alt={item.product_name} />
                        </div>
                        <div className="oc-item-info">
                          <Text className="oc-item-name">{item.product_name}</Text>
                          <Text type="secondary" className="oc-item-sku">{item.sku_name}</Text>
                        </div>
                        <div className="oc-item-right">
                          <Text className="oc-item-price">¥{yuan(item.unit_price_cent)}</Text>
                          <Text type="secondary" className="oc-item-qty">x{item.quantity}</Text>
                          <Text className="oc-item-total">¥{yuan(item.total_amount_cent)}</Text>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Logistics */}
                  {order.tracking_no && (
                    <div className="oc-logistics">
                      物流：{order.logistics_company || '-'} / {order.tracking_no}
                    </div>
                  )}

                  {/* Footer: Amount + Actions */}
                  <div className="oc-footer">
                    <div className="oc-amount">
                      <span className="oc-amount-label">实付</span>
                      <span className="oc-amount-value">¥{yuan(order.pay_amount_cent)}</span>
                    </div>
                    <div className="oc-actions" onClick={(e) => e.stopPropagation()}>
                      {['shipping', 'pending_receipt'].includes(order.status) && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          className="btn-order-action"
                          onClick={() => void confirmOrder(order.id)}
                        >
                          确认收货
                        </Button>
                      )}
                      {order.status === 'pending_payment' && (
                        <Button
                          danger
                          size="small"
                          icon={<CloseCircleOutlined />}
                          onClick={() => void cancelOrder(order.id)}
                        >
                          取消订单
                        </Button>
                      )}
                      {order.status === 'completed' && (
                        <Button
                          size="small"
                          icon={<StarOutlined />}
                          className="btn-order-action"
                          onClick={() => {
                            selectOrderForAction(order)
                            setReviewModalOpen(true)
                          }}
                        >
                          评价商品
                        </Button>
                      )}
                      {REFUNDABLE_ORDER_STATUS.includes(order.status) && (
                        <Button
                          size="small"
                          icon={<SafetyCertificateOutlined />}
                          className="btn-order-action"
                          onClick={() => {
                            selectOrderForAction(order)
                            setRefundModalOpen(true)
                          }}
                        >
                          申请售后
                        </Button>
                      )}
                      <Button size="small" icon={<FileTextOutlined />} onClick={() => navigate(`/orders/${order.id}`)}>
                        查看详情
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {orderTotal > 0 && (
            <div className="order-pagination">
              <Pagination
                current={orderPage}
                pageSize={orderPageSize}
                total={orderTotal}
                showSizeChanger
                pageSizeOptions={[5, 8, 12, 20]}
                showTotal={(count) => `共 ${count} 个订单`}
                onChange={(nextPage, nextPageSize) => {
                  void loadOrders(nextPage, nextPageSize)
                }}
              />
            </div>
          )}
        </div>

        {/* ── Order action modals ── */}
        {selectedOrder && (
          <div className="order-detail-section">
            {/* Review Modal */}
            <Modal
              title={<span className="od-card-title"><StarOutlined /> 评价商品</span>}
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
                    options={selectedOrder.items.map((item) => ({
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
                  placeholder="说说商品体验…"
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
                  className="btn-order-action"
                >
                  提交评价
                </Button>
              </div>
            </Modal>

            {/* Refund Modal */}
            <Modal
              title={<span className="od-card-title"><SafetyCertificateOutlined /> 申请售后</span>}
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
                    onChange={(value) => setSelectedRefundOrderItemId(value as number)}
                    options={selectedOrder.items.map((item) => ({
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
                  className="btn-order-action"
                >
                  提交售后
                </Button>
              </div>
            </Modal>
          </div>
        )}
      </Spin>
    </div>
  )
}
