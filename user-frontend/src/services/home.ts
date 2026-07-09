import { http } from './http'

export type HomeBanner = {
  id: number
  title: string
  subtitle?: string | null
  image_url: string
  target_type: 'none' | 'product' | 'url'
  target_id?: number | null
  target_url?: string | null
  sort_order: number
  is_active: boolean
}

export const homeService = {
  listBanners() {
    return http.get<unknown, { data: HomeBanner[] }>('/home/banners')
  },
}
