import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Force light mode: remove any lingering dark theme class and stored theme preference
try {
  document.documentElement.classList.remove('dark');
  if (localStorage.getItem('theme')) {
    localStorage.removeItem('theme');
  }
} catch (_) {}

// Normalize URL for HashRouter
if (window.location.pathname !== '/' && window.location.hash) {
  window.location.replace(window.location.origin + '/' + window.location.hash);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
