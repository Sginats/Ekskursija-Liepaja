import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminApp from './AdminApp.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('admin-root')).render(
  <React.StrictMode><AdminApp /></React.StrictMode>,
);
