import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout        from './components/Layout';
import LoginPage     from './pages/Login';
import DashboardPage from './pages/Dashboard';
import AccountsPage  from './pages/Accounts';
import OrdersPage    from './pages/Orders';
import ReturnsPage   from './pages/Returns';
import ProductsPage  from './pages/Products';
import PaymentsPage  from './pages/Payments';
import SettingsPage  from './pages/Settings';
import UsersPage     from './pages/Users';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"/>
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace/>;
}

function Public({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace/> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Public><LoginPage/></Public>}/>
        <Route path="/" element={<Protected><Layout/></Protected>}>
          <Route index element={<Navigate to="/dashboard" replace/>}/>
          <Route path="dashboard" element={<DashboardPage/>}/>
          <Route path="accounts"  element={<AccountsPage/>}/>
          <Route path="orders"    element={<OrdersPage/>}/>
          <Route path="returns"   element={<ReturnsPage/>}/>
          <Route path="products"  element={<ProductsPage/>}/>
          <Route path="payments"  element={<PaymentsPage/>}/>
          <Route path="users"     element={<UsersPage/>}/>
          <Route path="settings"  element={<SettingsPage/>}/>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Routes>
    </AuthProvider>
  );
}
