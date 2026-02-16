import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx' // Dahil nasa root na ang App.jsx, tama ang ./App.jsx
import './index.css'      // Dahil nasa root na ang index.css, tama ang ./index.css

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
