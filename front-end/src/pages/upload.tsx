import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { FormEvent } from 'react'
import { uploadVideo } from '../services/videos'
import { errorMessage } from '../services/api'
import '../assets/css/upload.css'

export default function Upload() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Choose a video file first.')
      return
    }
    setError('')
    setSubmitting(true)
    setProgress(0)
    try {
      const video = await uploadVideo(title, description, file, setProgress)
      navigate(`/watch/${video.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="upload">
      <h1>Upload a video</h1>
      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Title</span>
          <input
            className="formInput"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your video a title"
            required
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            className="formInput"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this video about?"
          />
        </label>

        <label className="field">
          <span>Video file</span>
          <input
            className="formInput"
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>

        {file && (
          <p className="light-text-sm">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}

        {submitting && (
          <div className="upload-progress-wrap">
            <progress className="upload-progress" value={progress} max={100}>
              {progress}%
            </progress>
            <span>{progress}%</span>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}

        <button className="submitButton" type="submit" disabled={submitting || !file}>
          {submitting ? `Uploading... ${progress}%` : 'Upload video'}
        </button>
      </form>
    </div>
  )
}
