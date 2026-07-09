import { useEffect, useRef, useState } from 'react'
import { Button, Input, Space, Spin, Typography, message } from 'antd'
import { CloseOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons'

import { aiAssistantService, type AiAssistantMessage } from '../services/aiAssistant'
import { getApiErrorMessage } from '../services/http'

const { Text } = Typography

const WELCOME_MESSAGE: AiAssistantMessage = {
  role: 'assistant',
  content: '你好，我是一次买够 AI 购物助手。你可以问我商品浏览、优惠积分、拼团、售后、客服和社区种草相关问题。',
}

export function AiAssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AiAssistantMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function sendMessage() {
    const content = input.trim()
    if (!content || loading) return
    const nextMessages: AiAssistantMessage[] = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const response = await aiAssistantService.chat(content, messages.slice(-10))
      setMessages((items) => [...items, { role: 'assistant', content: response.data.reply }])
    } catch (error) {
      message.error(`AI 助手暂时无法回复：${getApiErrorMessage(error)}`)
      setMessages((items) => [...items, { role: 'assistant', content: '抱歉，我暂时没有连接上。你可以稍后再试，或联系平台客服。' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`ai-assistant-widget ${open ? 'ai-assistant-widget-open' : ''}`}>
      {open ? (
        <section className="ai-assistant-panel">
          <header className="ai-assistant-header">
            <Space>
              <span className="ai-assistant-avatar"><RobotOutlined /></span>
              <div>
                <Text strong>AI 购物助手</Text>
                <div className="ai-assistant-subtitle">商城问题快速问答</div>
              </div>
            </Space>
            <Button type="text" icon={<CloseOutlined />} onClick={() => setOpen(false)} />
          </header>
          <div className="ai-assistant-messages">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`ai-assistant-message-row ${item.role === 'user' ? 'ai-assistant-message-user' : 'ai-assistant-message-bot'}`}
              >
                <div className="ai-assistant-message-bubble">{item.content}</div>
              </div>
            ))}
            {loading ? (
              <div className="ai-assistant-message-row ai-assistant-message-bot">
                <div className="ai-assistant-message-bubble"><Spin size="small" /> 正在整理回答...</div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
          <div className="ai-assistant-input">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPressEnter={() => void sendMessage()}
              placeholder="问问优惠、拼团、售后..."
              disabled={loading}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={() => void sendMessage()} loading={loading}>
              发送
            </Button>
          </div>
        </section>
      ) : (
        <Button
          type="primary"
          shape="round"
          size="large"
          icon={<RobotOutlined />}
          className="ai-assistant-fab"
          onClick={() => setOpen(true)}
        >
          AI 助手
        </Button>
      )}
    </div>
  )
}

