// the file initializes the React application and renders it to the DOM

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// create root to attach to the 'root' in index.html
const root = ReactDOM.createRoot(document.getElementById('root'));

// render the main App component 
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);