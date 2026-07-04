import { Button, Card, Col, Form, Input, Row, Space, Tag, Typography, Upload, message } from 'antd'
import type { UploadFile } from 'antd'
import { useEffect, useState } from 'react'
import { http } from '../../services/http'
import { uploadService } from '../../services/upload'
import {
  DebugLogs,
  formatError,
  pickData,
  type ApiLog,
  assetUrl,
  statusText,
} from '../workbench/adminShared'
import { SESSION, type AdminProfile, type MerchantProfile } from './shared'

const { Title, Paragraph, Text } = Typography

export function MerchantStorePage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null)
  const [merchantProfileForm] = Form.useForm()

  const merchantId = profile?.merchant_id ?? null

  const merchantLogoFiles: UploadFile[] = merchantProfile?.logo_url
    ? [
        {
          uid: 'merchant-logo',
          name: merchantProfile.logo_url.split('/').pop() || 'merchant-logo',
          status: 'done',
          url: assetUrl(merchantProfile.logo_url),
        },
      ]
    : []

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

  async function loadMerchantProfile() {
    const data = await run<MerchantProfile>('店铺资料', () =>
      http.get('/admin/merchant/profile', { headers: { 'X-Admin-Session': SESSION } }),
    )
    if (data) {
      setMerchantProfile(data)
      merchantProfileForm.setFieldsValue({
        name: data.name,
        announcement: data.announcement,
      })
    }
  }

  async function updateMerchantProfile(values: { name: string; announcement?: string }) {
    const data = await run<MerchantProfile>('保存店铺资料', () =>
      http.put(
        '/admin/merchant/profile',
        {
          name: values.name,
          logo_url: merchantProfile?.logo_url ?? null,
          announcement: values.announcement ?? null,
        },
        { headers: { 'X-Admin-Session': SESSION } },
      ),
    )
    if (data) {
      setMerchantProfile(data)
      await loadMe()
    }
  }

  async function uploadMerchantLogo(file: File) {
    const data = await run<{ url: string }>('上传店铺 Logo', () => uploadService.uploadImage(file, SESSION))
    if (data?.url) {
      setMerchantProfile((current) => (current ? { ...current, logo_url: data.url } : current))
    }
    return false
  }

  useEffect(() => {
    loadMe()
    loadMerchantProfile()
  }, [])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">商家运营</Text>
          <Title level={1}>店铺信息</Title>
          <Paragraph>维护店铺名称、Logo 与公告。</Paragraph>
        </div>
      </section>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="店铺资料">
            <Row gutter={[24, 16]}>
              <Col span={6}>
                <Upload
                  listType="picture-card"
                  fileList={merchantLogoFiles}
                  beforeUpload={(file) => uploadMerchantLogo(file)}
                  onRemove={() => {
                    setMerchantProfile((current) => (current ? { ...current, logo_url: null } : current))
                    return true
                  }}
                >
                  {merchantLogoFiles.length ? null : <Button>上传 Logo</Button>}
                </Upload>
                <Text type="secondary">Logo 会展示在用户端店铺主页。</Text>
              </Col>
              <Col span={18}>
                <Form
                  form={merchantProfileForm}
                  layout="vertical"
                  onFinish={updateMerchantProfile}
                  disabled={!merchantId}
                >
                  <Row gutter={12}>
                    <Col span={10}>
                      <Form.Item label="店铺名称" name="name" rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item label="店铺 ID">
                        <Tag color="purple">{merchantProfile ? `#${merchantProfile.id}` : '待审核'}</Tag>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item label="店铺公告" name="announcement">
                        <Input.TextArea rows={3} placeholder="填写展示给用户看的店铺公告" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space>
                    <Button type="primary" htmlType="submit" disabled={!merchantId}>
                      保存店铺资料
                    </Button>
                    <Button onClick={loadMerchantProfile} disabled={!merchantId}>
                      刷新店铺资料
                    </Button>
                  </Space>
                </Form>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <DebugLogs logs={logs} />
    </main>
  )
}
