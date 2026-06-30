import { App as AntApp } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { AppShell } from './components/AppShell'
import { AuthProvider } from './context/AuthContext'

export function App() {
  return (
    <AntApp>
      <BrowserRouter>
        <AuthProvider>
          <AppShell>
            <AppRoutes />
          </AppShell>
        </AuthProvider>
      </BrowserRouter>
    </AntApp>
  )
}
