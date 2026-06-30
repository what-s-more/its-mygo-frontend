import { App as AntApp } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './routes'
import { AppShell } from './components/AppShell'

export function App() {
  return (
    <AntApp>
      <BrowserRouter>
        <AppShell>
          <AppRoutes />
        </AppShell>
      </BrowserRouter>
    </AntApp>
  )
}
