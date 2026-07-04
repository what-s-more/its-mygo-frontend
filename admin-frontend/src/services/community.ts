import { http } from './http'

export type Author = {
  id: number
  nickname: string
  avatar_url?: string | null
}

export type CommunityPost = {
  id: number
  type: string
  title: string
  content: string
  product_ids: number[]
  topic_tags: string[]
  status: string
  author: Author
  like_count: number
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

export const adminCommunityService = {
  listPosts(status = 'pending_audit') {
    return http.get<unknown, { data: PageResult<CommunityPost> }>('/admin/community/posts', { params: { status } })
  },

  auditPost(postId: number, approved: boolean) {
    return http.post<unknown, { data: CommunityPost }>(`/admin/community/posts/${postId}/audit`, { approved })
  },

  hidePost(postId: number) {
    return http.post<unknown, { data: CommunityPost }>(`/admin/community/posts/${postId}/hide`)
  },

  listComments(status = 'pending_audit', postId?: number) {
    return http.get<unknown, { data: PageResult<CommunityComment> }>('/admin/community/comments', {
      params: { status, post_id: postId },
    })
  },

  auditComment(commentId: number, approved: boolean) {
    return http.post<unknown, { data: CommunityComment }>(`/admin/community/comments/${commentId}/audit`, { approved })
  },

  hideComment(commentId: number) {
    return http.post<unknown, { data: CommunityComment }>(`/admin/community/comments/${commentId}/hide`)
  },
}
