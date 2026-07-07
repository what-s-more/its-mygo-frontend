import {
  Button,
  Card,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
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
  yuanToCent,
  assetUrl,
} from '../workbench/adminShared'
import {
  SESSION,
  type AdminProfile,
  type Category,
  type CategoryTreeItem,
  type PageResult,
  type Product,
  pageList,
  directList,
} from './shared'

const { Title, Paragraph, Text } = Typography

export function MerchantProductsPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [detailImageUrls, setDetailImageUrls] = useState<string[]>([])
  const [editImageUrls, setEditImageUrls] = useState<string[]>([])
  const [editDetailImageUrls, setEditDetailImageUrls] = useState<string[]>([])
  const [productFilterForm] = Form.useForm()

  const merchantId = profile?.merchant_id ?? null

  const categoryTree = useMemo<CategoryTreeItem[]>(() => {
    const childrenByParent = new Map<number | null, Category[]>()
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), category])
    })
    childrenByParent.forEach((items) => items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
    const walk = (category: Category, depth: number, ancestors: string[]): CategoryTreeItem[] => {
      const labelParts = [...ancestors, category.name]
      const children = childrenByParent.get(category.id) ?? []
      return [
        {
          ...category,
          label: labelParts.join(' / '),
          depth,
          parentName: ancestors[ancestors.length - 1],
        },
        ...children.flatMap((child) => walk(child, depth + 1, labelParts)),
      ]
    }
    return (childrenByParent.get(null) ?? []).flatMap((category) => walk(category, 1, []))
  }, [categories])

  const categoryOptions = useMemo(
    () => categoryTree.map((item) => ({ value: item.id, label: `#${item.id} ${item.label}` })),
    [categoryTree],
  )

  const categoryLabelById = useMemo(() => {
    const map = new Map<number, string>()
    categoryTree.forEach((item) => map.set(item.id, `#${item.id} ${item.label}`))
    return map
  }, [categoryTree])

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

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => http.get('/categories'))
    setCategories(directList<Category>(data))
  }

  async function loadProducts(values?: { min_price_yuan?: number; max_price_yuan?: number; sort?: string }) {
    const formValues = values ?? productFilterForm.getFieldsValue()
    const [sortBy, sortOrder] = (formValues.sort || 'newest:desc').split(':')
    const data = await run<PageResult<Product>>('本店商品', () =>
      http.get('/admin/products', {
        params: {
          min_price_cent: formValues.min_price_yuan === undefined ? undefined : yuanToCent(formValues.min_price_yuan),
          max_price_cent: formValues.max_price_yuan === undefined ? undefined : yuanToCent(formValues.max_price_yuan),
          sort_by: sortBy,
          sort_order: sortOrder,
        },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setProducts(pageList<Product>(data))
  }

  async function createProduct(values: {
    category_id?: number
    name: string
    description?: string
    sku_name: string
    price_yuan: number
    market_price_yuan?: number
    stock: number
  }) {
    if (!merchantId) {
      api.warning('当前账号尚未绑定店铺，请先完成平台审核')
      return
    }
    await run('创建商品', () =>
      http.post(
        '/admin/products',
        {
          merchant_id: merchantId,
          category_id: values.category_id ?? null,
          name: values.name,
          description: values.description ?? '',
          cover_url: imageUrls[0] ?? null,
          image_urls: imageUrls,
          detail_image_urls: detailImageUrls,
          skus: [
            {
              name: values.sku_name,
              price_cent: yuanToCent(values.price_yuan),
              market_price_cent: values.market_price_yuan === undefined ? null : yuanToCent(values.market_price_yuan),
              stock: values.stock,
              spec_values: { 规格: values.sku_name },
            },
          ],
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    setImageUrls([])
    setDetailImageUrls([])
    await loadProducts()
  }

  function selectProduct(product: Product) {
    setSelectedProduct(product)
    setEditImageUrls(product.images?.length ? product.images : product.cover_url ? [product.cover_url] : [])
    setEditDetailImageUrls(product.detail_images ?? [])
  }

  async function updateSelectedProduct(values: {
    category_id?: number
    name: string
    description?: string
  }) {
    if (!selectedProduct) return
    await run('修改商品信息', () =>
      http.put(
        `/admin/products/${selectedProduct.id}`,
        {
          category_id: values.category_id ?? null,
          name: values.name,
          description: values.description ?? '',
          cover_url: editImageUrls[0] ?? null,
          image_urls: editImageUrls,
          detail_image_urls: editDetailImageUrls,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await reloadSelectedProduct(selectedProduct.id)
    await loadProducts()
  }

  async function updateSku(
    skuId: number,
    values: { name?: string; price_yuan?: number; market_price_yuan?: number; stock?: number },
  ) {
    if (!selectedProduct) return
    await run('修改 SKU', () =>
      http.patch(
        `/admin/products/${selectedProduct.id}/skus/${skuId}`,
        {
          name: values.name,
          price_cent: values.price_yuan === undefined ? undefined : yuanToCent(values.price_yuan),
          market_price_cent: values.market_price_yuan === undefined ? undefined : yuanToCent(values.market_price_yuan),
          stock: values.stock,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await reloadSelectedProduct(selectedProduct.id)
    await loadProducts()
  }

  async function addSku(values: { name: string; price_yuan: number; market_price_yuan?: number; stock: number }) {
    if (!selectedProduct) return
    await run('新增 SKU', () =>
      http.post(
        `/admin/products/${selectedProduct.id}/skus`,
        {
          name: values.name,
          price_cent: yuanToCent(values.price_yuan),
          market_price_cent: values.market_price_yuan === undefined ? null : yuanToCent(values.market_price_yuan),
          stock: values.stock,
          spec_values: { 规格: values.name },
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await reloadSelectedProduct(selectedProduct.id)
    await loadProducts()
  }

  async function reloadSelectedProduct(productId: number) {
    const data = await run<Product>('商品详情', () =>
      http.get(`/admin/products/${productId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) selectProduct(data)
  }

  async function productStatus(productId: number, action: 'publish' | 'unpublish') {
    await run(action === 'publish' ? '商品上架' : '商品下架', () =>
      http.post(`/admin/products/${productId}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadProducts()
  }

  async function uploadImage(file: File) {
    const data = await run<{ url: string }>('上传商品图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setImageUrls((items) => [...items, data.url])
    return false
  }

  async function uploadEditImage(file: File) {
    const data = await run<{ url: string }>('上传商品编辑图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setEditImageUrls((items) => [...items, data.url])
    return false
  }

  async function uploadDetailImage(file: File) {
    const data = await run<{ url: string }>('上传商品详情图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setDetailImageUrls((items) => [...items, data.url])
    return false
  }

  async function uploadEditDetailImage(file: File) {
    const data = await run<{ url: string }>('上传商品编辑详情图片', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) setEditDetailImageUrls((items) => [...items, data.url])
    return false
  }

  useEffect(() => {
    void loadMe()
    void loadCategories()
    void loadProducts()
  }, [])

  const uploadFiles: UploadFile[] = imageUrls.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `image-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const editUploadFiles: UploadFile[] = editImageUrls.map((url, index) => ({
    uid: `${index}`,
    name: url.split('/').pop() || `edit-image-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const detailUploadFiles: UploadFile[] = detailImageUrls.map((url, index) => ({
    uid: `detail-${index}`,
    name: url.split('/').pop() || `detail-image-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const editDetailUploadFiles: UploadFile[] = editDetailImageUrls.map((url, index) => ({
    uid: `edit-detail-${index}`,
    name: url.split('/').pop() || `edit-detail-image-${index}`,
    status: 'done',
    url: assetUrl(url),
  }))

  const productColumns: ColumnsType<Product> = [
    {
      title: '商品',
      dataIndex: 'name',
      width: 360,
      render: (_, record) => (
        <Space align="start" style={{ minWidth: 300 }}>
          {record.cover_url ? <Image width={64} height={64} src={assetUrl(record.cover_url)} /> : <div className="table-thumb">图</div>}
          <Space direction="vertical" size={4}>
            <Text strong>{record.name}</Text>
            <Text type="secondary">商品 #{record.id}</Text>
            <Text type="secondary">
              分类 {record.category_id ? categoryLabelById.get(record.category_id) ?? `#${record.category_id}` : '-'}
            </Text>
          </Space>
        </Space>
      ),
    },
    { title: '状态', dataIndex: 'status', width: 110, render: (status) => <StatusTag status={status} /> },
    {
      title: 'SKU',
      width: 420,
      render: (_, record) =>
        record.skus.map((sku) => (
          <div key={sku.id} className="sku-line">
            <Tag>SKU #{sku.id}</Tag>
            <Text>{sku.name}</Text>
            <Text strong>￥{yuan(sku.price_cent)}</Text>
            {sku.market_price_cent ? <Text delete type="secondary">￥{yuan(sku.market_price_cent)}</Text> : null}
            <Tag color="blue">库存 {sku.stock}</Tag>
          </div>
        )),
    },
    {
      title: '操作',
      width: 190,
      render: (_, record) => (
        <Space wrap>
          <Button onClick={() => selectProduct(record)}>编辑</Button>
          <Button onClick={() => productStatus(record.id, 'publish')}>上架</Button>
          <Button danger onClick={() => productStatus(record.id, 'unpublish')}>下架</Button>
        </Space>
      ),
    },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>商品管理</Title>
          <Paragraph>上传商品并维护 SKU 价格库存</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={10} id="merchant-create-product">
          <Card title="上传商品">
            <Form layout="vertical" onFinish={createProduct} initialValues={{ sku_name: '默认规格', price_yuan: 19.9, stock: 20 }}>
              <Form.Item label="分类" name="category_id">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="选择商品分类"
                  options={categoryOptions}
                />
              </Form.Item>
              <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item label="商品描述" name="description">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item label="商品图片" tooltip="可一次选择多张图片，第一张作为封面，其余在商品详情中展示">
                <Upload
                  multiple
                  listType="picture-card"
                  fileList={uploadFiles}
                  beforeUpload={(file) => uploadImage(file)}
                  onRemove={(file) => {
                    setImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                    return true
                  }}
                >
                  <Button>上传图片</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="商品详情图片" tooltip="图文详情区单独展示，不参与商品轮播图">
                <Upload
                  multiple
                  listType="picture-card"
                  fileList={detailUploadFiles}
                  beforeUpload={(file) => uploadDetailImage(file)}
                  onRemove={(file) => {
                    setDetailImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                    return true
                  }}
                >
                  <Button>上传详情图</Button>
                </Upload>
              </Form.Item>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item label="SKU 名称" name="sku_name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="价格（元）" name="price_yuan" rules={[{ required: true }]}>
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="划线价（元）" name="market_price_yuan">
                    <InputNumber min={0} precision={2} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item label="库存" name="stock" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" disabled={!merchantId}>创建并上架</Button>
            </Form>
          </Card>
        </Col>
        <Col span={14} id="merchant-products">
          <Card title="本店商品" extra={<Button onClick={() => loadProducts()}>刷新</Button>}>
            <Form
              form={productFilterForm}
              layout="inline"
              onFinish={loadProducts}
              initialValues={{ sort: 'newest:desc' }}
            >
              <Form.Item label="最低价" name="min_price_yuan">
                <InputNumber min={0} precision={2} addonAfter="元" />
              </Form.Item>
              <Form.Item label="最高价" name="max_price_yuan">
                <InputNumber min={0} precision={2} addonAfter="元" />
              </Form.Item>
              <Form.Item label="排序" name="sort">
                <Select
                  style={{ width: 140 }}
                  options={[
                    { value: 'newest:desc', label: '最新上架' },
                    { value: 'price:asc', label: '价格升序' },
                    { value: 'price:desc', label: '价格降序' },
                    { value: 'sales:desc', label: '销量优先' },
                  ]}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
            </Form>
            <Table
              rowKey="id"
              columns={productColumns}
              dataSource={products}
              pagination={{ pageSize: 6 }}
              scroll={{ x: 1120 }}
            />
            {selectedProduct ? (
              <Card
                size="small"
                className="section-card"
                title={`编辑商品 #${selectedProduct.id}`}
                extra={<Button onClick={() => setSelectedProduct(null)}>关闭</Button>}
              >
                <Form
                  layout="vertical"
                  onFinish={updateSelectedProduct}
                  initialValues={{
                    category_id: selectedProduct.category_id ?? undefined,
                    name: selectedProduct.name,
                    description: selectedProduct.description,
                  }}
                  key={`product-${selectedProduct.id}`}
                >
                  <Row gutter={12}>
                    <Col span={8}>
                      <Form.Item label="分类" name="category_id">
                        <Select allowClear showSearch optionFilterProp="label" options={categoryOptions} />
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="商品描述" name="description">
                        <Input.TextArea rows={3} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="商品图片">
                        <Upload
                          multiple
                          listType="picture-card"
                          fileList={editUploadFiles}
                          beforeUpload={(file) => uploadEditImage(file)}
                          onRemove={(file) => {
                            setEditImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                            return true
                          }}
                        >
                          <Button>上传图片</Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="商品详情图片">
                        <Upload
                          multiple
                          listType="picture-card"
                          fileList={editDetailUploadFiles}
                          beforeUpload={(file) => uploadEditDetailImage(file)}
                          onRemove={(file) => {
                            setEditDetailImageUrls((items) => items.filter((item) => assetUrl(item) !== file.url))
                            return true
                          }}
                        >
                          <Button>上传详情图</Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button type="primary" htmlType="submit">保存商品信息</Button>
                </Form>

                <Card size="small" title="SKU 规格" className="section-card">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {selectedProduct.skus.map((sku) => (
                      <Form
                        key={sku.id}
                        layout="inline"
                        onFinish={(values) => updateSku(sku.id, values)}
                        initialValues={{
                          name: sku.name,
                          price_yuan: Number(yuan(sku.price_cent)),
                          market_price_yuan: sku.market_price_cent ? Number(yuan(sku.market_price_cent)) : undefined,
                          stock: sku.stock,
                        }}
                      >
                        <Form.Item label={`SKU #${sku.id}`} name="name" rules={[{ required: true }]}>
                          <Input style={{ width: 140 }} />
                        </Form.Item>
                        <Form.Item label="价格（元）" name="price_yuan" rules={[{ required: true }]}>
                          <InputNumber min={0} precision={2} />
                        </Form.Item>
                        <Form.Item label="划线价（元）" name="market_price_yuan">
                          <InputNumber min={0} precision={2} />
                        </Form.Item>
                        <Form.Item label="库存" name="stock" rules={[{ required: true }]}>
                          <InputNumber min={0} />
                        </Form.Item>
                        <Button type="primary" htmlType="submit">保存 SKU</Button>
                      </Form>
                    ))}
                    <Form layout="inline" onFinish={addSku} initialValues={{ name: '新规格', price_yuan: 19.9, stock: 10 }}>
                      <Form.Item label="新增 SKU" name="name" rules={[{ required: true }]}>
                        <Input style={{ width: 140 }} />
                      </Form.Item>
                      <Form.Item label="价格（元）" name="price_yuan" rules={[{ required: true }]}>
                        <InputNumber min={0} precision={2} />
                      </Form.Item>
                      <Form.Item label="划线价（元）" name="market_price_yuan">
                        <InputNumber min={0} precision={2} />
                      </Form.Item>
                      <Form.Item label="库存" name="stock" rules={[{ required: true }]}>
                        <InputNumber min={0} />
                      </Form.Item>
                      <Button htmlType="submit">新增 SKU</Button>
                    </Form>
                  </Space>
                </Card>
              </Card>
            ) : null}
          </Card>
        </Col>
      </Row>

      <DebugLogs logs={logs} />
    </main>
  )
}
