import { Button, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'

const { Title, Text } = Typography

const SESSION = 'platform'

type AdminUserItem = {
  id: number
  mobile: string
  nickname: string
  level: string
  points: number
  is_active: boolean
  created_at: string
}

export function UserAdminPage() {
  const [api, contextHolder] = message.useMessage()
  const [keyword, setKeyword] = useState('')
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(false)

  async function loadUsers() {
    setLoading(true)
    try {
      const response = await http.get<unknown, { data: { list: AdminUserItem[]; total: number } }>('/admin/users', {
        params: { keyword: keyword || undefined },
        headers: { 'X-Admin-Session': SESSION },
      })
      const data = (response as { data: { list: AdminUserItem[] } }).data
      setUsers(data.list)
    } catch {
      api.error('加载用户列表失败')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns: ColumnsType<AdminUserItem> = [
    { title: '用户 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
    { title: '手机号', dataIndex: 'mobile' },
    { title: '昵称', dataIndex: 'nickname' },
    { title: '等级', dataIndex: 'level' },
    { title: '积分', dataIndex: 'points' },
    {
      title: '状态',
      dataIndex: 'is_active',
      render: (active) => (active ? <Tag color="green">启用</Tag> : <Tag color="red">禁用</Tag>),
    },
    { title: '注册时间', dataIndex: 'created_at' },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>用户管理</Title>
          <Text type="secondary">查看用户 ID、手机号、昵称、积分和等级，方便优惠券批量发放与种草积分测试。</Text>
        </div>
      </section>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="手机号或昵称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={loadUsers}
          style={{ width: 240 }}
        />
        <Button type="primary" onClick={loadUsers}>查询</Button>
      </Space>

      <Table
        rowKey="id"
        dataSource={users}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </main>
  )
}
