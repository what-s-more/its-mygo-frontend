import {
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Form,
  Image,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import { uploadService } from '../../services/upload'
import {
  DebugLogs,
  StatusTag,
  formatError,
  pickData,
  type ApiLog,
  yuan,
  ids,
  tags,
  statusText,
  assetUrl,
} from '../workbench/adminShared'
import {
  SESSION,
  type AdminProfile,
  type CommunityComment,
  type CommunityPost,
  type PageResult,
  type Product,
  pageList,
} from './shared'

const { Title, Paragraph, Text } = Typography

export function MerchantCommunityPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [communityComments, setCommunityComments] = useState<CommunityComment[]>([])
  const [selectedCommunityPost, setSelectedCommunityPost] = useState<CommunityPost | null>(null)
  const [communityProductMap, setCommunityProductMap] = useState<Record<number, Product>>({})
  const [communityImageUrls, setCommunityImageUrls] = useState<string[]>([])
  const [merchantPostProductCache, setMerchantPostProductCache] = useState<Product[]>([])
  const [merchantPostProductSearchResults, setMerchantPostProductSearchResults] = useState<Product[]>([])
  const [merchantPostProductSearchKeyword, setMerchantPostProductSearchKeyword] = useState('')
  const [communityForm] = Form.useForm()

  const merchantId = profile?.merchant_id ?? null
  const selectedMerchantPostProductIds = (Form.useWatch('product_ids', communityForm) ?? []) as number[]

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

  async function loadMe() {
    const data = await run<AdminProfile>('当前商家账号', () =>
      http.get('/admin/auth/me', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) setProfile(data)
  }

  async function loadProducts() {
    const data = await run<PageResult<Product>>('本店商品', () => http.get('/admin/products', { headers: { 'X-Admin-Session': SESSION } }))
    setProducts(pageList<Product>(data))
  }

  async function loadCommunityPosts(section?: string) {
    const data = await run<PageResult<CommunityPost>>('商家端社区内容', () =>
      http.get('/admin/community/posts', {
        params: { status: 'published', section },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setCommunityPosts(pageList<CommunityPost>(data))
  }

  async function openCommunityPost(post: CommunityPost) {
    setSelectedCommunityPost(post)
    await loadCommunityProducts(post.product_ids)
    const data = await run<PageResult<CommunityComment>>('商家端帖子评论', () =>
      http.get('/admin/community/comments', {
        params: { post_id: post.id, status: 'published' },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setCommunityComments(pageList<CommunityComment>(data))
  }

  async function loadCommunityProducts(productIds: number[]) {
    const missingIds = productIds.filter((id) => !communityProductMap[id])
    if (missingIds.length === 0) return
    const details = await Promise.all(
      missingIds.map((id) =>
        run<Product>('商家端社区关联商品详情', () =>
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

  async function createMerchantPost(values: { title: string; content: string; product_ids?: number[]; topic_tags?: string }) {
    await run('发布商家动态', () =>
      http.post(
        '/admin/community/posts',
        {
          type: 'merchant_ad',
          section: 'merchant',
          title: values.title,
          content: values.content,
          image_urls: communityImageUrls,
          product_ids: values.product_ids ?? [],
          topic_tags: tags(values.topic_tags),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    communityForm.resetFields()
    setCommunityImageUrls([])
    await loadCommunityPosts()
  }

  async function uploadCommunityImage(file: File) {
    const data = await run<{ url: string }>('上传社区图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setCommunityImageUrls((items) => [...items, data.url])
    return false
  }

  async function searchMerchantPostProducts(keyword = '') {
    const trimmedKeyword = keyword.trim()
    setMerchantPostProductSearchKeyword(trimmedKeyword)
    const data = await run<PageResult<Product>>('搜索本店关联商品', () =>
      http.get('/admin/products', {
        params: {
          keyword: trimmedKeyword || undefined,
          page: 1,
          page_size: 30,
          sort_by: 'newest',
          sort_order: 'desc',
        },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    let list = pageList<Product>(data)
    const numericId = Number(trimmedKeyword.replace(/^#/, ''))
    if (Number.isInteger(numericId) && numericId > 0 && !list.some((product) => product.id === numericId)) {
      const detail = await run<Product>('按商品 ID 搜索本店关联商品', () =>
        http.get(`/admin/products/${numericId}`, { headers: { 'X-Admin-Session': SESSION } }),
      )
      if (detail) list = [detail, ...list]
    }
    setMerchantPostProductSearchResults(list)
    setMerchantPostProductCache((current) => {
      const map = new Map<number, Product>()
      ;[...current, ...list].forEach((product) => map.set(product.id, product))
      return Array.from(map.values()).slice(-160)
    })
  }

  useEffect(() => {
    void loadMe()
    void loadProducts()
    void loadCommunityPosts()
  }, [])

  useEffect(() => {
    if (!merchantId) return
    void loadCommunityPosts()
  }, [merchantId])

  const communityUploadFiles: UploadFile[] = communityImageUrls.map((url, index) => ({
    uid: `community-${index}`,
    name: url.split('/').pop() || `community-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const searchableMerchantPostProductOptions = useMemo(() => {
    const map = new Map<number, Product>()
    const selectedProducts = merchantPostProductCache.filter((product) => selectedMerchantPostProductIds.includes(product.id))
    const baseProducts = merchantPostProductSearchKeyword ? merchantPostProductSearchResults : [...products, ...merchantPostProductCache]
    ;[...baseProducts, ...selectedProducts].forEach((product) => map.set(product.id, product))
    return Array.from(map.values()).map((product) => ({
      value: product.id,
      label: `#${product.id} ${product.name} / ${product.skus[0] ? `￥${yuan(product.skus[0].price_cent)}` : '暂无 SKU'}`,
    }))
  }, [products, merchantPostProductCache, merchantPostProductSearchKeyword, merchantPostProductSearchResults, selectedMerchantPostProductIds])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>社区动态</Title>
          <Paragraph>发布商家动态并查看本店相关社区内容。</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="发布动态">
            <Form form={communityForm} layout="vertical" onFinish={createMerchantPost}>
              <Form.Item label="动态类型" name="type" initialValue="merchant_ad">
                <Select disabled options={[{ value: 'merchant_ad', label: '商家动态' }]} />
              </Form.Item>
              <Form.Item label="分区" name="section" initialValue="merchant">
                <Select disabled options={[{ value: 'merchant', label: '商家动态' }]} />
              </Form.Item>
              <Form.Item label="标题" name="title" rules={[{ required: true }]}>
                <Input placeholder="例如：本店新品上架" />
              </Form.Item>
              <Form.Item label="关联商品" name="product_ids">
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  filterOption={false}
                  onSearch={(value) => searchMerchantPostProducts(value)}
                  onFocus={() => searchMerchantPostProducts()}
                  options={searchableMerchantPostProductOptions}
                  placeholder="搜索并选择本店商品"
                />
              </Form.Item>
              <Form.Item label="话题标签" name="topic_tags">
                <Input placeholder="例如：新品 热销；支持中文逗号、英文逗号或空格" />
              </Form.Item>
              <Form.Item label="图片">
                <Upload
                  multiple
                  listType="picture-card"
                  fileList={communityUploadFiles}
                  beforeUpload={(file) => uploadCommunityImage(file)}
                  onRemove={(file) => {
                    setCommunityImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                    return true
                  }}
                >
                  <Button>上传图片</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="内容" name="content" rules={[{ required: true }]}>
                <Input.TextArea rows={5} />
              </Form.Item>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>发布动态</Button>
            </Form>
          </Card>
        </Col>
        <Col span={24} id="merchant-community">
          <Card
            title="本店动态"
            extra={
              <Space wrap>
                <Select
                  allowClear
                  style={{ width: 160 }}
                  placeholder="社区分区"
                  onChange={(value) => loadCommunityPosts(value)}
                  options={[
                    { value: 'square', label: '综合广场' },
                    { value: 'grass', label: '种草专区' },
                    { value: 'merchant', label: '商家动态' },
                    { value: 'help', label: '询问求助' },
                    { value: 'experience', label: '体验分享' },
                  ]}
                />
                <Button onClick={() => loadCommunityPosts()}>刷新社区</Button>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              {communityPosts.map((post) => (
                <Col span={8} key={post.id}>
                  <Card
                    hoverable
                    size="small"
                    cover={
                      post.image_urls[0]
                        ? <Image preview={false} height={120} src={assetUrl(post.image_urls[0])} style={{ objectFit: 'cover' }} />
                        : <div className="post-cover">{statusText(post.type)}</div>
                    }
                    onClick={() => openCommunityPost(post)}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={post.type === 'grass' ? 'purple' : 'blue'}>{statusText(post.type)}</Tag>
                        <Tag>{post.section}</Tag>
                      </Space>
                      <Text strong ellipsis>{post.title}</Text>
                      <Paragraph ellipsis={{ rows: 2 }}>{post.content}</Paragraph>
                      <Text type="secondary">作者：{post.author?.nickname ?? '-'}</Text>
                      <Text type="secondary">赞 {post.like_count} / 评 {post.comment_count}</Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
            {communityPosts.length === 0 ? <Text type="secondary">暂无社区内容</Text> : null}
          </Card>
        </Col>
      </Row>

      <Drawer
        title={selectedCommunityPost ? `社区帖子 #${selectedCommunityPost.id}` : '社区帖子'}
        width={760}
        open={Boolean(selectedCommunityPost)}
        onClose={() => setSelectedCommunityPost(null)}
      >
        {selectedCommunityPost ? (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Space wrap>
              <Tag color="blue">帖子 #{selectedCommunityPost.id}</Tag>
              <Tag>{statusText(selectedCommunityPost.type)}</Tag>
              <Tag>{selectedCommunityPost.section}</Tag>
              <StatusTag status={selectedCommunityPost.status} />
              <Text type="secondary">作者：{selectedCommunityPost.author?.nickname ?? '-'}</Text>
            </Space>
            <Title level={4}>{selectedCommunityPost.title}</Title>
            <Paragraph>{selectedCommunityPost.content}</Paragraph>
            <Card size="small" title="关联商品">
              {renderCommunityProductCards(selectedCommunityPost.product_ids)}
            </Card>
            {selectedCommunityPost.image_urls.length ? (
              <Image.PreviewGroup>
                <Space wrap>
                  {selectedCommunityPost.image_urls.map((url) => <Image key={url} width={120} src={assetUrl(url)} />)}
                </Space>
              </Image.PreviewGroup>
            ) : null}
            <Divider />
            <Card size="small" title={`评论 ${communityComments.length}`}>
              <Space direction="vertical" style={{ width: '100%' }}>
                {communityComments.map((comment) => (
                  <Card size="small" key={comment.id}>
                    <Space direction="vertical" size={4}>
                      <Text strong>{comment.author?.nickname ?? '-'}</Text>
                      <Text>{comment.content}</Text>
                      <Text type="secondary">评论 #{comment.id} / {new Date(comment.created_at).toLocaleString()}</Text>
                    </Space>
                  </Card>
                ))}
                {communityComments.length === 0 ? <Text type="secondary">暂无评论</Text> : null}
              </Space>
            </Card>
          </Space>
        ) : null}
      </Drawer>

      <DebugLogs logs={logs} />
    </main>
  )
}
