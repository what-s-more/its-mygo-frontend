import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  PlusOutlined,
  EnvironmentOutlined,
  EditOutlined,
  DeleteOutlined,
  StarOutlined,
  StarFilled,
  PhoneOutlined,
  UserOutlined,
  HomeOutlined,
} from '@ant-design/icons'

import { addressService, type Address, type AddressPayload } from '../../services/address'
import { authService } from '../../services/auth'
import { pickErrorMessage } from '../../utils/format'
import { REGION_DATA } from '../../utils/region-data'

const { Text, Paragraph } = Typography

type AddressFormValues = {
  receiver_name: string
  receiver_mobile: string
  province: string
  city: string
  district?: string
  street?: string
  detail_address: string
  postal_code?: string
  address_tag?: string
  is_default?: boolean
}

function buildRegionText(address: Address) {
  return [address.province, address.city, address.district ?? '', address.street ?? '']
    .filter(Boolean)
    .join(' ')
}

export function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [form] = Form.useForm<AddressFormValues>()
  const [editingAddressId, setEditingAddressId] = useState<number | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')

  async function loadAddresses() {
    if (!authService.hasToken()) {
      setAddresses([])
      return
    }
    try {
      const response = await addressService.listAddresses()
      setAddresses(response.data ?? [])
    } catch (error) {
      setNotice(`加载地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
      setAddresses([])
    }
  }

  useEffect(() => {
    void loadAddresses()
  }, [])

  function openCreateModal() {
    setEditingAddressId(undefined)
    form.resetFields()
    form.setFieldValue('is_default', addresses.length === 0)
    setSelectedProvince('')
    setSelectedCity('')
    setModalOpen(true)
  }

  function openEditModal(address: Address) {
    setEditingAddressId(address.id)
    setSelectedProvince(address.province)
    setSelectedCity(address.city)
    form.setFieldsValue({
      receiver_name: address.receiver_name,
      receiver_mobile: address.receiver_mobile,
      province: address.province,
      city: address.city,
      district: address.district ?? '',
      street: address.street ?? '',
      detail_address: address.detail_address,
      postal_code: address.postal_code ?? '',
      address_tag: address.address_tag ?? '',
      is_default: address.is_default,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingAddressId(undefined)
    form.resetFields()
  }

  async function handleSubmit() {
    let values: AddressFormValues
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    setLoading(true)
    setNotice('')
    const payload: AddressPayload = {
      receiver_name: values.receiver_name,
      receiver_mobile: values.receiver_mobile,
      province: values.province,
      city: values.city,
      district: values.district || null,
      street: values.street || null,
      detail_address: values.detail_address,
      postal_code: values.postal_code || null,
      address_tag: values.address_tag || null,
      is_default: values.is_default ?? (addresses.length === 0),
    }
    try {
      if (editingAddressId) {
        await addressService.updateAddress(editingAddressId, payload)
        message.success('地址已修改')
      } else {
        await addressService.createAddress(payload)
        message.success('地址已保存')
      }
      closeModal()
      await loadAddresses()
    } catch (error) {
      message.error(`保存地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetDefault(addressId: number) {
    setNotice('')
    try {
      await addressService.updateAddress(addressId, { is_default: true })
      message.success('默认地址已更新')
      await loadAddresses()
    } catch (error) {
      message.error(`设置默认地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  async function handleDelete(addressId: number) {
    setNotice('')
    try {
      await addressService.deleteAddress(addressId)
      message.success('地址已删除')
      if (editingAddressId === addressId) {
        closeModal()
      }
      await loadAddresses()
    } catch (error) {
      message.error(`删除地址失败：${pickErrorMessage(error) ?? '请求失败'}`)
    }
  }

  return (
    <div className="addr-page">
      {/* ── Header ── */}
      <div className="addr-header">
        <div className="addr-header-left">
          <h1 className="addr-header-title">
            <EnvironmentOutlined /> 收货地址
          </h1>
          <p className="addr-header-sub">管理你的收货地址，下单时快速选择</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="btn-addr-primary"
          onClick={openCreateModal}
        >
          新增地址
        </Button>
      </div>

      {notice && (
        <Alert
          className="addr-notice"
          showIcon
          type="info"
          message={notice}
          onClose={() => setNotice('')}
          closable
        />
      )}

      {/* ── Address List ── */}
      <div className="addr-list-section">
        {addresses.length === 0 ? (
          <Empty
            description="暂无收货地址"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '80px 0' }}
          >
            <Button type="primary" icon={<PlusOutlined />} className="btn-addr-primary" onClick={openCreateModal}>
              添加第一个地址
            </Button>
          </Empty>
        ) : (
          <div className="addr-cards">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`addr-card ${address.is_default ? 'addr-card-default' : ''}`}
              >
                {/* Left accent bar for default */}
                <div className="addr-card-accent" />

                <div className="addr-card-body">
                  {/* Header row: name + phone + tags */}
                  <div className="addr-card-top">
                    <div className="addr-card-user">
                      <span className="addr-card-name">
                        <UserOutlined /> {address.receiver_name}
                      </span>
                      <span className="addr-card-phone">
                        <PhoneOutlined /> {address.receiver_mobile}
                      </span>
                    </div>
                    <div className="addr-card-tags">
                      {address.is_default && (
                        <Tag className="addr-tag-default">
                          <StarFilled /> 默认
                        </Tag>
                      )}
                      {address.address_tag && (
                        <Tag className="addr-tag-label">
                          <HomeOutlined /> {address.address_tag}
                        </Tag>
                      )}
                    </div>
                  </div>

                  {/* Address content */}
                  <div className="addr-card-content">
                    <div className="addr-card-region">
                      <EnvironmentOutlined className="addr-region-icon" />
                      <Text className="addr-region-text">{buildRegionText(address)}</Text>
                    </div>
                    <Paragraph className="addr-detail-text">{address.detail_address}</Paragraph>
                    {address.postal_code && (
                      <Text type="secondary" className="addr-postal">邮编 {address.postal_code}</Text>
                    )}
                  </div>

                  {/* Footer: actions */}
                  <div className="addr-card-footer">
                    {!address.is_default && (
                      <Button
                        type="link"
                        size="small"
                        icon={<StarOutlined />}
                        onClick={() => void handleSetDefault(address.id)}
                        className="addr-action-btn"
                      >
                        设为默认
                      </Button>
                    )}
                    <Button
                      type="link"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openEditModal(address)}
                      className="addr-action-btn"
                    >
                      编辑
                    </Button>
                    <Popconfirm
                      title="确认删除该地址？"
                      description="删除后不可恢复"
                      onConfirm={() => void handleDelete(address.id)}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        className="addr-action-btn"
                      >
                        删除
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      <Modal
        open={modalOpen}
        title={editingAddressId ? `编辑地址 ${editingAddressId}` : '新增收货地址'}
        onCancel={closeModal}
        width={640}
        footer={[
          <Button key="cancel" onClick={closeModal}>
            取消
          </Button>,
          <Button key="reset" onClick={() => form.resetFields()}>
            重置
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={() => void handleSubmit()}
            className="btn-addr-primary"
          >
            {editingAddressId ? '保存修改' : '保存地址'}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" className="addr-form">
          <Form.Item name="receiver_name" label="收货人" rules={[{ required: true, message: '请输入收货人姓名' }]}>
            <Input placeholder="收货人姓名" prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="receiver_mobile" label="手机号" rules={[{ required: true, message: '请输入收货人手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的11位手机号' }]}>
            <Input placeholder="收货人手机号" prefix={<PhoneOutlined />} />
          </Form.Item>
          <Form.Item name="province" label="省" rules={[{ required: true, message: '请选择省' }]}>
            <Select
              showSearch
              placeholder="请选择省"
              optionFilterProp="label"
              onChange={(value: string) => {
                setSelectedProvince(value)
                setSelectedCity('')
                form.setFieldValue('city', undefined)
                form.setFieldValue('district', undefined)
              }}
              options={REGION_DATA.map((p) => ({ value: p.value, label: p.label }))}
            />
          </Form.Item>
          <Form.Item name="city" label="市" rules={[{ required: true, message: '请选择市' }]}>
            <Select
              showSearch
              placeholder="请选择市"
              optionFilterProp="label"
              disabled={!selectedProvince}
              onChange={(value: string) => {
                setSelectedCity(value)
                form.setFieldValue('district', undefined)
              }}
              options={REGION_DATA.find((p) => p.value === selectedProvince)?.children?.map((c) => ({ value: c.value, label: c.label })) ?? []}
            />
          </Form.Item>
          <Form.Item name="district" label="区县">
            <Select
              showSearch
              placeholder="请选择区县"
              optionFilterProp="label"
              disabled={!selectedCity}
              options={REGION_DATA.find((p) => p.value === selectedProvince)?.children?.find((c) => c.value === selectedCity)?.children?.map((d) => ({ value: d.value, label: d.label })) ?? []}
            />
          </Form.Item>
          <Form.Item name="street" label="街道">
            <Input placeholder="街道/乡镇" />
          </Form.Item>
          <Form.Item name="detail_address" label="详细地址" rules={[{ required: true, message: '请输入详细地址' }]}>
            <Input.TextArea placeholder="楼栋、门牌等详细地址" autoSize={{ minRows: 2, maxRows: 4 }} />
          </Form.Item>
          <Form.Item name="postal_code" label="邮政编码">
            <Input placeholder="邮政编码" />
          </Form.Item>
          <Form.Item name="address_tag" label="地址标签">
            <Input placeholder="例如：家、公司" />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Switch checkedChildren="设为默认地址" unCheckedChildren="非默认" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
