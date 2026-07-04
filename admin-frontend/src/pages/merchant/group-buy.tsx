import { Button, Card, Form, Input, InputNumber, Select, Table, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
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
import { SESSION, type AdminProfile, type GroupBuyActivity, type PageResult, type Product, directList, pageList } from './shared'

const { Title, Paragraph, Text } = Typography

export function MerchantGroupBuyPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [groupBuys, setGroupBuys] = useState<GroupBuyActivity[]>([])
  const [groupBuyForm] = Form.useForm()

  const merchantId = profile?.merchant_id ?? null

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

  async function loadGroupBuys() {
    const data = await run<GroupBuyActivity[]>('本店拼团活动', () =>
      http.get('/admin/promotions/group-buy', { headers: { 'X-Admin-Session': SESSION } }),
    )
    const list = directList<GroupBuyActivity>(data)
    setGroupBuys(merchantId ? list.filter((activity) => activity.merchant_id === merchantId) : [])
  }

  async function createGroupBuy(values: {
    product_sku: string
    name: string
    group_size: number
    group_price_yuan: number
  }) {
    const [productId, skuId] = values.product_sku.split(':').map(Number)
    if (!productId || !skuId) return
    await run('创建拼团活动', () =>
      http.post(
        '/admin/promotions/group-buy',
        {
          product_id: productId,
          sku_id: skuId,
          name: values.name,
          group_size: values.group_size,
          group_price_cent: yuanToCent(values.group_price_yuan),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadGroupBuys()
  }

  function presetGroupBuy(product: Product, sku: Product['skus'][number]) {
    groupBuyForm.setFieldsValue({
      product_sku: `${product.id}:${sku.id}`,
      name: `${product.name} ${sku.name} 拼团价`,
      group_size: 2,
      group_price_yuan: Number(yuan(sku.price_cent)),
    })
    api.info('已填入拼团商品配置，请到“拼团配置”区域确认价格后创建')
  }

  async function disableGroupBuy(activityId: number) {
    await run('停用拼团活动', () =>
      http.post(`/admin/promotions/group-buy/${activityId}/disable`, undefined, {
        headers: { 'X-Admin-Session': SESSION },
      }),
    )
    await loadGroupBuys()
  }

  useEffect(() => {
    void loadMe()
    void loadProducts()
    void loadGroupBuys()
  }, [])

  useEffect(() => {
    if (!merchantId) return
    void loadGroupBuys()
  }, [merchantId])

  const skuOptions = products.flatMap((product) =>
    product.skus.map((sku) => ({
      value: `${product.id}:${sku.id}`,
      label: `商品 #${product.id} ${product.name} / SKU #${sku.id} ${sku.name} / ￥${yuan(sku.price_cent)}`,
    })),
  )

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>拼团配置</Title>
          <Paragraph>选择本店商品 SKU 配置为拼团活动。</Paragraph>
        </div>
      </section>

      <Card
        title="拼团配置"
        extra={<Button onClick={() => { void loadProducts(); void loadGroupBuys() }}>刷新商品与拼团</Button>}
      >
        <Paragraph type="secondary">
          先在“商品管理”中维护商品与 SKU，再在这里选择 SKU 配置为拼团商品。拼团只支持用户直接购买，不进入购物车，不叠加满减或优惠券，也不参与社区种草；用户可使用积分抵扣。
        </Paragraph>
        <Form
          form={groupBuyForm}
          layout="inline"
          onFinish={createGroupBuy}
          initialValues={{ group_size: 2, group_price_yuan: 9.9 }}
        >
          <Form.Item label="商品 SKU" name="product_sku" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              style={{ width: 420 }}
              placeholder="选择本店商品 SKU 上传为拼团商品"
              options={skuOptions}
            />
          </Form.Item>
          <Form.Item label="活动名" name="name" rules={[{ required: true }]}>
            <Input placeholder="如 2 人成团体验价" />
          </Form.Item>
          <Form.Item label="人数" name="group_size">
            <Select style={{ width: 100 }} options={[{ value: 2, label: '2 人' }, { value: 3, label: '3 人' }]} />
          </Form.Item>
          <Form.Item label="拼团价（元）" name="group_price_yuan" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} />
          </Form.Item>
          <Button type="primary" htmlType="submit" disabled={!merchantId}>创建拼团</Button>
          <Button onClick={loadGroupBuys}>刷新</Button>
        </Form>
        <Table
          rowKey="id"
          dataSource={groupBuys}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: '活动 ID', dataIndex: 'id', render: (id) => <Tag color="purple">#{id}</Tag> },
            { title: '名称', dataIndex: 'name' },
            { title: '商品 / SKU', render: (_, record) => `商品 #${record.product_id} / SKU #${record.sku_id}` },
            { title: '拼团价', dataIndex: 'group_price_cent', render: (value) => `￥${yuan(value)}` },
            { title: '人数', dataIndex: 'group_size', render: (value) => `${value} 人` },
            {
              title: '正在拼',
              render: (_, record) => record.active_groups.length
                ? record.active_groups.map((group) => `团 #${group.id} ${group.joined_count}/${group.group_size}`).join('；')
                : '暂无',
            },
            { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
            {
              title: '操作',
              render: (_, record) => (
                <Button danger disabled={record.status !== 'active'} onClick={() => disableGroupBuy(record.id)}>停用</Button>
              ),
            },
          ]}
        />
      </Card>

      <DebugLogs logs={logs} />
    </main>
  )
}
