import { http } from './http'

export type Author = {
  id: number
  nickname: string
  avatar_url?: string | null
}

export type CommunityPost = {
  id: number
  merchant_id?: number | null
  type: string
  section: string
  title: string
  content: string
  image_urls: string[]
  product_ids: number[]
  topic_tags: string[]
  status: string
  author: Author
  like_count: number
  favorite_count: number
  favorited: boolean
  comment_count: number
  created_at: string
}

export type CommunityComment = {
  id: number
  post_id: number
  author: Author
  content: string
  status: string
  created_at: string
}

export type PageResult<T> = {
  list: T[]
  page: number
  page_size: number
  total: number
}

export type CommunityUserProfile = {
  user: Author
  post_count: number
  grass_post_count: number
  comment_count: number
  like_received_count: number
  recent_posts: CommunityPost[]
}

export type CommunityTopic = {
  name: string
  post_count: number
}

export type CommunityFavoritePostItem = {
  post: CommunityPost
  favorited_at: string
}

export const communityService = {
  listPosts(params?: { section?: string; author_id?: number; topic?: string; page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<CommunityPost> }>('/community/posts', { params })
  },

  listTopics(params?: { limit?: number }) {
    return http.get<unknown, { data: CommunityTopic[] }>('/community/topics', { params })
  },

  getUserProfile(userId: number) {
    return http.get<unknown, { data: CommunityUserProfile }>(`/community/users/${userId}`)
  },

  listUserPosts(userId: number, params?: { section?: string; topic?: string; page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<CommunityPost> }>(`/community/users/${userId}/posts`, { params })
  },

  createPost(payload: {
    type: string
    title: string
    content: string
    product_ids: number[]
    topic_tags: string[]
    section?: string
    image_urls?: string[]
  }) {
    return http.post<unknown, { data: CommunityPost }>('/community/posts', payload)
  },

  deletePost(postId: number) {
    return http.delete<unknown, { data: null }>(`/community/posts/${postId}`)
  },

  likePost(postId: number) {
    return http.post<unknown, { data: { liked: boolean; like_count: number } }>(`/community/posts/${postId}/like`)
  },

  favoritePost(postId: number) {
    return http.post<unknown, { data: { favorited: boolean; favorite_count: number } }>(`/community/posts/${postId}/favorite`)
  },

  listFavoritePosts(params?: { page?: number; page_size?: number }) {
    return http.get<unknown, { data: PageResult<CommunityFavoritePostItem> }>('/community/favorite-posts', { params })
  },

  listComments(postId: number) {
    return http.get<unknown, { data: PageResult<CommunityComment> }>(`/community/posts/${postId}/comments`)
  },

  createComment(postId: number, content: string) {
    return http.post<unknown, { data: CommunityComment }>(`/community/posts/${postId}/comments`, { content })
  },
}
