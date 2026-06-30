import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, List, Select, Space, Tag, Typography } from 'antd'
import { LikeOutlined, MessageOutlined } from '@ant-design/icons'
import { communityService, type CommunityPost } from '../../services/community'
import { DataPanel } from '../../components/DataPanel'
import { usePage } from '../../hooks/usePage'

const { Text, Paragraph } = Typography

function splitIds(value: string) {
  return value.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0)
}

export function CommunityPage() {
  const { message } = App.useApp()
  const [commentPostId, setCommentPostId] = useState<number | null>(null)
  const [commentContent, setCommentContent] = useState('')

  const fetchPosts = useCallback(
    (page: number, pageSize: number) => communityService.listPosts(page, pageSize),
    [],
  )
  const { page, pageSize, total, list, loading, load, changePage, lastResult, setLastResult } = usePage<CommunityPost>(fetchPosts)

  useEffect(() => {
    void load(1)
  }, [load])

  async function createPost(values: { type: string; title: string; content: string; productIds: string; topicTags: string }) {
    try {
      await communityService.createPost({
        type: values.type,
        title: values.title,
        content: values.content,
        product_ids: splitIds(values.productIds),
        topic_tags: values.topicTags.split(',').map((s) => s.trim()).filter(Boolean),
        image_urls: [],
      })
      message.success('帖子已提交审核')
      await load(1)
    } catch (e) {
      setLastResult({ title: '发帖', ok: false, data: e })
      message.error('发帖失败。种草帖必须关联已完成订单购买过的商品。')
    }
  }

  async function likePost(postId: number) {
    try {
      await communityService.likePost(postId)
      await load(page)
    } catch (e) {
      setLastResult({ title: '点赞', ok: false, data: e })
      message.error('点赞失败')
    }
  }

  async function submitComment() {
    if (!commentPostId || !commentContent) return
    try {
      await communityService.createComment(commentPostId, commentContent)
      message.success('评论已提交审核')
      setCommentPostId(null)
      setCommentContent('')
    } catch (e) {
      setLastResult({ title: '评论', ok: false, data: e })
      message.error('评论失败')
    }
  }

  return (
    <div className="shop-page">
      <Card title="社区" extra={<Button onClick={() => void load(page)}>刷新</Button>}>
        <Card type="inner" title="发布帖子" style={{ marginBottom: 16 }}>
          <Form onFinish={(v) => void createPost(v as any)} layout="vertical">
            <Form.Item name="type" label="类型" initialValue="normal">
              <Select options={[{ label: '普通帖', value: 'normal' }, { label: '种草帖', value: 'grass' }]} />
            </Form.Item>
            <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input placeholder="标题" /></Form.Item>
            <Form.Item name="content" label="内容" rules={[{ required: true }]}><Input.TextArea placeholder="内容" rows={3} /></Form.Item>
            <Form.Item name="productIds" label="关联商品ID（逗号分隔）"><Input placeholder="如：1,2,3" /></Form.Item>
            <Form.Item name="topicTags" label="标签（逗号分隔）" initialValue="测试"><Input placeholder="标签" /></Form.Item>
            <Button type="primary" htmlType="submit">提交帖子</Button>
          </Form>
        </Card>

        <List
          dataSource={list}
          loading={loading}
          renderItem={(post) => (
            <List.Item
              actions={[
                <Button key="like" type="text" icon={<LikeOutlined />} onClick={() => void likePost(post.id)}>{post.like_count}</Button>,
                <Button key="comment" type="text" icon={<MessageOutlined />} onClick={() => { setCommentPostId(post.id); setCommentContent('') }}>{post.comment_count}</Button>,
              ]}
            >
              <List.Item.Meta
                title={<Space><Text strong>{post.title}</Text><Tag>{post.type}</Tag><Tag color="blue">帖子 #{post.id}</Tag></Space>}
                description={
                  <Space direction="vertical" size={2}>
                    <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                    <Text type="secondary">{post.author?.nickname || '匿名'} / {post.status} / 商品 {post.product_ids.join(',') || '无'}</Text>
                  </Space>
                }
              />
            </List.Item>
          )}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: changePage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />

        {commentPostId && (
          <Card type="inner" title={`评论帖子 #${commentPostId}`} style={{ marginTop: 16 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="评论内容" />
              <Button type="primary" onClick={() => void submitComment()}>提交评论</Button>
            </Space.Compact>
          </Card>
        )}
      </Card>

      <DataPanel result={lastResult} />
    </div>
  )
}
