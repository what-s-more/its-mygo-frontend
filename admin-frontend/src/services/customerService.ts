import { http } from './http'

export type CustomerServiceConversation = {
  id: number
  user_id: number
  user_nickname?: string | null
  target_type: 'merchant' | 'platform'
  merchant_id?: number | null
  merchant_name?: string | null
  product_id?: number | null
  product_name?: string | null
  order_id?: number | null
  order_no?: string | null
  status: string
  last_message_at?: string | null
  last_message?: string | null
  unread_count: number
  created_at: string
  updated_at: string
}

export type CustomerServiceMessage = {
  id: number
  conversation_id: number
  sender_type: 'user' | 'merchant' | 'platform'
  sender_id: number
  sender_name?: string | null
  content_type: 'text' | 'image'
  content: string
  image_urls: string[]
  is_read: boolean
  created_at: string
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export const adminCustomerService = {
  listConversations(session: 'platform' | 'merchant', params?: { status?: string; page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<CustomerServiceConversation> }>('/admin/customer-service/conversations', {
      params,
      headers: { 'X-Admin-Session': session },
    })
  },

  listMessages(session: 'platform' | 'merchant', conversationId: number, params?: { page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<CustomerServiceMessage> }>(`/admin/customer-service/conversations/${conversationId}/messages`, {
      params,
      headers: { 'X-Admin-Session': session },
    })
  },

  sendMessage(session: 'platform' | 'merchant', conversationId: number, payload: { content: string; content_type?: 'text' | 'image'; image_urls?: string[] }) {
    return http.post<unknown, { data: CustomerServiceMessage }>(
      `/admin/customer-service/conversations/${conversationId}/messages`,
      {
        content_type: payload.content_type ?? 'text',
        content: payload.content,
        image_urls: payload.image_urls ?? [],
      },
      { headers: { 'X-Admin-Session': session } },
    )
  },

  closeConversation(session: 'platform' | 'merchant', conversationId: number) {
    return http.post<unknown, { data: CustomerServiceConversation }>(
      `/admin/customer-service/conversations/${conversationId}/close`,
      undefined,
      { headers: { 'X-Admin-Session': session } },
    )
  },
}
