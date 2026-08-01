import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { FormEvent } from 'react'
import { Icon } from 'react-icons-kit'
import { eyeOff } from 'react-icons-kit/feather/eyeOff'
import { eye } from 'react-icons-kit/feather/eye'
import { useAuth } from '../auth-context'
import { errorMessage } from '../services/api'
import '../assets/css/signup.css'

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await register(email, password)
      navigate('/')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <div className="left-container">
        <div className="left-container-content">
          <img src="/logo_ivyhost_crop.png" alt="IvyVideo logo" width="60%" />
          <div className="text-center">
            <h3 className="mb-2">
              Sign up for free on IvyHosting and share high-performance videos in seconds
            </h3>
            <p className="light-text-sm">
              Already have an account?{' '}
              <Link className="light-text-sm" to="/signin">
                Sign in
              </Link>
            </p>
          </div>

          <form className="signupForm" onSubmit={handleSubmit}>
            <input
              className="formInput"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Insert your email"
              required
            />
            <div className="password-field">
              <input
                className="formInput"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Insert your password"
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon icon={showPassword ? eyeOff : eye} size={18} tag="i" />
              </button>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="submitButton" type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Continue with email'}
            </button>
          </form>
        </div>
      </div>
      <div className="right-container">
        <div className="right-container-content">
          <h2>Share high-performance videos in seconds</h2>
          <p>Fast, simple, free. Just like Vimeo and PandaVideo.</p>
        </div>
      </div>
    </div>
  )
}
