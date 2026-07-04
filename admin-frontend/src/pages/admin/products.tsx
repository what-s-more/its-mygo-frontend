import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import {
  DebugLogs,
  StatusTag,
  formatError,
  pickData,
  type ApiLog,
  yuan,
  yuanToCent,
} from '../workbench/adminShared'
import {
  SESSION,
  type Category,
  type CategoryTreeItem,
  type PageResult,
  type Product,
} from './shared'

const { Title, Paragraph, Text } = Typography

export function AdminProductsPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

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

  async function loadCategories() {
    const data = await run<Category[]>('分类列表', () => http.get('/categories'))
    setCategories(data ?? [])
  }

  async function loadProducts(values?: {
    keyword?: string
    category_id?: number
    merchant_id?: number
    min_price_yuan?: number
    max_price_yuan?: number
    sort?: string
  }) {
    const [sortBy, sortOrder] = (values?.sort || 'newest:desc').split(':')
    const data = await run<PageResult<Product>>('商品列表', () =>
      http.get('/admin/products', {
        params: {
          keyword: values?.keyword,
          category_id: values?.category_id,
          merchant_id: values?.merchant_id,
          min_price_cent: values?.min_price_yuan === undefined ? undefined : yuanToCent(values.min_price_yuan),
          max_price_cent: values?.max_price_yuan === undefined ? undefined : yuanToCent(values.max_price_yuan),
          sort_by: sortBy,
          sort_order: sortOrder,
        },
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    setProducts(data?.list ?? [])
  }

  async function productStatus(id: number, action: 'publish' | 'unpublish') {
    await run(action === 'publish' ? '商品上架' : '商品下架', () =>
      http.post(`/admin/products/${id}/${action}`, undefined, { headers: { 'X-Admin-Session': SESSION } }),
    )
    await loadProducts()
  }

  useEffect(() => {
    void loadCategories()
    void loadProducts()
  }, [])

  const productColumns: ColumnsType<Product> = [
    { title: '商品', render: (_, row) => <span><Text strong>{row.name}</Text><br /><Text type="secondary">商品 #{row.id} / 店铺 #{row.merchant.id} / 分类 #{row.category_id ?? '-'}</Text></span> },
    { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
    {
      title: 'SKU',
      render: (_, row) => row.skus.map((sku) => (
        <Tag key={sku.id}>
          #{sku.id} ￥{yuan(sku.price_cent)}
          {sku.market_price_cent ? ` / 划线 ￥${yuan(sku.market_price_cent)}` : ''} 库存 {sku.stock}
        </Tag>
      )),
    },
    { title: '管理', render: (_, row) => <Space><Button onClick={() => productStatus(row.id, 'publish')}>上架</Button><Button danger onClick={() => productStatus(row.id, 'unpublish')}>下架</Button></Space> },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>商品监管</Title>
          <Paragraph>查看并管理全平台商品上下架状态</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="全平台商品">
            <Form layout="inline" onFinish={loadProducts}>
              <Form.Item label="关键词" name="keyword"><Input /></Form.Item>
              <Form.Item label="分类" name="category_id">
                <Select allowClear showSearch optionFilterProp="label" style={{ width: 220 }} options={categoryOptions} />
              </Form.Item>
              <Form.Item label="店铺 ID" name="merchant_id"><InputNumber min={1} /></Form.Item>
              <Form.Item label="最低价" name="min_price_yuan"><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item>
              <Form.Item label="最高价" name="max_price_yuan"><InputNumber min={0} precision={2} addonAfter="元" /></Form.Item>
              <Form.Item label="排序" name="sort" initialValue="newest:desc">
                <Select style={{ width: 140 }} options={[
                  { value: 'newest:desc', label: '最新上架' },
                  { value: 'price:asc', label: '价格升序' },
                  { value: 'price:desc', label: '价格降序' },
                  { value: 'sales:desc', label: '销量优先' },
                ]} />
              </Form.Item>
              <Button type="primary" htmlType="submit">查询</Button>
              <Button onClick={() => loadProducts()}>刷新</Button>
            </Form>
            <Table rowKey="id" columns={productColumns} dataSource={products} pagination={{ pageSize: 8 }} />
          </Card>
        </Col>
      </Row>

      <DebugLogs logs={logs} />
    </main>
  )
}
