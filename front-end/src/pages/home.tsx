import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listVideos } from '../services/videos'
import { errorMessage } from '../services/api'
import { useAuth } from '../auth-context'
import type { Video } from '../types'
import VideoCard from '../components/VideoCard'
import '../assets/css/home.css'

export default function Home() {
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listVideos()
      .then((res) => {
        if (!cancelled) setVideos(res.videos)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="home">
      <div className="home-hero">
        <h1>High-performance video hosting</h1>
        <p>Upload, share and watch videos in seconds.</p>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p className="page-loading">Loading videos...</p>}

      {!loading && !error && videos.length === 0 && (
        <div className="home-empty">
          <p className="light-text">No videos yet.</p>
          {user ? (
            <Link to="/upload" className="btn btn-primary">
              Upload the first video
            </Link>
          ) : (
            <Link to="/signup" className="btn btn-primary">
              Create an account to upload
            </Link>
          )}
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
