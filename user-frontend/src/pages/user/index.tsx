import { useEffect, useState } from 'react'

import { authService, type UserProfile } from '../../services/auth'

export function UserCenterPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    authService.profile().then((response) => setProfile(response.data)).catch(() => setProfile(null))
  }, [])

  return (
    <main>
      <h1>个人中心</h1>
      {profile ? (
        <dl>
          <dt>昵称</dt>
          <dd>{profile.nickname}</dd>
          <dt>会员等级</dt>
          <dd>{profile.level}</dd>
          <dt>积分</dt>
          <dd>{profile.points}</dd>
        </dl>
      ) : (
        <p>请先登录</p>
      )}
    </main>
  )
}
