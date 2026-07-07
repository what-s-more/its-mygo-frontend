import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Card,
  Divider,
  Empty,
  Image,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import {
  HeartOutlined,
  HeartFilled,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarOutlined,
  StarFilled,
  TeamOutlined,
} from '@ant-design/icons'

import { authService } from '../../services/auth'
import {
  communityService,
  type CommunityComment,
  type CommunityPost,
  type CommunityTopic,
  type CommunityUserProfile,
} from '../../services/community'
import { getApiErrorMessage } from '../../services/http'
import { orderService } from '../../services/order'
import { productService, type ProductDetail, type ProductListItem } from '../../services/product'
import { uploadService } from '../../services/upload'
import {
  absoluteAssetUrl,
  pickErrorMessage,
  splitTags,
  statusColor,
  statusText,
  yuan,
} from '../../utils/format'

const { Title, Text, Paragraph } = Typography

function productDetailToListItem(product: ProductDetail): ProductListItem {
  return {
    id: product.id,
    name: product.name,
    cover_url: product.cover_url,
    price_cent: product.skus[0]?.price_cent ?? 0,
    market_price_cent: product.skus[0]?.market_price_cent,
    merchant_id: product.merchant.id,
    merchant_name: product.merchant.name,
    sales_count: 0,
    tags: [],
  }
}

function pickData(response: unknown) {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: unknown }).data
  }
  return response
}

const SECTION_OPTIONS = [
  { value: 'square', label: '综合广场' },
  { value: 'grass', label: '种草专区' },
  { value: 'merchant', label: '商家动态' },
  { value: 'help', label: '询问求助' },
  { value: 'experience', label: '体验分享' },
]

const POST_SECTION_OPTIONS = [
  { value: 'square', label: '综合广场' },
  { value: 'grass', label: '种草专区' },
  { value: 'experience', label: '体验分享' },
  { value: 'help', label: '询问求助' },
  { value: 'merchant', label: '商家动态' },
]

export function CommunityPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null)
  const [comments, setComments] = useState<CommunityComment[]>([])
  const [communityProductMap, setCommunityProductMap] = useState<Record<number, ProductListItem>>({})
  const [communitySection, setCommunitySection] = useState<string | undefined>()
  const [communityTopic, setCommunityTopic] = useState<string | undefined>()
  const [communityTopics, setCommunityTopics] = useState<CommunityTopic[]>([])
  const [selectedCommunityUser, setSelectedCommunityUser] = useState<CommunityUserProfile | null>(null)
  const [selectedCommunityUserPosts, setSelectedCommunityUserPosts] = useState<CommunityPost[]>([])
  const [postSection, setPostSection] = useState('experience')
  const [postTitle, setPostTitle] = useState('我的购物体验')
  const [postContent, setPostContent] = useState('这是一条用于社区展示的内容。')
  const [selectedPostProductIds, setSelectedPostProductIds] = useState<number[]>([])
  const [postProductSearchResults, setPostProductSearchResults] = useState<ProductListItem[]>([])
  const [postProductSearchKeyword, setPostProductSearchKeyword] = useState('')
  const [postTopicTags, setPostTopicTags] = useState('体验')
  const [postImages, setPostImages] = useState<string[]>([])
  const [commentContent, setCommentContent] = useState('这是一条评论。')
  const [noticeText, setNoticeText] = useState('')
  const [showPostForm, setShowPostForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  const communityProductIds = useMemo(() => {
    const ids = new Set<number>()
    posts.forEach((post) => post.product_ids.forEach((id) => ids.add(id)))
    selectedPost?.product_ids.forEach((id) => ids.add(id))
    selectedCommunityUserPosts.forEach((post) => post.product_ids.forEach((id) => ids.add(id)))
    return Array.from(ids)
  }, [posts, selectedPost, selectedCommunityUserPosts])

  const postProductOptions = useMemo(() => {
    const map = new Map<number, ProductListItem>()
    postProductSearchResults.forEach((product) => map.set(product.id, product))
    selectedPostProductIds.forEach((id) => {
      const product = communityProductMap[id]
      if (product) map.set(id, product)
    })
    return Array.from(map.values()).map((product) => ({
      value: product.id,
      label: `#${product.id} ${product.name} / ${product.merchant_name} / ￥${yuan(product.price_cent)}`,
    }))
  }, [postProductSearchResults, selectedPostProductIds, communityProductMap])

  const uploadFiles: UploadFile[] = postImages.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `image-${index}`,
    status: 'done',
    url: absoluteAssetUrl(url),
  }))

  async function run<T>(title: string, action: () => Promise<unknown>): Promise<T | null> {
    try {
      const response = await action()
      return pickData(response) as T
    } catch (error) {
      message.error(`${title}失败：${getApiErrorMessage(error)}`)
      return null
    }
  }

  async function loadPosts() {
    setLoading(true)
    try {
      const data = await run<{ list?: CommunityPost[] }>('社区帖子', () =>
        communityService.listPosts({ section: communitySection, topic: communityTopic }),
      )
      setPosts(data?.list ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function loadCommunityTopics() {
    const data = await run<CommunityTopic[]>('热门话题', () => communityService.listTopics({ limit: 12 }))
    setCommunityTopics(data ?? [])
  }

  async function loadCommunityProducts(productIds: number[]) {
    const missingIds = productIds.filter((id) => !communityProductMap[id])
    if (missingIds.length === 0) return
    const details = await Promise.all(
      missingIds.map((id) =>
        run<ProductDetail>('社区关联商品详情', () => productService.getProduct(id)),
      ),
    )
    const items = details.filter(Boolean).map((detail) => productDetailToListItem(detail as ProductDetail))
    if (items.length === 0) return
    setCommunityProductMap((current) => {
      const next = { ...current }
      items.forEach((item) => {
        next[item.id] = item
      })
      return next
    })
  }

  function filterByTopic(topic: string) {
    setCommunityTopic(topic)
    setCommunitySection(undefined)
  }

  function clearCommunityTopic() {
    setCommunityTopic(undefined)
  }

  async function openCommunityUser(userId: number) {
    const [profileData, postsData] = await Promise.all([
      run<CommunityUserProfile>('社区个人主页', () => communityService.getUserProfile(userId)),
      run<{ list?: CommunityPost[] }>('作者帖子', () => communityService.listUserPosts(userId, { page_size: 12 })),
    ])
    if (profileData) setSelectedCommunityUser(profileData)
    setSelectedCommunityUserPosts(postsData?.list ?? [])
  }

  async function openPost(post: CommunityPost) {
    setSelectedCommunityUser(null)
    setSelectedPost(post)
    const data = await run<{ list?: CommunityComment[] }>('帖子评论', () => communityService.listComments(post.id))
    setComments(data?.list ?? [])
  }

  async function createPost(type: 'normal' | 'grass') {
    try {
      await communityService.createPost({
        type,
        section: type === 'grass' ? 'grass' : postSection,
        title: postTitle,
        content: postContent,
        product_ids: selectedPostProductIds,
        topic_tags: splitTags(postTopicTags),
        image_urls: postImages,
      })
      setPostImages([])
      message.success(type === 'grass' ? '种草帖已发布' : '普通帖已发布')
      await loadPosts()
      await loadCommunityTopics()
      setShowPostForm(false)
    } catch (error) {
      const bizMessage = pickErrorMessage(error)
      message.error(
        bizMessage ?? (type === 'grass' ? '发布种草帖失败，种草帖必须关联已完成订单购买过的商品' : '发布普通帖失败'),
      )
    }
  }

  async function commentPost(postId: number) {
    const data = await run<CommunityComment>('发表评论', () => communityService.createComment(postId, commentContent))
    if (data && selectedPost) {
      message.success('评论已发表')
      await openPost(selectedPost)
    }
  }

  async function likePost(postId: number) {
    const data = await run<{ liked: boolean; like_count: number }>('点赞', () => communityService.likePost(postId))
    if (data) {
      setLikedPosts((current) => {
        const next = new Set(current)
        if (data.liked) next.add(postId)
        else next.delete(postId)
        return next
      })
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, like_count: data.like_count } : post,
        ),
      )
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({ ...selectedPost, like_count: data.like_count })
      }
    }
  }

  async function favoritePost(postId: number) {
    const data = await run<{ favorited: boolean; favorite_count: number }>('收藏', () =>
      communityService.favoritePost(postId),
    )
    if (data) {
      setPosts((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, favorited: data.favorited, favorite_count: data.favorite_count }
            : post,
        ),
      )
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost({
          ...selectedPost,
          favorited: data.favorited,
          favorite_count: data.favorite_count,
        })
      }
    }
  }

  async function deletePost(postId: number) {
    try {
      await communityService.deletePost(postId)
      message.success('帖子已删除')
      setSelectedPost(null)
      await loadPosts()
      await loadCommunityTopics()
    } catch (error) {
      message.error(`删除帖子失败：${getApiErrorMessage(error)}`)
    }
  }

  async function uploadPostImage(file: File) {
    const data = await run<{ url: string }>('上传帖子图片', () => uploadService.uploadImage(file))
    if (data?.url) setPostImages((items) => [...items, data.url])
    return false
  }

  async function searchPostProducts(keyword = '') {
    const trimmedKeyword = keyword.trim()
    setPostProductSearchKeyword(trimmedKeyword)
    const data = await run<{ list?: ProductListItem[] }>('搜索关联商品', () =>
      productService.listProducts({
        keyword: trimmedKeyword || undefined,
        page: 1,
        page_size: 30,
      }),
    )
    let list = data?.list ?? []
    const numericId = Number(trimmedKeyword.replace(/^#/, ''))
    if (Number.isInteger(numericId) && numericId > 0 && !list.some((product) => product.id === numericId)) {
      const detail = await run<ProductDetail>('按商品 ID 搜索关联商品', () => productService.getProduct(numericId))
      if (detail) list = [productDetailToListItem(detail), ...list]
    }
    setPostProductSearchResults(list)
    if (list.length > 0) {
      setCommunityProductMap((current) => {
        const next = { ...current }
        list.forEach((product) => {
          next[product.id] = product
        })
        return next
      })
    }
  }

  function handleProductClick(productId: number, sourcePostId?: number) {
    const url = sourcePostId ? `/products/${productId}?source_post_id=${sourcePostId}` : `/products/${productId}`
    navigate(url)
  }

  function renderCommunityProductCards(productIds: number[], compact = false, sourcePostId?: number) {
    if (productIds.length === 0) {
      return <Text type="secondary">暂无关联商品</Text>
    }
    return (
      <div className={compact ? 'community-product-cards compact' : 'community-product-cards'}>
        {productIds.map((productId) => {
          const product = communityProductMap[productId]
          const canSourceOrder = !!sourcePostId
          return (
            <Card
              key={productId}
              size="small"
              className={`community-product-card ${canSourceOrder ? 'community-product-card-clickable' : ''}`}
              onClick={() => void handleProductClick(productId, sourcePostId)}
            >
              {product ? (
                <Space size={10} align="center">
                  {product.cover_url ? (
                    <Image
                      width={compact ? 46 : 64}
                      height={compact ? 46 : 64}
                      preview={false}
                      src={absoluteAssetUrl(product.cover_url)}
                    />
                  ) : (
                    <div className="community-product-thumb">图</div>
                  )}
                  <Space direction="vertical" size={2}>
                    <Text strong ellipsis style={{ maxWidth: compact ? 135 : 260 }}>
                      {product.name}
                    </Text>
                    <Text type="secondary">商品 #{product.id} / {product.merchant_name}</Text>
                    <Text className="community-product-price">￥{yuan(product.price_cent)}</Text>
                  </Space>
                </Space>
              ) : (
                <Space direction="vertical" size={2}>
                  <Text strong>商品 #{productId}</Text>
                  <Text type="secondary">正在加载商品信息</Text>
                </Space>
              )}
            </Card>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    void loadPosts()
  }, [communitySection, communityTopic])

  useEffect(() => {
    if (communityProductIds.length) void loadCommunityProducts(communityProductIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityProductIds])

  useEffect(() => {
    void loadCommunityTopics()
    void searchPostProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const response = await authService.profile()
        setCurrentUserId(response.data.id)
      } catch {
        // 页面受 RequireAuth 守卫保护，正常情况不会进入此分支；
        // 若获取失败则不显示删除按钮，不影响其他功能
      }
    })()
  }, [])

  return (
    <div className="comm-page">
      {/* ── Page Header ── */}
      <header className="comm-header">
        <Title level={3} className="comm-header-title">
          <TeamOutlined /> 社区
        </Title>
        <Paragraph className="comm-header-sub">
          发现好物、分享体验、加入种草与讨论
        </Paragraph>
      </header>

      {/* ── Top Bar: Section Tabs + Actions ── */}
      <div className="comm-topbar">
        <div className="comm-topbar-inner">
          <div className="comm-tabs">
            {SECTION_OPTIONS.map((tab) => {
              const isActive = (communitySection ?? 'square') === tab.value
              return (
                <button
                  key={tab.value}
                  className={`comm-tab ${isActive ? 'comm-tab-active' : ''}`}
                  onClick={() => setCommunitySection(tab.value === 'square' ? undefined : tab.value)}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
          <div className="comm-topbar-actions">
            <Button
              icon={<PlusOutlined />}
              type="primary"
              className="btn-comm-primary"
              onClick={() => setShowPostForm(true)}
            >
              发布
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void loadPosts()}>刷新</Button>
          </div>
        </div>
      </div>

      {/* ── Topic Chips ── */}
      {communityTopics.length > 0 && (
        <div className="comm-topic-bar">
          <div className="comm-topic-bar-inner">
            <Text type="secondary" className="comm-topic-label">热门话题</Text>
            <div className="comm-topic-chips">
              {communityTopics.map((topic) => (
                <button
                  key={topic.name}
                  className={`comm-topic-chip ${communityTopic === topic.name ? 'comm-topic-chip-active' : ''}`}
                  onClick={() => filterByTopic(topic.name)}
                >
                  #{topic.name}
                  <span className="comm-topic-count">{topic.post_count}</span>
                </button>
              ))}
            </div>
            {communityTopic && (
              <Button size="small" type="link" onClick={clearCommunityTopic}>清除 #{communityTopic}</Button>
            )}
          </div>
        </div>
      )}

      {/* ── Masonry Post Grid ── */}
      <div className="comm-grid-section">
        {posts.length === 0 && !loading ? (
          <Empty
            description="暂无社区内容，快来发布第一条吧"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '80px 0' }}
          />
        ) : (
          <div className="comm-masonry">
            {posts.map((post) => {
              const isLiked = likedPosts.has(post.id)
              return (
                <div key={post.id} className="comm-card" onClick={() => void openPost(post)}>
                  {/* Image */}
                  {post.image_urls[0] ? (
                    <div className="comm-card-image">
                      <img src={absoluteAssetUrl(post.image_urls[0])} alt={post.title} loading="lazy" />
                    </div>
                  ) : (
                    <div className="comm-card-noimg">
                      <span>{statusText(post.type)}</span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="comm-card-body">
                    <div className="comm-card-tags">
                      {post.type === 'grass' && <Tag className="comm-tag-grass">种草</Tag>}
                      {post.type === 'merchant' && <Tag className="comm-tag-merchant">商家</Tag>}
                      {post.product_ids.length > 0 && (
                        <Tag className="comm-tag-product">关联 {post.product_ids.length} 件商品</Tag>
                      )}
                    </div>
                    <Text className="comm-card-title">{post.title}</Text>
                    <Paragraph className="comm-card-content" ellipsis={{ rows: 2 }}>
                      {post.content}
                    </Paragraph>
                    {post.topic_tags.length > 0 && (
                      <div className="comm-card-topics">
                        {post.topic_tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="comm-card-topic"
                            onClick={(e) => {
                              e.stopPropagation()
                              filterByTopic(tag)
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer: Author + Like */}
                    <div className="comm-card-footer">
                      <div
                        className="comm-card-author"
                        onClick={(e) => {
                          e.stopPropagation()
                          void openCommunityUser(post.author.id)
                        }}
                      >
                        <Avatar size={24} src={absoluteAssetUrl(post.author.avatar_url)}>
                          {post.author.nickname?.[0] ?? '用'}
                        </Avatar>
                        <span className="comm-card-author-name">{post.author.nickname}</span>
                      </div>
                      <div className="comm-card-actions">
                        <button
                          className={`comm-like-btn ${isLiked ? 'comm-like-btn-active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            void likePost(post.id)
                          }}
                        >
                          {isLiked ? <HeartFilled /> : <HeartOutlined />}
                          <span>{post.like_count}</span>
                        </button>
                        <button
                          className={`comm-favorite-btn ${post.favorited ? 'comm-favorite-btn-active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            void favoritePost(post.id)
                          }}
                        >
                          {post.favorited ? <StarFilled /> : <StarOutlined />}
                          <span>{post.favorite_count}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Post Detail Modal ── */}
      <Modal
        open={!!selectedPost}
        title={selectedPost?.title}
        onCancel={() => setSelectedPost(null)}
        footer={null}
        width={720}
        centered
        className="comm-post-modal"
      >
        {selectedPost ? (
          <div className="comm-detail">
            {/* Author Header */}
            <div className="comm-detail-header">
              <Avatar size={40} src={absoluteAssetUrl(selectedPost.author.avatar_url)}>
                {selectedPost.author.nickname?.[0] ?? '用'}
              </Avatar>
              <div className="comm-detail-author-info">
                <Text strong>{selectedPost.author.nickname}</Text>
                <Text type="secondary" className="comm-detail-date">
                  {new Date(selectedPost.created_at).toLocaleString()}
                </Text>
              </div>
              <div className="comm-detail-tags">
                <Tag color={statusColor(selectedPost.status)}>{statusText(selectedPost.status)}</Tag>
                <Tag>{statusText(selectedPost.section)}</Tag>
              </div>
            </div>

            {/* Content */}
            <Paragraph className="comm-detail-content">{selectedPost.content}</Paragraph>

            {/* Topics */}
            {selectedPost.topic_tags.length > 0 && (
              <div className="comm-detail-topics">
                {selectedPost.topic_tags.map((tag) => (
                  <Tag
                    key={tag}
                    className="clickable-tag"
                    color={communityTopic === tag ? 'purple' : 'default'}
                    onClick={() => filterByTopic(tag)}
                  >
                    #{tag}
                  </Tag>
                ))}
              </div>
            )}

            {/* Images */}
            {selectedPost.image_urls.length > 0 && (
              <Image.PreviewGroup>
                <div className="comm-detail-images">
                  {selectedPost.image_urls.map((url) => (
                    <Image
                      key={url}
                      width="100%"
                      src={absoluteAssetUrl(url)}
                      className="comm-detail-image"
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            )}

            {/* Linked Products */}
            {selectedPost.product_ids.length > 0 && (
              <div className="comm-detail-products">
                <Text strong className="comm-detail-section-title">关联商品</Text>
                {renderCommunityProductCards(
                  selectedPost.product_ids,
                  false,
                  selectedPost.type === 'grass' ? selectedPost.id : undefined,
                )}
              </div>
            )}

            {/* Like + Favorite + Comment counts + Delete */}
            <div className="comm-detail-actions">
              <Button
                icon={likedPosts.has(selectedPost.id) ? <HeartFilled style={{ color: '#f5222d' }} /> : <HeartOutlined />}
                onClick={() => void likePost(selectedPost.id)}
                className="comm-detail-like-btn"
              >
                {selectedPost.like_count}
              </Button>
              <Button
                icon={selectedPost.favorited ? <StarFilled style={{ color: '#f5a623' }} /> : <StarOutlined />}
                onClick={() => void favoritePost(selectedPost.id)}
                className="comm-detail-like-btn"
              >
                {selectedPost.favorite_count}
              </Button>
              <Text type="secondary"><MessageOutlined /> {selectedPost.comment_count} 条评论</Text>
              {selectedPost.author.id === currentUserId && (
                <Popconfirm
                  title="确认删除"
                  description="确定要删除这篇帖子吗？删除后不可恢复。"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => void deletePost(selectedPost.id)}
                >
                  <Button danger style={{ marginLeft: 'auto' }}>删除帖子</Button>
                </Popconfirm>
              )}
            </div>

            <Divider />

            {/* Comments */}
            <div className="comm-detail-comments">
              <Text strong className="comm-detail-section-title">评论</Text>
              <List
                dataSource={comments}
                locale={{ emptyText: '暂无评论，快来抢沙发' }}
                renderItem={(comment) => (
                  <List.Item className="comm-comment-item">
                    <div className="comm-comment">
                      <Avatar size={28} src={absoluteAssetUrl(comment.author.avatar_url)}>
                        {comment.author.nickname?.[0] ?? '用'}
                      </Avatar>
                      <div className="comm-comment-body">
                        <Text strong className="comm-comment-author">
                          {comment.author.nickname || '匿名'}
                        </Text>
                        <Text className="comm-comment-text">{comment.content}</Text>
                        <Text type="secondary" className="comm-comment-date">
                          {new Date(comment.created_at).toLocaleString()}
                        </Text>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </div>

            {/* Comment Input */}
            <div className="comm-comment-input">
              <Input
                value={commentContent}
                onChange={(event) => setCommentContent(event.target.value)}
                placeholder="写下你的评论…"
                onPressEnter={() => void commentPost(selectedPost.id)}
              />
              <Button type="primary" onClick={() => void commentPost(selectedPost.id)} className="btn-comm-primary">
                发送
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* ── Create Post Modal ── */}
      <Modal
        open={showPostForm}
        title="发布社区内容"
        onCancel={() => setShowPostForm(false)}
        footer={null}
        width={640}
      >
        <div className="comm-post-form">
          <Input
            value={postTitle}
            onChange={(event) => setPostTitle(event.target.value)}
            placeholder="标题"
            className="comm-form-input"
          />
          <Select
            style={{ width: '100%' }}
            value={postSection}
            onChange={setPostSection}
            options={POST_SECTION_OPTIONS}
            className="comm-form-input"
          />
          <Select
            mode="multiple"
            allowClear
            showSearch
            optionFilterProp="label"
            filterOption={false}
            style={{ width: '100%' }}
            value={selectedPostProductIds}
            onChange={setSelectedPostProductIds}
            onSearch={(value) => searchPostProducts(value)}
            onFocus={() => searchPostProducts()}
            options={postProductOptions}
            placeholder="搜索并选择关联商品；种草帖需选择已完成订单商品"
            className="comm-form-input"
          />
          <Input
            value={postTopicTags}
            onChange={(event) => setPostTopicTags(event.target.value)}
            placeholder="话题标签，例如：开箱 零食测评；支持中文逗号、英文逗号或空格"
            className="comm-form-input"
          />
          <Input.TextArea
            rows={4}
            value={postContent}
            onChange={(event) => setPostContent(event.target.value)}
            placeholder="分享你的体验…"
            className="comm-form-input"
          />
          <Upload
            fileList={uploadFiles}
            listType="picture-card"
            beforeUpload={(file) => uploadPostImage(file)}
            onRemove={(file) => {
              setPostImages((items) => items.filter((item) => absoluteAssetUrl(item) !== file.url))
              return true
            }}
          >
            {postImages.length >= 9 ? null : (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传图片</div>
              </div>
            )}
          </Upload>
          <Space>
            <Button onClick={() => createPost('normal')}>发布普通帖</Button>
            <Button type="primary" onClick={() => createPost('grass')} className="btn-comm-primary">
              发布种草帖
            </Button>
          </Space>
        </div>
      </Modal>

      {/* ── Community User Profile Modal ── */}
      <Modal
        open={!!selectedCommunityUser}
        title={selectedCommunityUser ? `${selectedCommunityUser.user.nickname} 的社区主页` : '社区主页'}
        onCancel={() => setSelectedCommunityUser(null)}
        footer={null}
        width={760}
      >
        {selectedCommunityUser ? (
          <div className="comm-user-profile">
            <div className="comm-user-header">
              <Avatar size={64} src={absoluteAssetUrl(selectedCommunityUser.user.avatar_url)}>
                {selectedCommunityUser.user.nickname?.[0] ?? '用'}
              </Avatar>
              <div className="comm-user-info">
                <Title level={4} style={{ margin: 0 }}>{selectedCommunityUser.user.nickname}</Title>
                <Text type="secondary">社区用户 #{selectedCommunityUser.user.id}</Text>
              </div>
            </div>
            <div className="comm-user-stats">
              <div className="comm-user-stat"><Statistic title="帖子" value={selectedCommunityUser.post_count} /></div>
              <div className="comm-user-stat"><Statistic title="种草" value={selectedCommunityUser.grass_post_count} /></div>
              <div className="comm-user-stat"><Statistic title="评论" value={selectedCommunityUser.comment_count} /></div>
              <div className="comm-user-stat"><Statistic title="获赞" value={selectedCommunityUser.like_received_count} /></div>
            </div>
            <Text strong className="comm-detail-section-title">近期帖子</Text>
            <div className="comm-user-posts">
              {selectedCommunityUserPosts.length === 0 ? (
                <Empty description="暂无公开帖子" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <div className="comm-user-posts-grid">
                  {selectedCommunityUserPosts.map((post) => (
                    <Card
                      key={post.id}
                      size="small"
                      hoverable
                      className="comm-user-post-card"
                      onClick={() => {
                        setSelectedCommunityUser(null)
                        void openPost(post)
                      }}
                    >
                      {post.image_urls[0] ? (
                        <img src={absoluteAssetUrl(post.image_urls[0])} alt={post.title} className="comm-user-post-img" />
                      ) : null}
                      <Text strong className="comm-user-post-title">{post.title}</Text>
                      <div className="comm-user-post-meta">
                        <Text type="secondary">{statusText(post.type)}</Text>
                        <Text type="secondary">❤ {post.like_count}</Text>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
