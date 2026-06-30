import { useEffect, useState } from 'react'
import { App, Button, Card, Form, Input, List, Popconfirm, Space, Switch, Tag, Typography } from 'antd'
import { addressService, type Address, type AddressPayload } from '../../services/address'
import { DataPanel, type ApiResult } from '../../components/DataPanel'

const { Text } = Typography

export function AddressPage() {
  const { message } = App.useApp()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [lastResult, setLastResult] = useState<ApiResult | null>(null)
  const [form] = Form.useForm()

  async function loadAddresses() {
    try {
      const r = await addressService.listAddresses()
      setAddresses(r.data)
      setLastResult({ title: '地址列表', ok: true, data: r.data })
    } catch (e) {
      setLastResult({ title: '地址列表', ok: false, data: e })
    }
  }

  useEffect(() => {
    void loadAddresses()
  }, [])

  async function handleSubmit(values: AddressPayload) {
    try {
      await addressService.createAddress({ ...values, district: values.district || null })
      message.success('地址已保存')
      form.resetFields()
      await loadAddresses()
    } catch (e) {
      setLastResult({ title: '新增地址', ok: false, data: e })
      message.error('保存地址失败')
    }
  }

  async function setDefault(id: number) {
    try {
      await addressService.updateAddress(id, { is_default: true })
      message.success('默认地址已更新')
      await loadAddresses()
    } catch (e) {
      setLastResult({ title: '设置默认', ok: false, data: e })
      message.error('设置默认地址失败')
    }
  }

  async function deleteAddress(id: number) {
    try {
      await addressService.deleteAddress(id)
      message.success('地址已删除')
      await loadAddresses()
    } catch (e) {
      setLastResult({ title: '删除地址', ok: false, data: e })
      message.error('删除地址失败')
    }
  }

  return (
    <div className="shop-page">
      <Card title="收货地址">
        <Card type="inner" title="新增地址" style={{ marginBottom: 16 }}>
          <Form form={form} onFinish={(v) => void handleSubmit(v as AddressPayload)} layout="vertical">
            <Space style={{ width: '100%' }} size="middle">
              <Form.Item name="receiver_name" label="收货人" rules={[{ required: true }]} style={{ width: 200 }}><Input /></Form.Item>
              <Form.Item name="receiver_mobile" label="手机号" rules={[{ required: true }]} style={{ width: 200 }}><Input /></Form.Item>
            </Space>
            <Space style={{ width: '100%' }} size="middle">
              <Form.Item name="province" label="省" rules={[{ required: true }]} style={{ width: 120 }}><Input /></Form.Item>
              <Form.Item name="city" label="市" rules={[{ required: true }]} style={{ width: 120 }}><Input /></Form.Item>
              <Form.Item name="district" label="区县" style={{ width: 120 }}><Input /></Form.Item>
            </Space>
            <Form.Item name="detail_address" label="详细地址" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="is_default" valuePropName="checked" initialValue={false}><Space><Switch /> 设为默认</Space></Form.Item>
            <Button type="primary" htmlType="submit">保存地址</Button>
          </Form>
        </Card>

        <List
          dataSource={addresses}
          renderItem={(addr) => (
            <List.Item
              actions={[
                <Button key="default" size="small" onClick={() => void setDefault(addr.id)} disabled={addr.is_default}>设为默认</Button>,
                <Popconfirm key="delete" title="确认删除此地址？" onConfirm={() => void deleteAddress(addr.id)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={<Space><Text strong>{addr.receiver_name}</Text><Tag color="blue">地址 #{addr.id}</Tag>{addr.is_default && <Tag color="green">默认</Tag>}</Space>}
                description={<Text type="secondary">{addr.receiver_mobile} / {addr.province}{addr.city}{addr.district ?? ''}{addr.detail_address}</Text>}
              />
            </List.Item>
          )}
        />
      </Card>

      <DataPanel result={lastResult} />
    </div>
  )
}
