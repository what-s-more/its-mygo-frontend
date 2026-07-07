import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import { App } from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#cc785c',
          colorPrimaryHover: '#a9583e',
          colorText: '#141413',
          colorTextSecondary: '#6c6a64',
          colorBgLayout: '#faf9f5',
          colorBgContainer: '#faf9f5',
          colorBgElevated: '#efe9de',
          colorBorder: '#e6dfd8',
          colorBorderSecondary: '#ebe6df',
          borderRadius: 8,
          borderRadiusLG: 12,
          fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif',
          fontFamilyCode: '"JetBrains Mono", ui-monospace, monospace',
        },
        components: {
          Button: {
            controlHeight: 40,
            borderRadius: 8,
          },
          Card: {
            borderRadiusLG: 12,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 40,
          },
          Select: {
            borderRadius: 8,
            controlHeight: 40,
          },
          Tag: {
            borderRadius: 9999,
          },
          Modal: {
            borderRadius: 12,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
