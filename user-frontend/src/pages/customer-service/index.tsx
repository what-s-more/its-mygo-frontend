import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  List,
  message,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CustomerServiceOutlined,
  DeleteOutlined,
  SendOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import {
  customerService,
  type CustomerServiceConversation,
  type CustomerServiceMessage,
} from '../../services/customerService'
import { authService } from '../../services/auth'
import { getApiErrorMessage } from '../../services/http'
import { absoluteAssetUrl } from '../../utils/format'

const { Title, Text, Paragraph } = Typography

const WS_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/^http/, 'ws').replace(/\/api\/v1$/, '') ?? 'ws://localhost:8000'

function formatTime(time: string) {
  const date = new Date(time)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function targetLabel(conversation: CustomerServiceConversation) {
  if (conversation.target_type === 'platform') return '平台客服'
  return conversation.merchant_name ?? '商家客服'
}

export function CustomerServicePanel({ embedded = false }: { embedded?: boolean }) {
  const [conversations, setConversations] = useState<CustomerServiceConversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<CustomerServiceConversation | null>(null)
  const [messages, setMessages] = useState<CustomerServiceMessage[]>([])
  const [inputContent, setInputContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const loadConversations = useCallback(async () => {
    if (!authService.hasToken()) return
    setLoading(true)
    try {
      const response = await customerService.listConversations({ page_size: 50 })
      setConversations(response.data.list)
    } catch (error) {
      message.error(`加载会话列表失败：${getApiErrorMessage(error)}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const response = await customerService.listMessages(conversationId, { page_size: 100 })
      setMessages(response.data.list)
    } catch (error) {
      message.error(`加载消息失败：${getApiErrorMessage(error)}`)
    }
  }, [])

  // WebSocket 连接管理
  const connectWebSocket = useCallback((conversationId: number) => {
    // 关闭旧连接
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const token = localStorage.getItem('user_access_token')
    if (!token) return

    const ws = new WebSocket(`${WS_BASE}/api/v1/ws/chat/${conversationId}?token=${token}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'pong') return
        if (payload.type === 'chat.ack' && payload.data) {
          setMessages((prev) => [...prev, payload.data as CustomerServiceMessage])
        }
        if (payload.type === 'error') {
          message.error(payload.message ?? '消息发送失败')
        }
        // 其他用户发送的消息也会通过 ack 返回，无需额外处理
      } catch {
        // 忽略非 JSON 消息
      }
    }

    ws.onerror = () => {
      // WebSocket 错误时静默处理，用户可通过 HTTP 发送消息
    }

    ws.onclose = () => {
      wsRef.current = null
    }
  }, [])

  // 心跳保活
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // 组件卸载时关闭 WebSocket
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  // 初始加载会话列表
  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  // 选中会话时加载消息并连接 WebSocket
  useEffect(() => {
    if (selectedConversation) {
      void loadMessages(selectedConversation.id)
      connectWebSocket(selectedConversation.id)
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [selectedConversation, loadMessages, connectWebSocket])

  // 消息列表自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectConversation(conversation: CustomerServiceConversation) {
    setSelectedConversation(conversation)
  }

  async function createPlatformConversation() {
    try {
      const response = await customerService.createConversation({ target_type: 'platform' })
      const newConversation = response.data
      await loadConversations()
      setSelectedConversation(newConversation)
    } catch (error) {
      message.error(`创建客服会话失败：${getApiErrorMessage(error)}`)
    }
  }

  async function sendMessage() {
    if (!selectedConversation) return
    const content = inputContent.trim()
    if (!content) return
    setSending(true)
    try {
      const response = await customerService.sendMessage(selectedConversation.id, { content })
      setMessages((prev) => [...prev, response.data])
      setInputContent('')
      // 刷新会话列表以更新最后消息
      void loadConversations()
    } catch (error) {
      message.error(`发送消息失败：${getApiErrorMessage(error)}`)
    } finally {
      setSending(false)
    }
  }

  async function deleteConversation(conversationId: number) {
    try {
      await customerService.deleteConversation(conversationId)
      message.success('会话已删除')
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }
      await loadConversations()
    } catch (error) {
      message.error(`删除会话失败：${getApiErrorMessage(error)}`)
    }
  }

  function renderMessage(msg: CustomerServiceMessage) {
    const isSelf = msg.sender_type === 'user'
    return (
      <div key={msg.id} className={`cs-message-row ${isSelf ? 'cs-message-self' : 'cs-message-other'}`}>
        <div className="cs-message-bubble">
          {msg.content_type === 'image' && msg.image_urls.length > 0 ? (
            <div className="cs-message-images">
              {msg.image_urls.map((url, idx) => (
                <img key={idx} src={absoluteAssetUrl(url)} alt="消息图片" className="cs-message-image" />
              ))}
            </div>
          ) : (
            <Text className="cs-message-text">{msg.content}</Text>
          )}
          <div className="cs-message-time">{formatTime(msg.created_at)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'cs-page cs-page-embedded' : 'cs-page'}>
      {!embedded && (
        <header className="cs-header">
          <Title level={3} className="cs-header-title">
            <CustomerServiceOutlined /> 客服消息
          </Title>
          <Paragraph className="cs-header-sub">联系平台或商家客服，咨询订单与商品问题</Paragraph>
        </header>
      )}

      <div className="cs-main-layout">
        {/* 左栏：会话列表 */}
        <aside className="cs-sidebar">
          <div className="cs-sidebar-top">
            <Button
              type="primary"
              icon={<CustomerServiceOutlined />}
              onClick={() => void createPlatformConversation()}
              block
            >
              联系平台客服
            </Button>
          </div>
          <Spin spinning={loading}>
            {conversations.length === 0 ? (
              <Empty description="暂无客服会话" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '40px 0' }} />
            ) : (
              <List
                className="cs-conversation-list"
                dataSource={conversations}
                renderItem={(conv) => (
                  <List.Item
                    className={`cs-conversation-item ${selectedConversation?.id === conv.id ? 'cs-conversation-active' : ''}`}
                    onClick={() => void selectConversation(conv)}
                  >
                    <div className="cs-conversation-content">
                      <div className="cs-conversation-header">
                        <Space size={4}>
                          {conv.target_type === 'platform' ? (
                            <CustomerServiceOutlined className="cs-conversation-icon" />
                          ) : (
                            <ShopOutlined className="cs-conversation-icon" />
                          )}
                          <Text strong className="cs-conversation-name">{targetLabel(conv)}</Text>
                        </Space>
                        <Space size={4} className="cs-conversation-actions">
                          {conv.unread_count > 0 && (
                            <Badge count={conv.unread_count} size="small" />
                          )}
                          <Popconfirm
                            title="删除该会话？"
                            description="会话及所有消息将被永久删除"
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                            onConfirm={(e) => {
                              e?.stopPropagation()
                              void deleteConversation(conv.id)
                            }}
                            onCancel={(e) => e?.stopPropagation()}
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<DeleteOutlined />}
                              className="cs-conversation-delete"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Popconfirm>
                        </Space>
                      </div>
                      {conv.last_message && (
                        <Text className="cs-conversation-last" ellipsis>
                          {conv.last_message}
                        </Text>
                      )}
                      {conv.last_message_at && (
                        <Text className="cs-conversation-time">{formatTime(conv.last_message_at)}</Text>
                      )}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </aside>

        {/* 右栏：聊天界面 */}
        <main className="cs-chat">
          {!selectedConversation ? (
            <div className="cs-chat-empty">
              <Empty description="选择左侧会话开始聊天" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
          ) : (
            <>
              <div className="cs-chat-header">
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={() => setSelectedConversation(null)}
                  className="cs-chat-back"
                />
                <Space>
                  {selectedConversation.target_type === 'platform' ? (
                    <Tag color="blue">平台客服</Tag>
                  ) : (
                    <Tag color="green">
                      <ShopOutlined /> {selectedConversation.merchant_name ?? '商家'}
                    </Tag>
                  )}
                  {selectedConversation.product_name && (
                    <Text type="secondary">商品：{selectedConversation.product_name}</Text>
                  )}
                  {selectedConversation.order_no && (
                    <Text type="secondary">订单：{selectedConversation.order_no}</Text>
                  )}
                </Space>
              </div>
              <div className="cs-messages-container">
                {messages.length === 0 ? (
                  <Empty description="暂无消息，发送第一条消息开始对话" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '60px 0' }} />
                ) : (
                  messages.map(renderMessage)
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="cs-input-area">
                <Input
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  onPressEnter={() => void sendMessage()}
                  placeholder="输入消息..."
                  disabled={sending}
                  size="large"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={() => void sendMessage()}
                  loading={sending}
                  size="large"
                >
                  发送
                </Button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export function CustomerServicePage() {
  return <CustomerServicePanel />
}
