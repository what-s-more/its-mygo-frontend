import { http } from './http'

export type AiAssistantMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiAssistantResponse = {
  reply: string
  provider: string
}

export const aiAssistantService = {
  chat(message: string, history: AiAssistantMessage[]) {
    return http.post<unknown, { data: AiAssistantResponse }>('/ai-assistant/chat', {
      message,
      history,
    })
  },
}

