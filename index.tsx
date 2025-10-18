import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Dynamically load Dexie.js and then render the app
const dexieScript = document.createElement('script');
dexieScript.src = 'https://unpkg.com/dexie@3/dist/dexie.js';
dexieScript.onload = () => {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Could not find root element to mount to");
    }
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
};
document.head.appendChild(dexieScript);
