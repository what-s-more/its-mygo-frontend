import { useEffect, useState } from 'react'

import { adminOrderService, type Refund } from '../../services/order'

export function OrderAdminPage() {
  const [orderId, setOrderId] = useState('')
  const [logisticsCompany, setLogisticsCompany] = useState('SF Express')
  const [trackingNo, setTrackingNo] = useState('')
  const [reviewId, setReviewId] = useState('')
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [message, setMessage] = useState('')

  async function loadRefunds() {
    const response = await adminOrderService.listRefunds()
    setRefunds(response.data.list)
  }

  useEffect(() => {
    loadRefunds().catch(() => setRefunds([]))
  }, [])

  async function handleShip() {
    setMessage('')
    try {
      await adminOrderService.shipOrder(Number(orderId), {
        logistics_company: logisticsCompany,
        tracking_no: trackingNo,
      })
      setMessage('订单已发货')
    } catch {
      setMessage('发货失败，请检查订单状态')
    }
  }

  async function handleAuditReview(approved: boolean) {
    setMessage('')
    try {
      const response = await adminOrderService.auditReview(Number(reviewId), approved)
      setMessage(`评价已${approved ? '通过' : '拒绝'}，评价ID：${response.data.id}，状态：${response.data.status}`)
    } catch {
      setMessage('评价审核失败，请检查评价ID和管理员登录状态')
    }
  }

  async function handleApprove(refundId: number) {
    setMessage('')
    try {
      await adminOrderService.approveRefund(refundId)
      await loadRefunds()
      setMessage(`售后 ${refundId} 已同意`)
    } catch {
      setMessage('同意售后失败')
    }
  }

  async function handleReject(refundId: number) {
    setMessage('')
    try {
      await adminOrderService.rejectRefund(refundId)
      await loadRefunds()
      setMessage(`售后 ${refundId} 已驳回`)
    } catch {
      setMessage('驳回售后失败')
    }
  }

  async function handleReceive(refundId: number) {
    setMessage('')
    try {
      await adminOrderService.receiveRefund(refundId)
      await loadRefunds()
      setMessage(`售后 ${refundId} 已确认收到退货`)
    } catch {
      setMessage('确认收到退货失败')
    }
  }

  async function handleFinish(refundId: number) {
    setMessage('')
    try {
      await adminOrderService.finishRefund(refundId)
      await loadRefunds()
      setMessage(`售后 ${refundId} 已退款完成`)
    } catch {
      setMessage('退款完成失败')
    }
  }

  return (
    <main>
      <h1>订单与售后</h1>
      <section>
        <h2>快速发货</h2>
        <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="订单 ID" />
        <input
          value={logisticsCompany}
          onChange={(event) => setLogisticsCompany(event.target.value)}
          placeholder="物流公司"
        />
        <input value={trackingNo} onChange={(event) => setTrackingNo(event.target.value)} placeholder="物流单号" />
        <button type="button" onClick={handleShip}>
          发货
        </button>
      </section>
      <section>
        <h2>评价审核</h2>
        <input value={reviewId} onChange={(event) => setReviewId(event.target.value)} placeholder="评价 ID" />
        <button type="button" onClick={() => handleAuditReview(true)}>
          审核通过
        </button>
        <button type="button" onClick={() => handleAuditReview(false)}>
          审核拒绝
        </button>
        <p>评价ID可在用户端订单页点击“默认好评”后获得。</p>
      </section>
      <section>
        <h2>售后列表</h2>
        <button type="button" onClick={() => loadRefunds().catch(() => setMessage('刷新售后失败'))}>
          刷新售后
        </button>
        {refunds.length > 0 ? (
          <ul>
            {refunds.map((refund) => (
              <li key={refund.id}>
                #{refund.id} 订单 {refund.order_id} 明细 {refund.order_item_id ?? '无'} 商品 {refund.product_id ?? '无'} SKU {refund.sku_id ?? '无'} 数量 {refund.quantity} - {refund.status} - {refund.reason_type} - ￥
                {(refund.refund_amount_cent / 100).toFixed(2)} - {refund.reason}
                <button type="button" onClick={() => handleApprove(refund.id)}>
                  同意
                </button>
                <button type="button" onClick={() => handleReject(refund.id)}>
                  驳回
                </button>
                <button type="button" onClick={() => handleReceive(refund.id)}>
                  确认收到退货
                </button>
                <button type="button" onClick={() => handleFinish(refund.id)}>
                  退款完成
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无售后</p>
        )}
      </section>
      {message && <p>{message}</p>}
    </main>
  )
}
