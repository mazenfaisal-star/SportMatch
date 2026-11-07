import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AppUpdateNotice from './components/AppUpdateNotice.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <>
      <App />
      <AppUpdateNotice />
    </>
  </React.StrictMode>,
);
