import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Suppress benign third-party browser extension errors (e.g. Web Vitals extension reportAllChanges / startTime)
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event?.error?.stack?.includes('reportAllChanges') ||
      event?.message?.includes("reading 'startTime'")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
} else {
  console.error("Critical Error: Root element not found. Ensure <div id='root'></div> exists in index.html");
}
