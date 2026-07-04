import { Button, Card, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { http } from '../../services/http'
import { DebugLogs, StatusTag, formatError, pickData, type ApiLog } from '../workbench/adminShared'
import { SESSION, directList, type Category, type CategoryTreeItem } from './shared'

const { Title, Text } = Typography

export function AdminCategoryPage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryTreeItem | null>(null)

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
    setCategories(directList<Category>(data))
  }

  async function createCategory(values: { name: string; parent_id?: number; sort_order?: number }) {
    await run('创建分类', () =>
      http.post(
        '/admin/categories',
        { name: values.name, parent_id: values.parent_id ?? null, sort_order: values.sort_order ?? 0 },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    await loadCategories()
  }

  async function updateCategory(values: { name?: string; parent_id?: number; sort_order?: number }) {
    if (!selectedCategory) {
      api.warning('请先在分类表格中选择要编辑的分类')
      return
    }
    await run('编辑分类', () =>
      http.put(
        `/admin/categories/${selectedCategory.id}`,
        { name: values.name, parent_id: values.parent_id ?? null, sort_order: values.sort_order ?? 0 },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    setSelectedCategory(null)
    await loadCategories()
  }

  async function disableCategory(categoryId: number) {
    await run('停用分类', () =>
      http.delete(`/admin/categories/${categoryId}`, { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (selectedCategory?.id === categoryId) setSelectedCategory(null)
    await loadCategories()
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  const categoryColumns: ColumnsType<CategoryTreeItem> = [
    { title: '分类', render: (_, row) => <span><Text strong>{row.label}</Text><br /><Text type="secondary">分类 #{row.id}</Text></span> },
    { title: '层级', dataIndex: 'depth', render: (depth) => <Tag color={depth === 1 ? 'blue' : depth === 2 ? 'purple' : 'geekblue'}>{depth} 级</Tag> },
    { title: '父级', render: (_, row) => row.parentName ?? '-' },
    { title: '排序', dataIndex: 'sort_order' },
    {
      title: '操作',
      render: (_, row) => (
        <Space>
          <Button onClick={() => setSelectedCategory(row)}>编辑</Button>
          <Button danger onClick={() => disableCategory(row.id)}>停用</Button>
        </Space>
      ),
    },
  ]

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Title level={1}>分类配置</Title>
        </div>
      </section>

      <Card title="分类管理">
        <Form layout="vertical" onFinish={createCategory}>
          <Form.Item label="分类名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="父级分类" name="parent_id" tooltip="不选择则创建一级分类，最多支持三级分类">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="选择父级分类"
              options={categoryOptions}
            />
          </Form.Item>
          <Form.Item label="排序" name="sort_order" initialValue={0} tooltip="同一父级下数字越小越靠前">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Space><Button type="primary" htmlType="submit">创建分类</Button><Button onClick={loadCategories}>刷新</Button></Space>
        </Form>
        <Table
          size="small"
          rowKey="id"
          columns={categoryColumns}
          dataSource={categoryTree}
          pagination={{ pageSize: 6 }}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selectedCategory ? [selectedCategory.id] : [],
            onChange: (_selectedRowKeys, selectedRows) => setSelectedCategory(selectedRows[0] ?? null),
          }}
        />
        {selectedCategory ? (
          <Card size="small" title={`编辑分类 #${selectedCategory.id}`} className="section-card">
            <Form
              layout="vertical"
              onFinish={updateCategory}
              initialValues={{
                name: selectedCategory.name,
                parent_id: selectedCategory.parent_id ?? undefined,
                sort_order: selectedCategory.sort_order,
              }}
              key={selectedCategory.id}
            >
              <Form.Item label="分类名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="父级分类" name="parent_id">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={categoryOptions.filter((item) => item.value !== selectedCategory.id)}
                />
              </Form.Item>
              <Form.Item label="排序" name="sort_order"><InputNumber style={{ width: '100%' }} /></Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">保存分类</Button>
                <Button onClick={() => setSelectedCategory(null)}>取消</Button>
              </Space>
            </Form>
          </Card>
        ) : null}
      </Card>

      <DebugLogs logs={logs} />
    </main>
  )
}
