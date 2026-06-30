import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Card, Descriptions, Empty, Space, Typography } from 'antd'
import { authService, type UserProfile } from '../../services/auth'
import { DataPanel, type ApiResult } from '../../components/DataPanel'

export function UserCenterPage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [lastResult, setLastResult] = useState<ApiResult | null>(null)

  async function loadProfile() {
    try {
      const r = await authService.profile()
      setProfile(r.data)
      setLastResult({ title: '用户信息', ok: true, data: r.data })
    } catch (e) {
      setLastResult({ title: '用户信息', ok: false, data: e })
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  return (
    <div className="shop-page">
      <Card title="个人中心" extra={<Button onClick={() => void loadProfile()}>刷新</Button>}>
        {profile ? (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="昵称">{profile.nickname}</Descriptions.Item>
            <Descriptions.Item label="手机号">{profile.mobile}</Descriptions.Item>
            <Descriptions.Item label="会员等级">{profile.level}</Descriptions.Item>
            <Descriptions.Item label="积分">{profile.points}</Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="请先登录" />
        )}
      </Card>

      <Card title="我的服务" style={{ marginTop: 24 }}>
        <Space wrap>
          <Button type="primary" onClick={() => navigate('/addresses')}>收货地址</Button>
          <Button onClick={() => navigate('/orders')}>我的订单</Button>
          <Button onClick={() => navigate('/promotions')}>我的优惠券</Button>
        </Space>
      </Card>

      <DataPanel result={lastResult} />
    </div>
  )
}
