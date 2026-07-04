import { useEffect, useState } from 'react'

import {
  adminCommunityService,
  type CommunityComment,
  type CommunityPost,
} from '../../services/community'

export function CommunityAdminPage() {
  const [postStatus, setPostStatus] = useState('pending_audit')
  const [commentStatus, setCommentStatus] = useState('pending_audit')
  const [commentPostId, setCommentPostId] = useState('')
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [message, setMessage] = useState('')

  async function loadPosts() {
    const response = await adminCommunityService.listPosts(postStatus)
    setPosts(response.data.list)
  }

  async function loadComments() {
    const response = await adminCommunityService.listComments(
      commentStatus,
      commentPostId ? Number(commentPostId) : undefined,
    )
    setComments(response.data.list)
  }

  useEffect(() => {
    loadPosts().catch(() => setPosts([]))
  }, [postStatus])

  useEffect(() => {
    loadComments().catch(() => setComments([]))
  }, [commentStatus])

  async function handlePostAudit(postId: number, approved: boolean) {
    setMessage('')
    try {
      const response = await adminCommunityService.auditPost(postId, approved)
      setMessage(`帖子 #${postId} 已处理，当前状态：${response.data.status}`)
      await loadPosts()
    } catch {
      setMessage('帖子审核失败，请确认管理员已登录且帖子状态允许审核')
    }
  }

  async function handlePostHide(postId: number) {
    setMessage('')
    try {
      const response = await adminCommunityService.hidePost(postId)
      setMessage(`帖子 #${postId} 已隐藏，当前状态：${response.data.status}`)
      await loadPosts()
    } catch {
      setMessage('隐藏帖子失败')
    }
  }

  async function handleCommentAudit(commentId: number, approved: boolean) {
    setMessage('')
    try {
      const response = await adminCommunityService.auditComment(commentId, approved)
      setMessage(`评论 #${commentId} 已处理，当前状态：${response.data.status}`)
      await loadComments()
    } catch {
      setMessage('评论审核失败，请确认管理员已登录且评论状态允许审核')
    }
  }

  async function handleCommentHide(commentId: number) {
    setMessage('')
    try {
      const response = await adminCommunityService.hideComment(commentId)
      setMessage(`评论 #${commentId} 已隐藏，当前状态：${response.data.status}`)
      await loadComments()
    } catch {
      setMessage('隐藏评论失败')
    }
  }

  return (
    <main>
      <h1>社区审核</h1>
      <p>
        当前测试页主要给平台运营使用。商家广告帖权限细分还未完成，商家运营账号如遇到无权限或数据为空，以后端返回为准。
      </p>
      <section>
        <h2>帖子审核</h2>
        <label>
          状态
          <select value={postStatus} onChange={(event) => setPostStatus(event.target.value)}>
            <option value="pending_audit">待审核</option>
            <option value="published">已发布</option>
            <option value="rejected">已拒绝</option>
            <option value="hidden">已隐藏</option>
          </select>
        </label>
        <button type="button" onClick={() => loadPosts().catch(() => setMessage('帖子刷新失败'))}>
          刷新帖子
        </button>
        {posts.length > 0 ? (
          <ul>
            {posts.map((post) => (
              <li key={post.id}>
                #{post.id} [{post.type}] {post.title} - 作者 {post.author.nickname} - 状态 {post.status} - 商品{' '}
                {post.product_ids.join(',') || '无'} - 点赞 {post.like_count} - 评论 {post.comment_count}
                <button type="button" onClick={() => handlePostAudit(post.id, true)}>
                  通过
                </button>
                <button type="button" onClick={() => handlePostAudit(post.id, false)}>
                  拒绝
                </button>
                <button type="button" onClick={() => handlePostHide(post.id)}>
                  隐藏
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>当前状态下暂无帖子</p>
        )}
      </section>
      <section>
        <h2>评论审核</h2>
        <label>
          状态
          <select value={commentStatus} onChange={(event) => setCommentStatus(event.target.value)}>
            <option value="pending_audit">待审核</option>
            <option value="published">已发布</option>
            <option value="rejected">已拒绝</option>
            <option value="hidden">已隐藏</option>
          </select>
        </label>
        <label>
          帖子 ID，可留空查全站
          <input value={commentPostId} onChange={(event) => setCommentPostId(event.target.value)} />
        </label>
        <button type="button" onClick={() => loadComments().catch(() => setMessage('评论刷新失败'))}>
          刷新评论
        </button>
        {comments.length > 0 ? (
          <ul>
            {comments.map((comment) => (
              <li key={comment.id}>
                #{comment.id} 帖子 #{comment.post_id} - 作者 {comment.author.nickname} - 状态 {comment.status} -{' '}
                {comment.content}
                <button type="button" onClick={() => handleCommentAudit(comment.id, true)}>
                  通过
                </button>
                <button type="button" onClick={() => handleCommentAudit(comment.id, false)}>
                  拒绝
                </button>
                <button type="button" onClick={() => handleCommentHide(comment.id)}>
                  隐藏
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>当前条件下暂无评论</p>
        )}
      </section>
      {message && <p>{message}</p>}
    </main>
  )
}
