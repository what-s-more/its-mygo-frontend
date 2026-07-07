import { Alert, Badge, Button, Card, Col, Input, List, Row, Space, Tag, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import {
  adminCustomerService,
  type CustomerServiceConversation,
  type CustomerServiceMessage,
} from '../../services/customerService'
import { DebugLogs, formatError, pickData, statusColor, statusText, type ApiLog } from '../workbench/adminShared'
import { SESSION, type PageResult, pageList } from './shared'

const { Title, Text } = Typography

export function AdminCustomerServicePage() {
  const [api, contextHolder] = message.useMessage()
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [customerConversations, setCustomerConversations] = useState<CustomerServiceConversation[]>([])
  const [selectedCustomerConversation, setSelectedCustomerConversation] = useState<CustomerServiceConversation | null>(null)
  const [customerMessages, setCustomerMessages] = useState<CustomerServiceMessage[]>([])
  const [customerMessageContent, setCustomerMessageContent] = useState('平台客服已收到。')

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

  async function loadCustomerConversations() {
    const data = await run<PageResult<CustomerServiceConversation>>('平台客服会话', () =>
      adminCustomerService.listConversations(SESSION, { page_size: 20 }),
    )
    setCustomerConversations(pageList<CustomerServiceConversation>(data))
  }

  async function openCustomerConversation(conversation: CustomerServiceConversation) {
    setSelectedCustomerConversation(conversation)
    const data = await run<PageResult<CustomerServiceMessage>>('平台客服消息', () =>
      adminCustomerService.listMessages(SESSION, conversation.id, { page_size: 50 }),
    )
    setCustomerMessages(pageList<CustomerServiceMessage>(data))
  }

  async function sendCustomerMessage() {
    if (!selectedCustomerConversation) return
    const data = await run<CustomerServiceMessage>('回复平台客服', () =>
      adminCustomerService.sendMessage(SESSION, selectedCustomerConversation.id, { content: customerMessageContent }),
    )
    if (data) {
      setCustomerMessages((items) => [...items, data])
      setCustomerMessageContent('')
      await loadCustomerConversations()
    }
  }

  async function closeCustomerConversation() {
    if (!selectedCustomerConversation) return
    const data = await run<CustomerServiceConversation>('关闭平台客服会话', () =>
      adminCustomerService.closeConversation(SESSION, selectedCustomerConversation.id),
    )
    if (data) {
      setSelectedCustomerConversation(data)
      await loadCustomerConversations()
    }
  }

  useEffect(() => {
    void loadCustomerConversations()
  }, [])

  return (
    <main className="admin-page">
      {contextHolder}
      <section className="admin-hero">
        <div>
          <Text className="eyebrow">平台管理</Text>
          <Title level={1}>客服会话</Title>
        </div>
      </section>

      <Card title="平台客服" extra={<Button onClick={loadCustomerConversations}>刷新会话</Button>}>
        <Alert type="info" showIcon message="平台端只处理平台客服会话，不查看或处理商家客服会话。" style={{ marginBottom: 12 }} />
        <Row gutter={[16, 16]}>
          <Col span={9}>
            <List
              dataSource={customerConversations}
              locale={{ emptyText: '暂无平台客服会话' }}
              renderItem={(conversation) => (
                <List.Item onClick={() => openCustomerConversation(conversation)} className="clickable-list-item">
                  <Space direction="vertical" size={2}>
                    <Space wrap>
                      <Tag color="geekblue">平台</Tag>
                      <Tag color={statusColor(conversation.status)}>{statusText(conversation.status)}</Tag>
                      {conversation.unread_count ? <Badge count={conversation.unread_count} /> : null}
                    </Space>
                    <Text strong>会话 #{conversation.id} / 用户 #{conversation.user_id}</Text>
                    <Text type="secondary">{conversation.last_message || '暂无消息'}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Col>
          <Col span={15}>
            <Card size="small" title={selectedCustomerConversation ? `平台会话 #${selectedCustomerConversation.id}` : '客服消息'}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <List
                  size="small"
                  dataSource={customerMessages}
                  locale={{ emptyText: '请选择会话' }}
                  renderItem={(item) => (
                    <List.Item>
                      <Space direction="vertical" size={2}>
                        <Text strong>{statusText(item.sender_type)}：{item.sender_name || `#${item.sender_id}`}</Text>
                        <Text>{item.content}</Text>
                        <Text type="secondary">{new Date(item.created_at).toLocaleString()}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
                <Input.TextArea
                  rows={3}
                  value={customerMessageContent}
                  onChange={(event) => setCustomerMessageContent(event.target.value)}
                />
                <Space>
                  <Button
                    type="primary"
                    disabled={!selectedCustomerConversation || !customerMessageContent.trim()}
                    onClick={sendCustomerMessage}
                  >
                    回复
                  </Button>
                  <Button
                    danger
                    disabled={!selectedCustomerConversation || selectedCustomerConversation.status === 'closed'}
                    onClick={closeCustomerConversation}
                  >
                    关闭会话
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <DebugLogs logs={logs} />
    </main>
  )
}
