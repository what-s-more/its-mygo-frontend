import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Empty, List, Row, Space, Tag, Typography, message } from 'antd'

import { promotionService, type CouponTemplate, type UserCoupon } from '../../services/promotion'
import { pickErrorMessage, yuan } from '../../utils/format'

const { Title, Text } = Typography

const SCOPE_TEXT: Record<string, string> = {
  all: '全平台',
  platform: '全平台',
  merchant: '指定店铺',
  category: '指定分类',
  product: '指定商品',
  sku: '指定 SKU',
}

const STATUS_TEXT: Record<string, { text: string; color: string }> = {
  active: { text: '可领取', color: 'green' },
  disabled: { text: '已停用', color: 'default' },
  unused: { text: '未使用', color: 'blue' },
  used: { text: '已使用', color: 'default' },
  expired: { text: '已过期', color: 'red' },
  void: { text: '已作废', color: 'default' },
}

function scopeText(scopeType: string, scopeIds: number[]) {
  const label = SCOPE_TEXT[scopeType] ?? scopeType
  if (scopeIds.length === 0) return `${label}（全部）`
  return `${label} [${scopeIds.join(',')}]`
}

function statusTag(status: string) {
  const meta = STATUS_TEXT[status] ?? { text: status, color: 'default' }
  return <Tag color={meta.color}>{meta.text}</Tag>
}

function isTemplateClaimable(template: CouponTemplate) {
  return template.status === 'active' && (template.total_quantity === 0 || template.claimed_quantity < template.total_quantity)
}

export function PromotionPage() {
  const [templates, setTemplates] = useState<CouponTemplate[]>([])
  const [myCoupons, setMyCoupons] = useState<UserCoupon[]>([])
  const [notice, setNotice] = useState('')

  const claimedCountByTemplateId = useMemo(() => {
    const map = new Map<number, number>()
    myCoupons.forEach((coupon) => {
      map.set(coupon.coupon_template_id, (map.get(coupon.coupon_template_id) ?? 0) + 1)
    })
    return map
  }, [myCoupons])

  async function loadTemplates() {
    try {
      const response = await promotionService.listCoupons()
      setTemplates(response.data ?? [])
    } catch (error) {
      message.error(`可领券加载失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  async function loadMyCoupons() {
    try {
      const response = await promotionService.listMyCoupons()
      setMyCoupons(response.data ?? [])
    } catch (error) {
      message.error(`我的优惠券加载失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  useEffect(() => {
    void loadTemplates()
    void loadMyCoupons()
  }, [])

  async function handleClaim(templateId: number) {
    setNotice('')
    try {
      const response = await promotionService.claimCoupon(templateId)
      setNotice(`领取成功，用户券 ID：${response.data.id}`)
      await Promise.all([loadTemplates(), loadMyCoupons()])
    } catch (error) {
      setNotice(`领取失败：${pickErrorMessage(error) ?? '请确认已登录、库存未领完且未超过每人限领'}`)
    }
  }

  return (
    <main className="page-shell">
      <Title level={2}>优惠券中心</Title>

      {notice && (
        <Alert
          style={{ maxWidth: 960, marginBottom: 16 }}
          showIcon
          type="info"
          message={notice}
          onClose={() => setNotice('')}
          closable
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title="可领取优惠券"
            extra={<Button size="small" onClick={loadTemplates}>刷新可领券</Button>}
          >
            {templates.length === 0 ? (
              <Empty description="暂无可领取优惠券" />
            ) : (
              <List
                dataSource={templates}
                renderItem={(template) => {
                  const claimedCount = claimedCountByTemplateId.get(template.id) ?? 0
                  const reachedUserLimit = claimedCount >= template.per_user_limit
                  const claimable = isTemplateClaimable(template) && !reachedUserLimit
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="claim"
                          type={claimable ? 'primary' : 'default'}
                          disabled={!claimable}
                          onClick={() => handleClaim(template.id)}
                        >
                          {reachedUserLimit ? '已领取' : '领取'}
                        </Button>,
                      ]}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="blue">模板 #{template.id}</Tag>
                          <Text strong>{template.name}</Text>
                          {statusTag(template.status)}
                        </Space>
                        <Space wrap size={6}>
                          <Tag>{scopeText(template.scope_type, template.scope_ids)}</Tag>
                          <Text>
                            满 ￥{yuan(template.min_amount_cent)} 减 ￥{yuan(template.discount_value)}
                          </Text>
                        </Space>
                        <Space wrap size={6}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            已领 {template.claimed_quantity}/{template.total_quantity || '不限'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            本账号已领 {claimedCount}/{template.per_user_limit}
                          </Text>
                          {template.valid_from ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              生效 {template.valid_from.slice(0, 10)}
                            </Text>
                          ) : null}
                          {template.valid_to ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              截止 {template.valid_to.slice(0, 10)}
                            </Text>
                          ) : null}
                        </Space>
                      </Space>
                    </List.Item>
                  )
                }}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title="我的优惠券"
            extra={<Button size="small" onClick={loadMyCoupons}>刷新我的券</Button>}
          >
            {myCoupons.length === 0 ? (
              <Empty description="暂无用户券" />
            ) : (
              <List
                dataSource={myCoupons}
                renderItem={(coupon) => (
                  <List.Item>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color="blue">用户券 #{coupon.id}</Tag>
                        <Tag color="purple">模板 #{coupon.coupon_template_id}</Tag>
                        {statusTag(coupon.status)}
                      </Space>
                      <Text strong>{coupon.template.name}</Text>
                      <Space wrap size={6}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          满 ￥{yuan(coupon.template.min_amount_cent)} 减 ￥{yuan(coupon.template.discount_value)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          领取 {coupon.claimed_at.slice(0, 10)}
                        </Text>
                        {coupon.used_at ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            使用 {coupon.used_at.slice(0, 10)}
                          </Text>
                        ) : null}
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </main>
  )
}
