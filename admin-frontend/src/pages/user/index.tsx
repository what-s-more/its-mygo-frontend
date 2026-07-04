import { useEffect, useState } from 'react'

import { adminUserService, type AdminUserItem } from '../../services/user'

export function UserAdminPage() {
  const [keyword, setKeyword] = useState('')
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [message, setMessage] = useState('')

  async function loadUsers() {
    const response = await adminUserService.listUsers(keyword || undefined)
    setUsers(response.data.list)
  }

  useEffect(() => {
    loadUsers().catch(() => setUsers([]))
  }, [])

  return (
    <main>
      <h1>用户列表</h1>
      <p>用于查看用户 ID、手机号、昵称和积分，方便优惠券批量发放与种草积分测试。</p>
      <label>
        关键词
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="手机号或昵称" />
      </label>
      <button type="button" onClick={() => loadUsers().catch(() => setMessage('查询失败'))}>
        查询
      </button>
      {users.length > 0 ? (
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              #{user.id} {user.mobile} - {user.nickname} - 等级 {user.level} - 积分 {user.points} -{' '}
              {user.is_active ? '启用' : '禁用'}
            </li>
          ))}
        </ul>
      ) : (
        <p>暂无用户</p>
      )}
      {message && <p>{message}</p>}
    </main>
  )
}
