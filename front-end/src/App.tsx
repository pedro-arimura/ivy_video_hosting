import { createBrowserRouter, RouterProvider } from 'react-router'
import AuthProvider from './AuthProvider'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Home from './pages/home'
import Signin from './pages/signin'
import Signup from './pages/signup'
import Upload from './pages/upload'
import Watch from './pages/watch'
import './assets/css/main.css'

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/watch/:id', element: <Watch /> },
      { path: '/signin', element: <Signin /> },
      { path: '/signup', element: <Signup /> },
      {
        path: '/upload',
        element: (
          <RequireAuth>
            <Upload />
          </RequireAuth>
        ),
      },
    ],
  },
])

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
