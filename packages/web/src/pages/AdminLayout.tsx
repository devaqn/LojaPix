import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth';

export function AdminLayout() {
  const { admin, loading, logout } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [loading, admin, navigate]);

  if (loading) return <p className="p-8 text-center text-neutral-500">Carregando…</p>;
  if (!admin) return null;

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="font-bold text-purple-800">LojaPix Admin</span>
          <Link to="/admin/pedidos" className="text-sm text-neutral-600 hover:text-purple-700">
            Pedidos
          </Link>
          <Link to="/admin/produtos" className="text-sm text-neutral-600 hover:text-purple-700">
            Produtos
          </Link>
        </div>
        <button
          onClick={() => logout().then(() => navigate('/admin/login'))}
          className="text-sm text-neutral-500 hover:text-red-600"
        >
          Sair
        </button>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
