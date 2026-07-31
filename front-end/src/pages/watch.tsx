import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { deleteVideo, getVideo, getVideoStats } from '../services/videos'
import { apiUrl, errorMessage } from '../services/api'
import { useAuth } from '../auth-context'
import type { Video, VideoStats } from '../types'
import { formatBytes, formatDuration, formatPercent, pluralize } from '../utils/format'
import '../assets/css/watch.css'

export default function Watch() {
  const { id } = useParams()
  const { user } = useAuth()
  const [video, setVideo] = useState<Video | null>(null)
  const [stats, setStats] = useState<VideoStats | null>(null)
  const [error, setError] = useState('')
  const [prevId, setPrevId] = useState(id)

  if (id !== prevId) {
    setPrevId(id)
    setVideo(null)
    setStats(null)
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

  const isMine = Boolean(video && user?.id === video.owner.id)

  useEffect(() => {
    if (!video || !isMine) return
    let cancelled = false
    getVideoStats(video.id)
      .then((s) => {
        if (!cancelled) setStats(s)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [video, isMine])

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

  const embedCode = `<div data-ivy-video="${video.id}"></div>\n<script src="${apiUrl('/embed/player.js')}" async></script>`

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
          {video.views !== undefined ? ` · ${pluralize(video.views, 'view')}` : ''}
        </p>
        {video.description && <p className="watch-description">{video.description}</p>}

        {isMine && (
          <section className="watch-panel">
            <h2>Embed on your site</h2>
            <p className="light-text-sm">
              Paste this on any HTML page. The player.js file is shared by all
              videos; the UUID is read from the data attribute.
            </p>
            <textarea
              className="formInput embed-code"
              readOnly
              rows={3}
              value={embedCode}
              onFocus={(e) => e.currentTarget.select()}
            />
          </section>
        )}

        {isMine && (
          <section className="watch-panel">
            <h2>Analytics</h2>
            {stats ? (
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-value">{stats.views}</span>
                  <span className="stat-label">Views</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{formatDuration(stats.watch_time_seconds)}</span>
                  <span className="stat-label">Watch time</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{formatPercent(stats.completion_rate)}</span>
                  <span className="stat-label">Completion</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{formatPercent(stats.unmute_rate)}</span>
                  <span className="stat-label">Unmute rate</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{stats.click_rate.toFixed(2)}</span>
                  <span className="stat-label">Plays / view</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{stats.play_clicks}</span>
                  <span className="stat-label">Play clicks</span>
                </div>
              </div>
            ) : (
              <p className="light-text-sm">No playback events recorded yet.</p>
            )}
          </section>
        )}

        {isMine && (
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete video
          </button>
        )}
      </div>
    </div>
  )
}
