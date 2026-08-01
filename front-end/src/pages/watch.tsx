import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { ChangeEvent } from 'react'
import {
  deleteVideo,
  getVideo,
  getVideoStats,
  updateVideoSettings,
  uploadVideoCover,
} from '../services/videos'
import { apiUrl, errorMessage } from '../services/api'
import { useAuth } from '../auth-context'
import type { Video, VideoStats } from '../types'
import { formatBytes, formatDuration, formatPercent, pluralize } from '../utils/format'
import '../assets/css/watch.css'

const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

function parseRates(input: string): number[] | null {
  const parts = input
    .split(',')
    .map((s) => parseFloat(s.trim()))
    .filter((n) => isFinite(n) && n > 0 && n <= 4)
  return parts.length ? Array.from(new Set(parts)).sort((a, b) => a - b) : null
}

function coverUrlFor(video: Video): string | null {
  const url = video.settings?.cover_image_url
  if (!url) return null
  return url.startsWith('/') ? apiUrl(url) : url
}

function PlayerSettings({
  video,
  onUpdated,
}: {
  video: Video
  onUpdated: (v: Video) => void
}) {
  const s = video.settings
  const [autoplay, setAutoplay] = useState(s?.autoplay ?? false)
  const [coverAction, setCoverAction] = useState<'restart' | 'resume'>(
    s?.cover_action ?? 'restart',
  )
  const [playColor, setPlayColor] = useState(s?.cover_play_color ?? '#ffffff')
  const [playBg, setPlayBg] = useState(s?.cover_play_background ?? '#1a1a1a')
  const [ratesText, setRatesText] = useState((s?.playback_rates ?? DEFAULT_RATES).join(', '))
  const [defaultRate, setDefaultRate] = useState(s?.default_playback_rate ?? 1)
  const [externalCover, setExternalCover] = useState(() => {
    const url = s?.cover_image_url ?? ''
    return url.startsWith('http') ? url : ''
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const parsedRates = parseRates(ratesText)

  async function save() {
    setMsg('')
    setErr('')
    if (!parsedRates) {
      setErr('Playback speeds must be numbers between 0.1 and 4 (comma separated).')
      return
    }
    setSaving(true)
    try {
      const patch: Parameters<typeof updateVideoSettings>[1] = {
        autoplay,
        cover_action: coverAction,
        cover_play_color: playColor,
        cover_play_background: playBg,
        playback_rates: parsedRates,
        default_playback_rate: defaultRate,
      }
      if (externalCover.trim()) patch.cover_image_url = externalCover.trim()
      const updated = await updateVideoSettings(video.id, patch)
      onUpdated(updated)
      setMsg('Settings saved.')
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function onCoverFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg('')
    setErr('')
    setUploading(true)
    try {
      const updated = await uploadVideoCover(video.id, file)
      onUpdated(updated)
      setMsg('Cover image uploaded.')
    } catch (err) {
      setErr(errorMessage(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeCover() {
    setMsg('')
    setErr('')
    setSaving(true)
    try {
      const updated = await updateVideoSettings(video.id, { cover_image_url: null })
      onUpdated(updated)
      setExternalCover('')
      setMsg('Cover image removed.')
    } catch (e) {
      setErr(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const previewCover = coverUrlFor(video)

  return (
    <section className="watch-panel">
      <h2>Player settings</h2>
      <p className="light-text-sm mb-2">
        These settings are used by the embed player on your site. Changes apply
        immediately to pasted embeds.
      </p>

      {msg && <p className="ok-text">{msg}</p>}
      {err && <p className="error-text">{err}</p>}

      <div className="settings-row">
        <label className="settings-check">
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(e) => setAutoplay(e.target.checked)}
          />
          <span>
            Autoplay <em>(muted by default, per browser rules)</em>
          </span>
        </label>
      </div>

      <div className="settings-row">
        <span className="settings-label">Cover click behavior</span>
        <label className="settings-check">
          <input
            type="radio"
            name="cover-action"
            value="restart"
            checked={coverAction === 'restart'}
            onChange={() => setCoverAction('restart')}
          />
          <span>Restart the video with sound</span>
        </label>
        <label className="settings-check">
          <input
            type="radio"
            name="cover-action"
            value="resume"
            checked={coverAction === 'resume'}
            onChange={() => setCoverAction('resume')}
          />
          <span>Unmute and continue from where it is</span>
        </label>
        <p className="light-text-sm">
          When autoplay is on, the video starts muted behind the cover button.
          Clicking the cover uses this behavior.
        </p>
      </div>

      <div className="settings-row">
        <span className="settings-label">Cover image</span>
        {previewCover ? (
          <img className="settings-cover-preview" src={previewCover} alt="Cover preview" />
        ) : (
          <p className="light-text-sm">No cover image set.</p>
        )}
        <div className="settings-inline">
          <input
            ref={fileRef}
            className="settings-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onCoverFile}
          />
          {previewCover && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={removeCover}
              disabled={saving}
            >
              Remove
            </button>
          )}
        </div>
        <label className="settings-label settings-label-sm">
          Or use an external image URL
        </label>
        <input
          className="formInput"
          type="url"
          value={externalCover}
          onChange={(e) => setExternalCover(e.target.value)}
          placeholder="https://example.com/thumbnail.jpg"
        />
        {uploading && <p className="light-text-sm">Uploading cover...</p>}
      </div>

      <div className="settings-row">
        <span className="settings-label">Playback speeds (velocity)</span>
        <input
          className="formInput"
          value={ratesText}
          onChange={(e) => setRatesText(e.target.value)}
          placeholder="0.5, 1, 1.5, 2"
        />
        <label className="settings-label settings-label-sm">Default speed</label>
        <select
          className="formInput"
          value={defaultRate}
          onChange={(e) => setDefaultRate(parseFloat(e.target.value))}
        >
          {(parsedRates ?? DEFAULT_RATES).map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </div>

      <div className="settings-row">
        <span className="settings-label">Play button color</span>
        <div className="settings-inline">
          <input
            className="settings-color"
            type="color"
            value={playColor}
            onChange={(e) => setPlayColor(e.target.value)}
          />
          <input
            className="settings-color"
            type="color"
            value={playBg}
            onChange={(e) => setPlayBg(e.target.value)}
          />
          <span className="light-text-sm">Icon color and button background</span>
        </div>
      </div>

      <div className="settings-actions">
        <button className="submitButton" type="button" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </section>
  )
}

export default function Watch() {
  const { id } = useParams()
  const { user } = useAuth()
  const [video, setVideo] = useState<Video | null>(null)
  const [stats, setStats] = useState<VideoStats | null>(null)
  const [error, setError] = useState('')
  const [prevId, setPrevId] = useState(id)
  const [showPreview, setShowPreview] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  if (id !== prevId) {
    setPrevId(id)
    setVideo(null)
    setStats(null)
    setError('')
    setShowPreview(false)
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

  useEffect(() => {
    if (!showPreview || !video || !previewRef.current) return
    const box = previewRef.current
    box.innerHTML = ''
    const div = document.createElement('div')
    div.setAttribute('data-ivy-video', video.id)
    box.appendChild(div)
    const old = document.querySelector('script[data-ivy-preview]')
    if (old) old.remove()
    const s = document.createElement('script')
    s.setAttribute('data-ivy-preview', '')
    s.src = apiUrl('/embed/player.js')
    s.async = true
    document.body.appendChild(s)
  }, [showPreview, video])

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
          poster={coverUrlFor(video) ?? undefined}
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

        {isMine && <PlayerSettings video={video} onUpdated={setVideo} />}

        {isMine && (
          <section className="watch-panel">
            <h2>Embed on your site</h2>
            <p className="light-text-sm">
              Paste this on any HTML page. The player.js file is shared by all
              videos; the UUID is read from the data attribute. Player settings
              above are applied automatically and update live.
            </p>
            <textarea
              className="formInput embed-code"
              readOnly
              rows={3}
              value={embedCode}
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="settings-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowPreview((p) => !p)}
              >
                {showPreview ? 'Hide embed preview' : 'Preview embed'}
              </button>
            </div>
            {showPreview && (
              <div className="embed-preview" ref={previewRef} />
            )}
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
