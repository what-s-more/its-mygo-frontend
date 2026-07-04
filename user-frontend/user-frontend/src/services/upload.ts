import { http } from './http'

export const uploadService = {
  uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return http.post<unknown, { data: { url: string } }>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
