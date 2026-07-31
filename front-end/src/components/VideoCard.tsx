import { Link } from 'react-router'
import type { Video } from '../types'
import { formatBytes } from '../utils/format'

export default function VideoCard({ video }: { video: Video }) {
  const date = new Date(video.created_at).toLocaleDateString()

  return (
    <Link to={`/watch/${video.id}`} className="video-card">
      <div className="video-card-thumb">
        <span aria-hidden="true">▶</span>
      </div>
      <div className="video-card-body">
        <h3 className="video-card-title" title={video.title}>
          {video.title}
        </h3>
        <p className="video-card-meta">
          {video.owner.email} · {date}
        </p>
        <p className="video-card-size">{formatBytes(video.size_bytes)}</p>
      </div>
    </Link>
  )
}
