import { useEffect, useState } from 'react'
import { App, Button, Card, Col, List, Row, Space, Tag, Typography } from 'antd'
import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'
import { DataPanel, type ApiResult } from '../../components/DataPanel'

const { Text } = Typography

function yuan(v?: number | null) {
  return ((v ?? 0) / 100).toFixed(2)
}

const couponStatusMap: Record<string, { label: string; color: string }> = {
  active: { label: '可用', color: 'green' },
  used: { label: '已使用', color: 'default' },
  expired: { label: '已过期', color: 'red' },
}

export function PromotionPage() {
  const { message } = App.useApp()
  const [templates, setTemplates] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [lastResult, setLastResult] = useState<ApiResult | null>(null)

  async function loadTemplates() {
    try {
      const r = await promotionService.listCoupons()
      setTemplates(r.data)
      setLastResult({ title: '可领优惠券', ok: true, data: r.data })
    } catch (e) {
      setLastResult({ title: '可领优惠券', ok: false, data: e })
    }
  }

  async function loadMyCoupons() {
    try {
      const r = await promotionService.listMyCoupons()
      setMyCoupons(r.data)
      setLastResult({ title: '我的优惠券', ok: true, data: r.data })
    } catch (e) {
      setLastResult({ title: '我的优惠券', ok: false, data: e })
    }
  }

  useEffect(() => {
    void loadTemplates()
    void loadMyCoupons()
  }, [])

  async function claimCoupon(templateId: number) {
    try {
      await promotionService.claimCoupon(templateId)
      message.success('领取成功')
      await loadMyCoupons()
    } catch (e) {
      setLastResult({ title: '领取优惠券', ok: false, data: e })
      message.error('领取失败，请确认已登录、库存未领完且未超过每人限制')
    }
  }

  return (
    <div className="shop-page">
      <Row gutter={[24, 24]} className="promotion-row">
        <Col xs={24} lg={12} className="promotion-col">
          <Card title="可领优惠券" extra={<Button onClick={() => void loadTemplates()}>刷新</Button>} className="promotion-card">
            <List
              style={{ minHeight: 360 }}
              dataSource={templates}
              renderItem={(t) => (
                <List.Item
                  extra={<Button type="primary" size="small" onClick={() => void claimCoupon(t.id)}>领取</Button>}
                >
                  <List.Item.Meta
                    title={<Space><Text strong>{t.name}</Text><Tag color="blue">模板 #{t.id}</Tag></Space>}
                    description={
                      <Space direction="vertical" size={2}>
                        <Text>满 ￥{yuan(t.min_amount_cent)} 减 ￥{yuan(t.discount_value)}</Text>
                        <Text type="secondary">适用：{t.scope_type} [{t.scope_ids.join(',') || '全部'}]</Text>
                        <Text type="secondary">已领 {t.claimed_quantity}/{t.total_quantity || '不限'}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12} className="promotion-col">
          <Card title="我的优惠券" extra={<Button onClick={() => void loadMyCoupons()}>刷新</Button>} className="promotion-card">
            <List
              style={{ minHeight: 360 }}
              dataSource={myCoupons}
              renderItem={(c) => {
                const st = couponStatusMap[c.status] ?? { label: c.status, color: 'default' }
                return (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space><Text strong>{c.template.name}</Text><Tag color="blue">券 #{c.id}</Tag><Tag color={st.color}>{st.label}</Tag></Space>}
                      description={<Text type="secondary">模板 #{c.template.id}</Text>}
                    />
                  </List.Item>
                )
              }}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>下单抵扣：在结算页选择优惠券即可。</Text>
          </Card>
        </Col>
      </Row>

      <DataPanel result={lastResult} />
    </div>
  )
}
