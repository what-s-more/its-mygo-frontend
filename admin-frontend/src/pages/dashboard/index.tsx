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
    </main>
  )
}
