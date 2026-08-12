import { Routes, Route } from 'react-router-dom';
import { CartProvider } from './lib/cart';
import { AdminAuthProvider } from './lib/auth';
import { Storefront } from './pages/Storefront';
import { Checkout } from './pages/Checkout';
import { OrderStatus } from './pages/OrderStatus';
import { AdminLogin } from './pages/AdminLogin';
import { AdminLayout } from './pages/AdminLayout';
import { AdminOrders } from './pages/AdminOrders';
import { AdminProducts } from './pages/AdminProducts';

export default function App() {
  return (
    <AdminAuthProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedido/:id" element={<OrderStatus />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="produtos" element={<AdminProducts />} />
          </Route>
        </Routes>
      </CartProvider>
    </AdminAuthProvider>
  );
}
