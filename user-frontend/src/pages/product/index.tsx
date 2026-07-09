import {
  Button,
  Card,
  Carousel,
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
import { LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import type { CarouselRef } from 'antd/es/carousel'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApiErrorMessage } from '../../services/http'
import { homeService, type HomeBanner } from '../../services/home'
import {
  productService,
  type Category,
  type ProductListItem,
} from '../../services/product'
import { absoluteAssetUrl, yuan } from '../../utils/format'

const { Text, Title, Paragraph } = Typography

function formatSales(count: number): string {
  if (count < 10) return `已售 ${count} 件`
  if (count < 100) return `已售 ${Math.floor(count / 10) * 10}+`
  if (count < 1000) return `已售 ${Math.floor(count / 100) * 100}+`
  return `已售 ${Math.floor(count / 1000)}k+`
}

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
  const bannerCarouselRef = useRef<CarouselRef>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [banners, setBanners] = useState<HomeBanner[]>([])
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

  const categoriesByParent = useMemo(() => {
    const byParent = new Map<number | null, CategoryTreeItem[]>()
    categoryTree.forEach((category) => {
      const parentId = category.parent_id ?? null
      byParent.set(parentId, [...(byParent.get(parentId) ?? []), category])
    })
    return byParent
  }, [categoryTree])

  const categoryById = useMemo(() => {
    const map = new Map<number, CategoryTreeItem>()
    categoryTree.forEach((category) => map.set(category.id, category))
    return map
  }, [categoryTree])

  const selectedCategoryPath = useMemo(() => {
    if (!categoryId) return []
    const path: CategoryTreeItem[] = []
    let current = categoryById.get(categoryId)
    const visited = new Set<number>()
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      path.unshift(current)
      current = current.parent_id ? categoryById.get(current.parent_id) : undefined
    }
    return path
  }, [categoryById, categoryId])

  const topCategories = useMemo(
    () => (categoriesByParent.get(null) ?? []).filter((category) => category.name !== '本地服务'),
    [categoriesByParent],
  )

  const visibleCategoryLevels = useMemo(() => {
    return selectedCategoryPath
      .map((category) => ({
        parent: category,
        children: categoriesByParent.get(category.id) ?? [],
      }))
      .filter((level) => level.children.length > 0)
  }, [categoriesByParent, selectedCategoryPath])

  async function loadBanners() {
    try {
      const response = await homeService.listBanners()
      setBanners(response.data ?? [])
    } catch {
      setBanners([])
    }
  }

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
    void loadBanners()
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
      {/* ── Page Header ── */}
      <header className="product-header">
        <Title level={3} className="product-header-title">
          发现好物
        </Title>
        <Input
          size="large"
          allowClear
          placeholder="品质生活，从这里开始"
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
      </header>

      <section className="home-banner-section">
        {banners.length > 0 ? (
          <>
            <Carousel ref={bannerCarouselRef} autoplay dots className="home-banner-carousel">
              {banners.map((banner) => {
                const link =
                  banner.target_type === 'product' && banner.target_id
                    ? `/products/${banner.target_id}`
                    : banner.target_type === 'url' && banner.target_url
                      ? banner.target_url
                      : undefined
                const content = (
                  <div className="home-banner-slide">
                    <img
                      src={absoluteAssetUrl(banner.image_url)}
                      alt={banner.title}
                      className="home-banner-image"
                    />
                    <div className="home-banner-copy">
                      <Title level={2} className="home-banner-title">{banner.title}</Title>
                      {banner.subtitle ? <Paragraph className="home-banner-subtitle">{banner.subtitle}</Paragraph> : null}
                    </div>
                  </div>
                )
                return (
                  <div key={banner.id}>
                    {link ? (
                      /^https?:\/\//.test(link) ? (
                        <a href={link} target="_blank" rel="noreferrer" className="home-banner-link">
                          {content}
                        </a>
                      ) : (
                        <Link to={link} className="home-banner-link">
                          {content}
                        </Link>
                      )
                    ) : (
                      content
                    )}
                  </div>
                )
              })}
            </Carousel>
            {banners.length > 1 ? (
              <>
                <Button
                  shape="circle"
                  aria-label="上一张轮播图"
                  icon={<LeftOutlined />}
                  className="home-banner-nav home-banner-nav-prev"
                  onClick={() => bannerCarouselRef.current?.prev()}
                />
                <Button
                  shape="circle"
                  aria-label="下一张轮播图"
                  icon={<RightOutlined />}
                  className="home-banner-nav home-banner-nav-next"
                  onClick={() => bannerCarouselRef.current?.next()}
                />
              </>
            ) : null}
          </>
        ) : (
          <div className="home-banner-slide home-banner-fallback">
            <div className="home-banner-copy">
              <Title level={2} className="home-banner-title">发现好物与真实分享</Title>
              <Paragraph className="home-banner-subtitle">平台轮播图可在管理端“首页轮播”中配置。</Paragraph>
            </div>
          </div>
        )}
      </section>

      {/* ── Filter Bar ── */}
      <div className="product-filter-bar">
        {/* Category chips */}
        <div className="filter-section">
          <Text className="filter-section-label">分类</Text>
          <div className="filter-category-stack">
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
              {topCategories.map((category) => (
                <Button
                  key={category.id}
                  shape="round"
                  type={selectedCategoryPath.some((item) => item.id === category.id) ? 'primary' : 'default'}
                  size="small"
                  onClick={() => setCategoryId(category.id)}
                  className="filter-chip"
                >
                  {category.name}
                </Button>
              ))}
            </div>
            {selectedCategoryPath.length > 0 ? (
              <div className="filter-current-category">
                {selectedCategoryPath.map((item) => item.name).join(' / ')}
              </div>
            ) : null}
            {visibleCategoryLevels.map((level) => (
              <div className="filter-subcategory-row" key={level.parent.id}>
                <Text type="secondary" className="filter-subcategory-label">{level.parent.name}</Text>
                <div className="filter-chips">
                  {level.children.map((category) => (
                    <Button
                      key={category.id}
                      shape="round"
                      type={categoryId === category.id ? 'primary' : 'default'}
                      size="small"
                      onClick={() => setCategoryId(category.id)}
                      className="filter-chip filter-subcategory-chip"
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
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
                { value: 'sales:desc', label: '销量优先' },
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
                {products.map((product, index) => (
                  <Link
                    to={`/products/${product.id}`}
                    key={product.id}
                    className="product-card-link"
                    style={{ animationDelay: `${0.3 + index * 0.04}s` }}
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
                          <div className="pec-cover-view">查看详情 →</div>
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
                          <span className="pec-sales">{formatSales(product.sales_count)}</span>
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
