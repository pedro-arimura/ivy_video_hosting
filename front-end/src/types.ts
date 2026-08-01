export interface User {
  id: string;
  email: string;
}

export interface VideoSettings {
  autoplay: boolean
  cover_action: 'restart' | 'resume'
  cover_image_url: string
  cover_play_color: string
  cover_play_background: string
  playback_rates: number[]
  default_playback_rate: number
}

export interface Video {
  id: string
  title: string
  description: string
  filename: string
  size_bytes: number
  content_type: string
  created_at: string
  owner: User
  is_mine?: boolean
  views?: number
  settings?: VideoSettings
}

export interface VideoStats {
  views: number
  watch_time_seconds: number
  play_clicks: number
  mutes: number
  unmutes: number
  click_rate: number
  unmute_rate: number
  completion_rate: number
}
