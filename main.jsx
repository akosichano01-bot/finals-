import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Inilagay natin ang CSS sa pinakababa ng imports para ito ang maging "final word" sa design.
// Siguraduhin na ang file na ito ay nasa loob ng 'src' folder kasama ang main.jsx.
import './index.css'; 

const rootElement = document.getElementById('root');

if (!rootElement) {
  // Makikita mo ito sa Console ng browser kung may problema sa index.html
  console.error("Critical Error: Root element not found. Check your index.html.");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
