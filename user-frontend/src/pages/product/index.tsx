import {
  Button,
  Card,
  Empty,
  Image,
  Input,
  InputNumber,
  Pagination,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../../services/http'
import {
  productService,
  type Category,
  type ProductListItem,
} from '../../services/product'
import { absoluteAssetUrl, yuan } from '../../utils/format'

const { Text } = Typography

type CategoryTreeItem = Category & {
  label: string
  depth: number
  parentName?: string
}

type PageData<T> = {
  list?: T[]
  total?: number
  page?: number
  page_size?: number
}

export function ProductPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [keyword, setKeyword] = useState('')
  const [minPriceYuan, setMinPriceYuan] = useState<number | null>(null)
  const [maxPriceYuan, setMaxPriceYuan] = useState<number | null>(null)
  const [productSort, setProductSort] = useState('newest:desc')
  const [products, setProducts] = useState<ProductListItem[]>([])
  const [productPage, setProductPage] = useState(1)
  const [productPageSize, setProductPageSize] = useState(12)
  const [productTotal, setProductTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const categoryTree = useMemo<CategoryTreeItem[]>(() => {
    const childrenByParent = new Map<number | null, Category[]>()
    categories.forEach((category) => {
      const parentId = category.parent_id ?? null
      childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), category])
    })
    childrenByParent.forEach((items) => items.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
    const walk = (parent: Category, depth: number, ancestors: string[]): CategoryTreeItem[] => {
      const labelParts = [...ancestors, parent.name]
      const children = childrenByParent.get(parent.id) ?? []
      return [
        {
          ...parent,
          label: labelParts.join(' / '),
          depth,
          parentName: ancestors[ancestors.length - 1],
        },
        ...children.flatMap((child) => walk(child, depth + 1, labelParts)),
      ]
    }
    return (childrenByParent.get(null) ?? []).flatMap((parent) => walk(parent, 1, []))
  }, [categories])

  async function loadCategories() {
    try {
      const response = await productService.listCategories()
      setCategories((response.data as Category[]) ?? [])
    } catch (error) {
      message.error(`分类列表加载失败：${getApiErrorMessage(error)}`)
    }
  }

  async function loadProducts(nextCategoryId = categoryId, nextPage = productPage, nextPageSize = productPageSize) {
    // 前端校验：最低价大于最高价时不发送请求
    if (minPriceYuan !== null && maxPriceYuan !== null && minPriceYuan > maxPriceYuan) {
      return
    }
    const [sortBy, sortOrder] = productSort.split(':')
    setLoading(true)
    try {
      const response = await productService.listProducts({
        keyword: keyword || undefined,
        category_id: nextCategoryId,
        min_price_cent: minPriceYuan === null ? undefined : Math.round(minPriceYuan * 100),
        max_price_cent: maxPriceYuan === null ? undefined : Math.round(maxPriceYuan * 100),
        sort_by: sortBy,
        sort_order: sortOrder,
        page: nextPage,
        page_size: nextPageSize,
      })
      const data = response.data as PageData<ProductListItem>
      setProducts(data?.list ?? [])
      setProductTotal(data?.total ?? 0)
      setProductPage(data?.page ?? nextPage)
      setProductPageSize(data?.page_size ?? nextPageSize)
    } catch (error) {
      message.error(`商品列表加载失败：${getApiErrorMessage(error)}`)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCategories()
    void loadProducts(undefined, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadProducts(categoryId, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, minPriceYuan, maxPriceYuan, productSort])

  return (
    <div className="product-page">
      {/* ── Hero Banner ── */}
      <div className="product-hero">
        <div className="product-hero-bg" />
        <div className="product-hero-inner">
          <h1 className="product-hero-title">发现好物</h1>
          <p className="product-hero-subtitle">品质生活，从这里开始</p>
          <Input
            size="large"
            allowClear
            placeholder="搜索你想要的商品…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={() => loadProducts(categoryId, 1)}
            className="product-search-bar"
            suffix={
              <SearchOutlined
                style={{ color: '#3598ff', fontSize: 18, cursor: 'pointer' }}
                onClick={() => loadProducts(categoryId, 1)}
              />
            }
          />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="product-filter-bar">
        {/* Category chips */}
        <div className="filter-section">
          <Text className="filter-section-label">分类</Text>
          <div className="filter-chips">
            <Button
              shape="round"
              type={categoryId === undefined ? 'primary' : 'default'}
              size="small"
              onClick={() => setCategoryId(undefined)}
              className="filter-chip"
            >
              全部
            </Button>
            {categoryTree.filter((cat) => cat.name !== '本地服务').slice(0, 24).map((cat) => (
              <Button
                key={cat.id}
                shape="round"
                type={categoryId === cat.id ? 'primary' : 'default'}
                size="small"
                onClick={() => setCategoryId(cat.id)}
                className="filter-chip"
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Price + Sort + Actions */}
        <div className="filter-actions">
          <div className="filter-group">
            <Text className="filter-group-label">价格</Text>
            <Space.Compact>
              <InputNumber
                min={0}
                precision={2}
                placeholder="最低"
                value={minPriceYuan ?? undefined}
                onChange={(v) => setMinPriceYuan(v === null ? null : Number(v))}
                className="filter-price-input"
              />
              <span className="filter-price-sep">—</span>
              <InputNumber
                min={0}
                precision={2}
                placeholder="最高"
                value={maxPriceYuan ?? undefined}
                onChange={(v) => setMaxPriceYuan(v === null ? null : Number(v))}
                className="filter-price-input"
              />
            </Space.Compact>
          </div>

          <div className="filter-group">
            <Text className="filter-group-label">排序</Text>
            <Select
              value={productSort}
              onChange={setProductSort}
              className="filter-sort-select"
              options={[
                { value: 'newest:desc', label: '最新上架' },
                { value: 'price:asc', label: '价格升序' },
                { value: 'price:desc', label: '价格降序' },
              ]}
            />
          </div>

          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => {
              setKeyword('')
              setCategoryId(undefined)
              setMinPriceYuan(null)
              setMaxPriceYuan(null)
              setProductSort('newest:desc')
            }}
            className="btn-filter-apply"
          >
            重置
          </Button>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <div className="product-section">
        <Skeleton loading={loading} active paragraph={{ rows: 10 }}>
          {products.length === 0 ? (
            <Empty
              description="暂无符合条件的商品"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '80px 0' }}
            />
          ) : (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <Link
                    to={`/products/${product.id}`}
                    key={product.id}
                    className="product-card-link"
                  >
                    <Card
                      hoverable
                      className="product-ec-card"
                      cover={
                        <div className="pec-cover">
                          {product.cover_url ? (
                            <Image
                              preview={false}
                              src={absoluteAssetUrl(product.cover_url)}
                              alt={product.name}
                              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23f5f5f5' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' fill='%23ccc' text-anchor='middle' dy='.3em' font-size='14'%3E暂无图片%3C/text%3E%3C/svg%3E"
                            />
                          ) : (
                            <div className="pec-cover-placeholder">
                              <Text type="secondary">暂无图片</Text>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div className="pec-info">
                        <div className="pec-tags">
                          {product.tags.slice(0, 2).map((tag) => (
                            <Tag key={tag} className="pec-tag-label">{tag}</Tag>
                          ))}
                        </div>
                        <Text strong ellipsis className="pec-name" title={product.name}>
                          {product.name}
                        </Text>
                        <Text type="secondary" ellipsis className="pec-merchant">
                          {product.merchant_name}
                        </Text>
                        <div className="pec-price-row">
                          <span className="pec-price">¥{yuan(product.price_cent)}</span>
                          {product.market_price_cent ? (
                            <span className="pec-market-price">¥{yuan(product.market_price_cent)}</span>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>

              <div className="product-pagination">
                <Pagination
                  current={productPage}
                  pageSize={productPageSize}
                  total={productTotal}
                  showSizeChanger
                  showTotal={(total) => `共 ${total} 件商品`}
                  onChange={(page, pageSize) => loadProducts(categoryId, page, pageSize)}
                />
              </div>
            </>
          )}
        </Skeleton>
      </div>
    </div>
  )
}
