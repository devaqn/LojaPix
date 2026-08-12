import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@lojapix.demo');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/admin/pedidos');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <Card className="w-full p-6">
        <h1 className="mb-4 text-lg font-bold text-purple-800">Painel LojaPix</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">E-mail</label>
            <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Senha</label>
            <Input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-xs text-neutral-400">Demo: admin@lojapix.demo / admin123</p>
      </Card>
    </div>
  );
}
