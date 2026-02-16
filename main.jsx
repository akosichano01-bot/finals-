import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Siniguradong may .jsx extension para sa Vite
import './index.css'; // Ito ang magkakabit ng design na in-edit natin

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Failed to find the root element. Siguraduhing may <div id='root'></div> sa iyong index.html");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
