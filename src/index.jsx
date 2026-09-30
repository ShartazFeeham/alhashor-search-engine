import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <div className='top' role="button" tabIndex={0} aria-label="Back to top" onClick={()=>{
      document.documentElement.scrollTop = 0;
    }} onKeyDown={(event)=>{
      if (event.key === 'Enter') document.documentElement.scrollTop = 0;
    }}>&#8673;</div>
  </React.StrictMode>
);
