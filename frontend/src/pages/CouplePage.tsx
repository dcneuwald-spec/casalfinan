import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Copy, UserPlus, Users, LogOut, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader } from '../components/ui/Card';

export function CouplePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuthStore();
  const [coupleName, setCoupleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');

  const handleCreate = async () => {
    if (!coupleName.trim()) { toast.error('Digite o nome do casal'); return; }
    setLoading(true);
    try {
      await api.post('/couple/create', { name: coupleName });
      await refreshUser();
      toast.success('Casal criado! Convide seu parceiro(a)');
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao criar casal');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) { toast.error('Digite o código de convite'); return; }
    setLoading(true);
    try {
      await api.post('/couple/join', { inviteCode });
      await refreshUser();
      toast.success('Você entrou no casal! 🎉');
      navigate('/dashboard');
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao entrar no casal');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Tem certeza que deseja sair do casal?')) return;
    setLoading(true);
    try {
      await api.delete('/couple/leave');
      await refreshUser();
      toast.success('Você saiu do casal');
    } catch {
      toast.error('Erro ao sair do casal');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (user?.couple?.inviteCode) {
      navigator.clipboard.writeText(user.couple.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Código copiado!');
    }
  };

  // Already in a couple
  if (user?.couple) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Casal</h1>
          <p className="text-gray-500 mt-1">Gerencie seu casal e convide seu parceiro(a)</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center">
                <Heart className="text-pink-500" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{user.couple.name}</h2>
                <p className="text-sm text-gray-500">{user.couple.members.length} membro(s)</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Members */}
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-medium text-gray-700">Membros</h3>
              {user.couple.members.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-semibold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>
                  {member.id === user.id && (
                    <span className="ml-auto text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Você</span>
                  )}
                </div>
              ))}
            </div>

            {/* Invite code */}
            {user.couple.members.length < 2 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Convidar parceiro(a)</h3>
                <div className="bg-violet-50 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-violet-600 mb-1">Código de convite</p>
                    <p className="text-2xl font-bold text-violet-700 tracking-widest">{user.couple.inviteCode}</p>
                  </div>
                  <Button variant="secondary" onClick={copyInviteCode} icon={copied ? <Check size={16} /> : <Copy size={16} />}>
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Compartilhe este código com seu parceiro(a) para que ele(a) possa entrar.</p>
              </div>
            )}

            {/* Go to dashboard */}
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/dashboard')}>
                Ir para o Dashboard
              </Button>
              <Button variant="danger" icon={<LogOut size={16} />} onClick={handleLeave} loading={loading}>
                Sair do casal
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not in a couple yet
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-500 rounded-2xl shadow-lg mb-4">
            <Heart className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configure seu casal</h1>
          <p className="text-gray-500 mt-1">Crie um grupo ou entre com um convite</p>
        </div>

        {mode === 'select' && (
          <div className="space-y-3">
            <Card hover onClick={() => setMode('create')} className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="text-violet-600" size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Criar novo casal</h3>
                  <p className="text-sm text-gray-500">Crie e convide seu parceiro(a)</p>
                </div>
              </div>
            </Card>
            <Card hover onClick={() => setMode('join')} className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <UserPlus className="text-pink-600" size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Entrar com código</h3>
                  <p className="text-sm text-gray-500">Insira o código do seu parceiro(a)</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {mode === 'create' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Criar casal</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Nome do casal"
                  placeholder="Ex: João & Maria"
                  value={coupleName}
                  onChange={e => setCoupleName(e.target.value)}
                />
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setMode('select')} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleCreate} loading={loading} className="flex-1">
                    Criar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === 'join' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Entrar com código</h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Código de convite"
                  placeholder="Ex: A1B2C3D4"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  className="text-center text-xl font-bold tracking-widest uppercase"
                />
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => setMode('select')} className="flex-1">
                    Voltar
                  </Button>
                  <Button onClick={handleJoin} loading={loading} className="flex-1">
                    Entrar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
