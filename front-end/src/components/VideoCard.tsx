import { Link } from 'react-router'
import type { Video } from '../types'
import { apiUrl } from '../services/api'
import { formatBytes, pluralize } from '../utils/format'

function coverUrlFor(video: Video): string | null {
  const url = video.settings?.cover_image_url
  if (!url) return null
  return url.startsWith('/') ? apiUrl(url) : url
}

export default function VideoCard({ video }: { video: Video }) {
  const date = new Date(video.created_at).toLocaleDateString()
  const cover = coverUrlFor(video)

  return (
    <Link to={`/watch/${video.id}`} className="video-card">
      <div className="video-card-thumb">
        {cover ? (
          <img className="video-card-thumb-img" src={cover} alt="" loading="lazy" />
        ) : (
          <span aria-hidden="true">▶</span>
        )}
      </div>
      <div className="video-card-body">
        <h3 className="video-card-title" title={video.title}>
          {video.title}
        </h3>
        <p className="video-card-meta">
          {video.owner.email} · {date}
        </p>
        <p className="video-card-size">
          {video.views !== undefined ? `${pluralize(video.views, 'view')} · ` : ''}
          {formatBytes(video.size_bytes)}
        </p>
      </div>
    </Link>
  )
}
