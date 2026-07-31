import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { deleteVideo, getVideo } from '../services/videos'
import { apiUrl, errorMessage } from '../services/api'
import { useAuth } from '../auth-context'
import type { Video } from '../types'
import { formatBytes } from '../utils/format'
import '../assets/css/watch.css'

export default function Watch() {
  const { id } = useParams()
  const { user } = useAuth()
  const [video, setVideo] = useState<Video | null>(null)
  const [error, setError] = useState('')
  const [prevId, setPrevId] = useState(id)

  if (id !== prevId) {
    setPrevId(id)
    setVideo(null)
    setError('')
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getVideo(id)
      .then((v) => {
        if (!cancelled) setVideo(v)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleDelete() {
    if (!video) return
    if (!window.confirm('Delete this video?')) return
    try {
      await deleteVideo(video.id)
      window.location.href = '/'
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (error || !video) {
    return (
      <div className="watch">
        {error ? (
          <p className="error-text">{error}</p>
        ) : (
          <p className="page-loading">Loading...</p>
        )}
        <Link to="/" className="btn btn-ghost">
          Back to library
        </Link>
      </div>
    )
  }

  const isMine = user?.id === video.owner.id

  return (
    <div className="watch">
      <div className="watch-video-wrap">
        <video
          className="watch-video"
          controls
          preload="metadata"
          src={apiUrl(`/videos/${video.id}/stream`)}
        />
      </div>
      <div className="watch-info">
        <h1>{video.title}</h1>
        <p className="light-text-sm">
          {video.owner.email} · {new Date(video.created_at).toLocaleString()} ·{' '}
          {video.filename} ({formatBytes(video.size_bytes)})
        </p>
        {video.description && <p className="watch-description">{video.description}</p>}
        {isMine && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete video
          </button>
        )}
      </div>
    </div>
  )
}
