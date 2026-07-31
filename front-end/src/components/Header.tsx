import { Link } from 'react-router'
import { useAuth } from '../auth-context'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="header-logo">
          <img src="/logo_ivyhost_crop.png" alt="IvyVideo logo" />
        </Link>
        <nav className="header-nav">
          {user && (
            <Link to="/upload" className="header-link">
              Upload
            </Link>
          )}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="header-user">{user.email}</span>
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="btn btn-ghost">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
