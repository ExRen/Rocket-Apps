import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import idID from 'antd/locale/id_ID'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ConfigProvider
            locale={idID}
            theme={{
                token: {
                    colorPrimary: '#0D2B6B',
                    fontFamily: 'Inter, sans-serif',
                    borderRadius: 6,
                },
            }}
        >
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ConfigProvider>
    </React.StrictMode>,
)
