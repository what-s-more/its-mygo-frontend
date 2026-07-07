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
          colorPrimaryActive: '#a9583e',
          colorPrimaryBg: '#faf9f5',
          colorTextBase: '#141413',
          colorText: '#3d3d3a',
          colorTextSecondary: '#6c6a64',
          colorTextTertiary: '#8e8b82',
          colorBgBase: '#faf9f5',
          colorBgLayout: '#faf9f5',
          colorBgContainer: '#efe9de',
          colorBgElevated: '#f5f0e8',
          colorBorder: '#e6dfd8',
          colorBorderSecondary: '#ebe6df',
          borderRadius: 8,
          borderRadiusLG: 12,
          borderRadiusSM: 6,
          borderRadiusXS: 4,
          fontFamily: 'StyreneB, Inter, "PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: 16,
          fontSizeLG: 18,
          fontSizeSM: 14,
          controlHeight: 40,
        },
        components: {
          Button: {
            controlHeight: 40,
            borderRadius: 8,
            paddingInline: 20,
            fontWeight: 500,
          },
          Card: {
            borderRadiusLG: 12,
            colorBgContainer: '#efe9de',
            headerBg: '#f5f0e8',
            colorBorderSecondary: '#e6dfd8',
          },
          Table: {
            headerBg: '#f5f0e8',
            headerColor: '#141413',
            borderRadius: 12,
          },
          Input: {
            borderRadius: 8,
            controlHeight: 40,
            paddingInline: 14,
            paddingBlock: 10,
            activeBorderColor: '#cc785c',
            hoverBorderColor: '#cc785c',
          },
          Menu: {
            itemBg: '#faf9f5',
            itemHoverBg: '#f5f0e8',
            itemSelectedBg: '#efe9de',
            itemColor: '#3d3d3a',
            itemSelectedColor: '#141413',
            itemHoverColor: '#141413',
          },
          Tag: {
            borderRadiusSM: 9999,
          },
          Tabs: {
            itemSelectedColor: '#cc785c',
            inkBarColor: '#cc785c',
            itemHoverColor: '#a9583e',
          },
          Modal: {
            borderRadiusLG: 12,
          },
          Select: {
            borderRadius: 8,
            controlHeight: 40,
          },
          Pagination: {
            borderRadius: 8,
          },
          Message: {
            borderRadius: 12,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
