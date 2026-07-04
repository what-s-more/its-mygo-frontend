import {
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Image,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import {
  DebugLogs,
  StatusTag,
  formatError,
  pickData,
  type ApiLog,
  ids,
  statusText,
  yuan,
} from '../workbench/adminShared'
import {
  SESSION,
  type Comment,
  type PageResult,
  type Post,
  type Product,
  assetUrl,
  pageList,
} from './shared'

const { Title, Paragraph, Text } = Typography

export function AdminCommunityPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [postComments, setPostComments] = useState<Comment[]>([])
  const [communityProductMap, setCommunityProductMap] = useState<Record<number, Product>>({})

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      const data = pickData(response)
      setLogs((items) => [{ title, ok: true, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      return data as T
    } catch (error) {
      const data = formatError(error)
      setLogs((items) => [{ title, ok: false, data, time: new Date().toLocaleTimeString() }, ...items].slice(0, 8))
      api.error(`${title}失败`)
      return null
    }
  }

  async function loadPosts(section?: string) {
    const data = await run<PageResult<Post>>('社区内容', () =>
      http.get('/admin/community/posts', {
        params: { status: 'published', section },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setPosts(pageList<Post>(data))
  }

  async function openPost(post: Post) {
    setSelectedPost(post)
    await loadCommunityProducts(post.product_ids)
    const data = await run<PageResult<Comment>>('帖子评论', () =>
      http.get('/admin/community/comments', {
        params: { post_id: post.id, status: 'published' },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setPostComments(pageList<Comment>(data))
  }

  async function loadCommunityProducts(productIds: number[]) {
    const missingIds = productIds.filter((id) => !communityProductMap[id])
    if (missingIds.length === 0) return
    const details = await Promise.all(
      missingIds.map((id) =>
        run<Product>('社区关联商品详情', () =>
          http.get(`/admin/products/${id}`, { headers: { 'X-Admin-Session': SESSION } }),
        ),
      ),
    )
    const products = details.filter(Boolean) as Product[]
    if (!products.length) return
    setCommunityProductMap((current) => {
      const next = { ...current }
      products.forEach((product) => {
        next[product.id] = product
      })
      return next
    })
  }

  function renderCommunityProductCards(productIds: number[]) {
    if (!productIds.length) return <Text type="secondary">暂无关联商品</Text>
    return (
      <div className="community-product-cards">
        {productIds.map((productId) => {
          const product = communityProductMap[productId]
          return (
            <Card key={productId} size="small" className="community-product-card">
              {product ? (
                <Space align="center" size={10}>
                  {product.cover_url ? (
                    <Image width={58} height={58} preview={false} src={assetUrl(product.cover_url)} />
                  ) : (
                    <div className="community-product-thumb">图</div>
                  )}
                  <Space direction="vertical" size={2}>
                    <Text strong ellipsis style={{ maxWidth: 320 }}>{product.name}</Text>
                    <Text type="secondary">商品 #{product.id} / 店铺 #{product.merchant.id} {product.merchant.name}</Text>
                    <Text className="community-product-price">￥{yuan(product.skus[0]?.price_cent)}</Text>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={2}>
                  <Text strong>商品 #{productId}</Text>
                  <Text type="secondary">暂无权限或商品信息加载失败</Text>
                </Space>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  async function hidePost(id: number) {
    await run('隐藏帖子', () =>
      http.post(`/admin/community/posts/${id}/hide`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadPosts()
    if (selectedPost?.id === id) setSelectedPost(null)
  }

  async function hideComment(id: number) {
    await run('隐藏评论', () =>
      http.post(`/admin/community/comments/${id}/hide`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (selectedPost) await openPost(selectedPost)
  }

  useEffect(() => {
    void loadPosts()
  }, [])

  const postColumns: ColumnsType<Post> = [
    {
      title: '帖子',
      render: (_, row) => (
        <Space direction="vertical" size={2}>
          <Text strong>{row.title}</Text>
          <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0, maxWidth: 360 }}>{row.content}</Paragraph>
          <Text type="secondary">帖子 #{row.id}</Text>
        </Space>
      ),
    },
    {
      title: '类型 / 分区',
      render: (_, row) => (
        <Space wrap>
          <Tag color={row.type === 'grass' ? 'purple' : 'blue'}>{statusText(row.type)}</Tag>
          <Tag>{row.section}</Tag>
        </Space>
      ),
    },
    { title: '作者', render: (_, row) => row.author?.nickname ?? '-' },
    {
      title: '互动',
      render: (_, row) => (
        <Space wrap>
          <Tag>赞 {row.like_count}</Tag>
          <Tag>评 {row.comment_count}</Tag>
        </Space>
      ),
    },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    {
      title: '操作',
      render: (_, row) => (
        <Space>
          <Button type="link" onClick={() => openPost(row)}>详情</Button>
          <Button type="link" danger onClick={() => hidePost(row.id)}>隐藏</Button>
        </Space>
      ),
    },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>社区内容管理</Title>
          <Paragraph>查看并管理平台社区帖子与评论内容</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card
            title="社区帖子"
            extra={
              <Space wrap>
                <Select
                  allowClear
                  style={{ width: 160 }}
                  placeholder="分区筛选"
                  onChange={(section) => void loadPosts(section)}
                  options={[
                    { value: 'square', label: '综合广场' },
                    { value: 'grass', label: '种草专区' },
                    { value: 'merchant', label: '商家动态' },
                    { value: 'help', label: '询问求助' },
                    { value: 'experience', label: '体验分享' },
                  ]}
                />
                <Button onClick={() => loadPosts()}>刷新社区内容</Button>
              </Space>
            }
          >
            <Table rowKey="id" columns={postColumns} dataSource={posts} pagination={{ pageSize: 8 }} />
          </Card>
        </Col>
      </Row>

      <Drawer
        title={selectedPost ? `社区帖子 #${selectedPost.id}` : '社区帖子'}
        width={780}
        open={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
      >
        {selectedPost ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Space wrap>
              <Tag color="blue">帖子 #{selectedPost.id}</Tag>
              <Tag>{statusText(selectedPost.type)}</Tag>
              <Tag>{selectedPost.section}</Tag>
              <StatusTag status={selectedPost.status} />
              <Text type="secondary">作者：{selectedPost.author?.nickname ?? '-'}</Text>
            </Space>
            <Title level={4}>{selectedPost.title}</Title>
            <Paragraph>{selectedPost.content}</Paragraph>
            <Card size="small" title="关联商品">
              {renderCommunityProductCards(selectedPost.product_ids)}
            </Card>
            {selectedPost.image_urls.length ? (
              <Image.PreviewGroup>
                <Space wrap>
                  {selectedPost.image_urls.map((url) => <Image key={url} width={120} src={assetUrl(url)} />)}
                </Space>
              </Image.PreviewGroup>
            ) : null}
            <Divider />
            <Card size="small" title={`评论管理 ${postComments.length}`}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {postComments.map((comment) => (
                  <Card
                    size="small"
                    key={comment.id}
                    extra={<Button danger size="small" onClick={() => hideComment(comment.id)}>隐藏评论</Button>}
                  >
                    <Space direction="vertical" size={4}>
                      <Text strong>{comment.author?.nickname ?? '-'}</Text>
                      <Text>{comment.content}</Text>
                      <Text type="secondary">评论 #{comment.id} / {new Date(comment.created_at).toLocaleString()}</Text>
                    </Space>
                  </Card>
                ))}
                {postComments.length === 0 ? <Text type="secondary">暂无评论</Text> : null}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <DebugLogs logs={logs} />
    </main>
  )
}
