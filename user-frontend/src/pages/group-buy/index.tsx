import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Empty,
  Image,
  List,
  Skeleton,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { FireOutlined, TeamOutlined, ShoppingOutlined } from '@ant-design/icons'

import { getApiErrorMessage } from '../../services/http'
import { groupBuyService, type GroupBuyActivity } from '../../services/groupBuy'
import { absoluteAssetUrl, statusColor, statusText, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

export function GroupBuyPage() {
  const navigate = useNavigate()
  const [api, contextHolder] = message.useMessage()
  const [activities, setActivities] = useState<GroupBuyActivity[]>([])
  const [loading, setLoading] = useState(false)

  async function loadGroupBuyActivities() {
    setLoading(true)
    try {
      const response = await groupBuyService.listActivities()
      setActivities(response.data ?? [])
    } catch (error) {
      api.error(`加载拼团活动失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGroupBuyActivities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="gb-page">
      {contextHolder}
      <Spin spinning={loading}>
        {/* ── Page Header ── */}
        <header className="gb-header">
          <Title level={3} className="gb-header-title">
            <FireOutlined /> 拼团专区
          </Title>
          <Paragraph className="gb-header-sub">
            邀请好友一起拼，专享超低拼团价
          </Paragraph>
        </header>

        {/* ── Notice ── */}
        <div className="gb-notice">
          <Text type="secondary">
            点击「发起拼团」或「加入此团」后，将跳转到结算页选择收货地址、购买件数与积分抵扣，并完成支付宝沙箱支付。拼团不叠加满减或优惠券，不参与种草奖励；首位用户支付后团有效期 24 小时。
          </Text>
        </div>

        {/* ── Activity Grid ── */}
        <div className="gb-section">
          <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
            {activities.length === 0 ? (
              <Empty
                description="暂无可用拼团活动，请商家先在商家端创建"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '60px 0' }}
              />
            ) : (
              <div className="gb-activity-grid">
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="gb-activity-card"
                    onClick={() => navigate(`/products/${activity.product_id}?group_buy_activity_id=${activity.id}`)}
                  >
                    {/* Card Header: Product Image + Info */}
                    <div className="gb-ac-top">
                      <div className="gb-ac-image">
                        {activity.product?.cover_url ? (
                          <Image
                            preview={false}
                            src={absoluteAssetUrl(activity.product.cover_url)}
                            className="gb-ac-img"
                          />
                        ) : (
                          <div className="gb-ac-img-placeholder">
                            <ShoppingOutlined />
                          </div>
                        )}
                      </div>
                      <div className="gb-ac-info">
                        <div className="gb-ac-tags">
                          <Tag className="gb-tag-group-size"><TeamOutlined /> {activity.group_size} 人团</Tag>
                          <Tag color={statusColor(activity.status)}>{statusText(activity.status)}</Tag>
                        </div>
                        <Text strong ellipsis className="gb-ac-name" title={activity.name}>
                          {activity.name}
                        </Text>
                        {activity.product?.name ? (
                          <Text type="secondary" ellipsis className="gb-ac-product-name">
                            {activity.product.name}
                          </Text>
                        ) : null}
                      </div>
                    </div>

                    {/* Price Row */}
                    <div className="gb-ac-price-row">
                      <span className="gb-ac-group-price">¥{yuan(activity.group_price_cent)}</span>
                      <span className="gb-ac-unit">/ 件</span>
                      <span className="gb-ac-total">拼团单价</span>
                    </div>

                    {/* Expire Time */}
                    {activity.valid_to && (
                      <div className="gb-ac-deadline">
                        截止：{new Date(activity.valid_to).toLocaleString()}
                      </div>
                    )}

                    {/* Start Group Button → 跳转结算页 */}
                    <Button
                      type="primary"
                      block
                      className="btn-gb-start"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/checkout?group_buy=${activity.id}`)
                      }}
                    >
                      <FireOutlined /> 发起拼团
                    </Button>

                    {/* Active Groups */}
                    {activity.active_groups.length > 0 && (
                      <div className="gb-ac-groups">
                        <div className="gb-ac-groups-title">
                          <TeamOutlined /> 正在拼的团
                        </div>
                        <List
                          size="small"
                          dataSource={activity.active_groups}
                          renderItem={(group) => (
                            <List.Item className="gb-group-item">
                              <div className="gb-group-row">
                                <div className="gb-group-left">
                                  <Tag className="gb-tag-group-id">已加入</Tag>
                                  <span className="gb-group-count">
                                    {group.joined_count}/{group.group_size} 人
                                  </span>
                                  <Badge
                                    status={
                                      group.status === 'success'
                                        ? 'success'
                                        : group.status === 'failed' || group.status === 'expired'
                                          ? 'error'
                                          : 'processing'
                                    }
                                    text={statusText(group.status)}
                                  />
                                </div>
                                <div className="gb-group-right">
                                  <span className="gb-group-expire">
                                    {new Date(group.expire_at).toLocaleString()}
                                  </span>
                                  <Button
                                    size="small"
                                    type="primary"
                                    className="btn-gb-join"
                                    disabled={group.joined_count >= group.group_size}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/checkout?group_join=${group.id}`)
                                    }}
                                  >
                                    加入此团
                                  </Button>
                                </div>
                              </div>
                            </List.Item>
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Skeleton>
        </div>
      </Spin>
    </div>
  )
}
