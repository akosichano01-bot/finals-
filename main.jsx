import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Dahil wala na ang src folder, direktang i-import ang index.css mula sa root.
import './index.css'; 

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Lalabas ito kung may problema sa id='root' ng iyong index.html.
  console.error("Critical Error: Root element not found. Check your index.html.");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
