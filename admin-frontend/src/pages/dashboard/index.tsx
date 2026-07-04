import { useEffect, useState } from 'react'

import { adminAuthService, type AdminProfile } from '../../services/auth'

export function DashboardPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    adminAuthService.me().then((response) => setProfile(response.data)).catch(() => setProfile(null))
  }, [])

  return (
    <main>
      <h1>数据看板</h1>
      {profile ? <p>当前管理员：{profile.real_name}</p> : <p>请先登录管理端</p>}
      <section>
        <h2>测试步骤</h2>
        <ol>
          <li>先登录管理端。</li>
          <li>进入商品管理，创建并上架测试商品。</li>
          <li>去用户端注册/登录，加入购物车并下单支付。</li>
          <li>回到订单售后页，输入用户订单ID进行发货。</li>
          <li>用户端确认收货、评价或申请售后。</li>
          <li>管理端用评价ID审核评价，或处理售后ID。</li>
        </ol>
      </section>
      <p>占位：真实经营数据图表后续补充。</p>
    </main>
  )
}
