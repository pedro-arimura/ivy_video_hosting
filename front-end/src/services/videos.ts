import { api } from './api'
import type { Video } from '../types'

export function listVideos(): Promise<{ videos: Video[] }> {
  return api<{ videos: Video[] }>('/videos')
}

export function getVideo(id: string): Promise<Video> {
  return api<Video>(`/videos/${id}`)
}

export function uploadVideo(
  title: string,
  description: string,
  file: File,
  onProgress?: (percentage: number) => void,
): Promise<Video> {
  const form = new FormData()
  form.append('title', title)
  form.append('description', description)
  form.append('file', file)
  return api<Video>('/videos/upload', {
    method: 'POST',
    data: form,
    onUploadProgress: (event) => {
      if (event.total && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    },
  })
}

export function deleteVideo(id: string): Promise<void> {
  return api<void>(`/videos/${id}`, { method: 'DELETE' })
}
