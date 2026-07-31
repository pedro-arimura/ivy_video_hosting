import { Outlet } from 'react-router'
import Header from './Header'

export default function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>IvyVideo - a video hosting platform MVP</span>
      </footer>
    </div>
  )
}
