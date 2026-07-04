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
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import {
  DebugLogs,
  StatusTag,
  formatError,
  ids,
  pickData,
  type ApiLog,
  yuan,
  yuanToCent,
} from '../workbench/adminShared'
import {
  SESSION,
  type Coupon,
  type FullDiscount,
  type MemberPointsConfig,
} from './shared'

const { Title, Paragraph, Text } = Typography

export function AdminCouponsPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [fullDiscounts, setFullDiscounts] = useState<FullDiscount[]>([])
  const [memberPointsConfig, setMemberPointsConfig] = useState<MemberPointsConfig | null>(null)
  const [levelRules, setLevelRules] = useState<MemberPointsConfig['level_rules']>([])
  const [form] = Form.useForm()
  const [grantUserIds, setGrantUserIds] = useState('')

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

  async function loadCoupons() {
    const data = await run<Coupon[]>('优惠券列表', () => http.get('/admin/promotions/coupons', { headers: { 'X-Admin-Session': SESSION } }))
    setCoupons(data ?? [])
  }

  async function loadFullDiscounts() {
    const data = await run<FullDiscount[]>('满减活动列表', () =>
      http.get('/admin/promotions/full-discounts', { headers: { 'X-Admin-Session': SESSION } }),
    )
    setFullDiscounts(data ?? [])
  }

  async function loadMemberPointsConfig() {
    const data = await run<MemberPointsConfig>('会员积分配置', () =>
      http.get('/admin/settings/member-points', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) {
      setMemberPointsConfig(data)
      setLevelRules(data.level_rules)
      form.setFieldsValue({
        sign_in_base_points: data.sign_in_base_points,
        sign_in_streak_increment: data.sign_in_streak_increment,
        sign_in_max_points: data.sign_in_max_points,
        points_to_yuan_rate: data.points_to_yuan_rate,
        max_points_discount_percent: data.max_points_discount_percent,
      })
    }
  }

  async function handleSave(values: {
    sign_in_base_points: number
    sign_in_streak_increment: number
    sign_in_max_points: number
    points_to_yuan_rate: number
    max_points_discount_percent: number
  }) {
    const payload: MemberPointsConfig = {
      ...values,
      level_rules: levelRules,
    }
    const data = await run<MemberPointsConfig>('保存会员积分配置', () =>
      http.put('/admin/settings/member-points', payload, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) {
      setMemberPointsConfig(data)
      setLevelRules(data.level_rules)
      form.setFieldsValue({
        sign_in_base_points: data.sign_in_base_points,
        sign_in_streak_increment: data.sign_in_streak_increment,
        sign_in_max_points: data.sign_in_max_points,
        points_to_yuan_rate: data.points_to_yuan_rate,
        max_points_discount_percent: data.max_points_discount_percent,
      })
    }
  }

  function addLevelRule() {
    setLevelRules([...levelRules, { level: '', name: '', threshold_cent: 0, benefits: [] }])
  }

  function removeLevelRule(index: number) {
    setLevelRules(levelRules.filter((_, i) => i !== index))
  }

  function updateLevelRule(index: number, field: string, value: unknown) {
    setLevelRules(levelRules.map((rule, i) => (i === index ? { ...rule, [field]: value } : rule)))
  }

  async function createCoupon(values: { name: string; scope_type: string; scope_ids?: string; discount_yuan: number; min_yuan: number; total_quantity: number }) {
    await run('创建平台优惠券', () =>
      http.post(
        '/admin/promotions/coupons',
        {
          name: values.name,
          scope_type: values.scope_type,
          scope_ids: ids(values.scope_ids),
          discount_type: 'amount',
          discount_value: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
          total_quantity: values.total_quantity,
          per_user_limit: 1,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadCoupons()
  }

  async function createFullDiscount(values: { name: string; scope_type: string; scope_ids?: string; discount_yuan: number; min_yuan: number }) {
    await run('创建满减活动', () =>
      http.post(
        '/admin/promotions/full-discounts',
        {
          name: values.name,
          scope_type: values.scope_type,
          scope_ids: ids(values.scope_ids),
          discount_amount_cent: yuanToCent(values.discount_yuan),
          min_amount_cent: yuanToCent(values.min_yuan),
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadFullDiscounts()
  }

  useEffect(() => {
    void loadMemberPointsConfig()
    void loadCoupons()
    void loadFullDiscounts()
  }, [])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>促销管理</Title>
          <Paragraph>平台级优惠券、满减活动与会员积分规则</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card
            title="会员积分规则"
            extra={<Button onClick={loadMemberPointsConfig}>刷新配置</Button>}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={10}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <Text type="secondary">积分像账户余额，可与优惠券、满减、限时价、拼团等叠加；实际抵扣上限由这里的平台配置决定。</Text>
                  {memberPointsConfig ? (
                    <Space wrap>
                      <Tag color="purple">签到基础 {memberPointsConfig.sign_in_base_points} 分</Tag>
                      <Tag>连续递增 {memberPointsConfig.sign_in_streak_increment} 分</Tag>
                      <Tag>签到封顶 {memberPointsConfig.sign_in_max_points} 分</Tag>
                      <Tag color="blue">{memberPointsConfig.points_to_yuan_rate} 积分 = 1 元</Tag>
                      <Tag color="orange">单笔最多抵扣 {memberPointsConfig.max_points_discount_percent}%</Tag>
                    </Space>
                  ) : null}
                  <Table
                    size="small"
                    rowKey="level"
                    pagination={false}
                    dataSource={memberPointsConfig?.level_rules ?? []}
                    columns={[
                      { title: '等级', dataIndex: 'name' },
                      { title: '标识', dataIndex: 'level' },
                      { title: '消费门槛', dataIndex: 'threshold_cent', render: (value) => `￥${yuan(value)}` },
                      { title: '权益', dataIndex: 'benefits', render: (value: string[]) => value.join('、') || '-' },
                    ]}
                  />
                </Space>
              </Col>
              <Col xs={24} lg={14}>
                <Form layout="vertical" form={form} onFinish={handleSave}>
                  <Card type="inner" title="签到设置" size="small">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item label="签到基础分（分）" name="sign_in_base_points">
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="连续递增（分）" name="sign_in_streak_increment">
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item label="每日封顶（分）" name="sign_in_max_points">
                          <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                  <Card type="inner" title="积分兑换设置" size="small" style={{ marginTop: 12 }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="兑换比率（多少积分 = 1 元）" name="points_to_yuan_rate">
                          <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="单笔抵扣上限" name="max_points_discount_percent">
                          <InputNumber min={0} max={100} addonAfter="%" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                  <Card type="inner" title="会员等级规则" size="small" style={{ marginTop: 12 }}>
                    <Table
                      size="small"
                      rowKey={(_, index) => String(index ?? 0)}
                      pagination={false}
                      dataSource={levelRules}
                      columns={[
                        {
                          title: '标识',
                          dataIndex: 'level',
                          width: 100,
                          render: (value: string, _: unknown, index: number) => (
                            <Input size="small" value={value} onChange={(e) => updateLevelRule(index, 'level', e.target.value)} />
                          ),
                        },
                        {
                          title: '名称',
                          dataIndex: 'name',
                          width: 100,
                          render: (value: string, _: unknown, index: number) => (
                            <Input size="small" value={value} onChange={(e) => updateLevelRule(index, 'name', e.target.value)} />
                          ),
                        },
                        {
                          title: '消费门槛（元）',
                          dataIndex: 'threshold_cent',
                          width: 130,
                          render: (value: number, _: unknown, index: number) => (
                            <InputNumber
                              size="small"
                              min={0}
                              precision={2}
                              value={value / 100}
                              style={{ width: '100%' }}
                              onChange={(v) => updateLevelRule(index, 'threshold_cent', Math.round((v ?? 0) * 100))}
                            />
                          ),
                        },
                        {
                          title: '权益',
                          render: (_: unknown, __: unknown, index: number) => (
                            <Select
                              size="small"
                              mode="tags"
                              value={levelRules[index]?.benefits}
                              onChange={(v) => updateLevelRule(index, 'benefits', v)}
                              style={{ width: '100%' }}
                              placeholder="输入权益后回车"
                            />
                          ),
                        },
                        {
                          title: '操作',
                          width: 60,
                          render: (_: unknown, __: unknown, index: number) => (
                            <Button size="small" danger onClick={() => removeLevelRule(index)}>删除</Button>
                          ),
                        },
                      ]}
                    />
                    <Button type="dashed" onClick={addLevelRule} block style={{ marginTop: 8 }}>
                      + 添加等级
                    </Button>
                  </Card>
                  <Space style={{ marginTop: 16 }}>
                    <Button type="primary" htmlType="submit">保存配置</Button>
                    <Button onClick={loadMemberPointsConfig}>刷新配置</Button>
                    <Text type="secondary">配置保存后，用户端会员等级、签到奖励和后续积分抵扣计算都会按新规则执行。</Text>
                  </Space>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={24}>
          <Card title="平台优惠券">
            <Form layout="inline" onFinish={createCoupon} initialValues={{ scope_type: 'all', discount_yuan: 5, min_yuan: 20, total_quantity: 100 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="范围" name="scope_type"><Select style={{ width: 130 }} options={[
                { value: 'all', label: '全平台' },
                { value: 'category', label: '分类' },
                { value: 'product', label: '商品' },
                { value: 'sku', label: 'SKU' },
              ]} /></Form.Item>
              <Form.Item label="范围 ID" name="scope_ids"><Input placeholder="可用中文逗号、英文逗号或空格分隔" /></Form.Item>
              <Form.Item label="优惠" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="门槛" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="数量" name="total_quantity"><InputNumber min={1} /></Form.Item>
              <Button type="primary" htmlType="submit">创建</Button>
              <Button onClick={loadCoupons}>刷新</Button>
            </Form>
            <Form layout="inline" className="query-form">
              <Form.Item label="批量发券用户 ID"><Input value={grantUserIds} onChange={(event) => setGrantUserIds(event.target.value)} placeholder="可用中文逗号、英文逗号或空格分隔" /></Form.Item>
            </Form>
            <Table
              rowKey="id"
              dataSource={coupons}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '券 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '范围', render: (_, row) => `${row.scope_type} ${row.scope_ids?.join(',') || ''}` },
                { title: '优惠', render: (_, row) => `满 ￥${yuan(row.min_amount_cent)} 减 ￥${yuan(row.discount_value)}` },
                { title: '领取', render: (_, row) => `${row.claimed_quantity}/${row.total_quantity}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, row) => (
                  <Space>
                    <Button onClick={() => run('批量发券', () => http.post(`/admin/promotions/coupons/${row.id}/batch-grant`, { user_ids: ids(grantUserIds) }, { headers: { 'X-Admin-Session': SESSION } }))}>批量发券</Button>
                    <Button danger onClick={() => run('停用优惠券', () => http.post(`/admin/promotions/coupons/${row.id}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } })).then(loadCoupons)}>停用</Button>
                  </Space>
                ) },
              ]}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="满减活动">
            <Form layout="inline" onFinish={createFullDiscount} initialValues={{ scope_type: 'all', discount_yuan: 3, min_yuan: 30 }}>
              <Form.Item label="名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="范围" name="scope_type"><Select style={{ width: 130 }} options={[
                { value: 'all', label: '全平台' },
                { value: 'merchant', label: '店铺' },
                { value: 'category', label: '分类' },
                { value: 'product', label: '商品' },
                { value: 'sku', label: 'SKU' },
              ]} /></Form.Item>
              <Form.Item label="范围 ID" name="scope_ids"><Input placeholder="可用中文逗号、英文逗号或空格分隔" /></Form.Item>
              <Form.Item label="满（元）" name="min_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Form.Item label="减（元）" name="discount_yuan"><InputNumber min={0} precision={2} /></Form.Item>
              <Button type="primary" htmlType="submit">创建满减</Button>
              <Button onClick={loadFullDiscounts}>刷新</Button>
            </Form>
            <Table
              rowKey="id"
              dataSource={fullDiscounts}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: '活动 ID', dataIndex: 'id', render: (id) => <Tag>#{id}</Tag> },
                { title: '名称', dataIndex: 'name' },
                { title: '范围', render: (_, row) => `${row.scope_type} ${row.scope_ids?.join(',') || ''}` },
                { title: '规则', render: (_, row) => `满 ￥${yuan(row.min_amount_cent)} 减 ￥${yuan(row.discount_amount_cent)}` },
                { title: '状态', dataIndex: 'status', render: (status) => <StatusTag status={status} /> },
                { title: '操作', render: (_, row) => (
                  <Button danger onClick={() => run('停用满减', () => http.post(`/admin/promotions/full-discounts/${row.id}/disable`, undefined, { headers: { 'X-Admin-Session': SESSION } })).then(loadFullDiscounts)}>停用</Button>
                ) },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <DebugLogs logs={logs} />
    </main>
  )
}
