import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Input, List, Modal, Radio, Space, Table, Tag, Typography } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { productService, type ProductDetail, type ProductListItem } from '../../services/product'
import { orderService } from '../../services/order'
import { DataPanel } from '../../components/DataPanel'
import { usePage } from '../../hooks/usePage'

const { Text, Paragraph } = Typography

function yuan(v?: number | null) {
  return ((v ?? 0) / 100).toFixed(2)
}

export function ProductPage() {
  const { message } = App.useApp()
  const [keyword, setKeyword] = useState('')
  const [detail, setDetail] = useState<ProductDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSkuId, setSelectedSkuId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)

  const fetchProducts = useCallback(
    (page: number, pageSize: number) => productService.listProducts(page, pageSize),
    [],
  )
  const { page, pageSize, total, list, loading, load, changePage, lastResult, setLastResult } = usePage<ProductListItem>(fetchProducts)

  useEffect(() => {
    void load(1)
  }, [load])

  async function openProduct(productId: number) {
    try {
      const r = await productService.getProduct(productId)
      setDetail(r.data)
      setDetailOpen(true)
      setSelectedSkuId(r.data.skus[0]?.id ?? null)
      setQuantity(1)
      setLastResult({ title: '商品详情', ok: true, data: r.data })
    } catch (e) {
      setLastResult({ title: '商品详情', ok: false, data: e })
      message.error('获取商品详情失败')
    }
  }

  async function addCart() {
    if (!selectedSkuId) return
    try {
      await orderService.addCartItem({ sku_id: selectedSkuId, quantity })
      message.success('已加入购物车')
    } catch {
      message.error('加入购物车失败，请先登录')
    }
  }

  const filtered = keyword
    ? list.filter((p) => p.name.includes(keyword) || p.merchant_name.includes(keyword))
    : list

  return (
    <div className="shop-page">
      <Card
        title="商品浏览"
        extra={
          <Space>
            <Input.Search
              placeholder="按商品/店铺筛选"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 240 }}
              onSearch={() => void load(1)}
            />
            <Button onClick={() => void load(page)}>刷新</Button>
          </Space>
        }
      >
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 5 }}
          dataSource={filtered}
          loading={loading}
          renderItem={(product) => (
            <List.Item>
              <Card
                hoverable
                cover={
                  <div style={{
                    height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, rgba(31,111,255,0.16), rgba(18,168,143,0.18))',
                    color: '#426280', fontWeight: 900, fontSize: 16,
                  }}>
                    商品图
                  </div>
                }
                onClick={() => void openProduct(product.id)}
                actions={[<Button key="cart" type="primary" size="small" icon={<ShoppingCartOutlined />} onClick={(e) => { e.stopPropagation(); void openProduct(product.id) }}>选择</Button>]}
              >
                <Card.Meta
                  title={product.name}
                  description={
                    <Space direction="vertical" size={4}>
                      <Text type="secondary">{product.merchant_name}</Text>
                      <Space><Tag color="blue">商品 #{product.id}</Tag><Tag color="blue">店铺 #{product.merchant_id}</Tag></Space>
                      <Text strong style={{ color: '#d92d20', fontSize: 20 }}>￥{yuan(product.price_cent)}</Text>
                      <Text type="secondary">销量 {product.sales_count}</Text>
                    </Space>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={() => void load(1)} disabled={loading}>刷新商品</Button>
        </div>
      </Card>

      <Modal
        title={detail?.name}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={700}
      >
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Paragraph>{detail.description || '暂无描述'}</Paragraph>
            <Table
              dataSource={detail.skus}
              rowKey="id"
              size="small"
              pagination={false}
              columns={[
                { title: '选择', render: (_, sku) => <Radio checked={selectedSkuId === sku.id} onChange={() => setSelectedSkuId(sku.id)} /> },
                { title: '规格', render: (_, sku) => <>{sku.name} <Tag color="blue">SKU #{sku.id}</Tag></> },
                { title: '价格', render: (_, sku) => <Text strong style={{ color: '#d92d20' }}>￥{yuan(sku.price_cent)}</Text> },
                { title: '库存', dataIndex: 'stock' },
              ]}
            />
            <Space>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} style={{ width: 80 }} />
              <Button type="primary" icon={<ShoppingCartOutlined />} onClick={addCart}>加入购物车</Button>
            </Space>
          </Space>
        )}
      </Modal>

      <DataPanel result={lastResult} />
    </div>
  )
}
