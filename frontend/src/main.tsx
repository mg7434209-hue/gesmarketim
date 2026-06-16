import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { CartProvider } from './cart/CartContext';
import { CustomerProvider } from './auth/CustomerContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CustomerProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CustomerProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
