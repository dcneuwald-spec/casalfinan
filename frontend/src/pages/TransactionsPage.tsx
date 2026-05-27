import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Transaction, Category } from '../types';
import { formatCurrency } from '../utils/currency';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';

interface TransactionFormData {
  description: string;
  amount: string;
  type: 'income' | 'expense';
  date: string;
  categoryId: string;
  notes: string;
  isPaid: boolean;
  isShared: boolean;
  recurrence: string;
}

const defaultForm: TransactionFormData = {
  description: '', amount: '', type: 'expense',
  date: new Date().toISOString().split('T')[0],
  categoryId: '', notes: '', isPaid: true, isShared: false, recurrence: 'none',
};

export function TransactionsPage() {
  const { user } = useAuthStore();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TransactionFormData>(defaultForm);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, catRes] = await Promise.all([
        api.get(`/transactions?month=${month}&year=${year}`),
        api.get('/categories'),
      ]);
      setTransactions(txRes.data);
      setCategories(catRes.data);
    } catch {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingTx(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setForm({
      description: tx.description,
      amount: tx.amount.toString(),
      type: tx.type,
      date: tx.date.split('T')[0],
      categoryId: tx.categoryId,
      notes: tx.notes || '',
      isPaid: tx.isPaid,
      isShared: tx.isShared,
      recurrence: tx.recurrence,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount || !form.categoryId) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount.replace(',', '.')),
      };
      if (editingTx) {
        await api.put(`/transactions/${editingTx.id}`, payload);
        toast.success('Lançamento atualizado!');
      } else {
        await api.post('/transactions', payload);
        toast.success('Lançamento criado!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error: unknown) {
      toast.error((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lançamento?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success('Lançamento excluído');
      loadData();
    } catch {
      toast.error('Erro ao excluir');
    }
  };

  const handleTogglePaid = async (id: string) => {
    try {
      await api.patch(`/transactions/${id}/toggle-paid`);
      loadData();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const filtered = transactions.filter(tx => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalIncome = filtered.filter(t => t.type === 'income' && t.isPaid).reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense' && t.isPaid).reduce((s, t) => s + t.amount, 0);

  const monthLabel = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const filteredCategories = categories.filter(c => c.type === form.type || c.type === 'both');

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Receitas e despesas do casal</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>Novo lançamento</Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
          <span className="text-sm font-medium text-gray-700 capitalize min-w-[150px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
        </div>

        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-gray-500">Receitas:</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(totalIncome)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-gray-500">Despesas:</span>
            <span className="font-semibold text-red-500">{formatCurrency(totalExpense)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">Saldo:</span>
            <span className={`font-semibold ${totalIncome - totalExpense >= 0 ? 'text-violet-600' : 'text-red-500'}`}>
              {formatCurrency(totalIncome - totalExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar lançamentos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(['all', 'income', 'expense'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                typeFilter === t
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'Todos' : t === 'income' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="💸"
              title="Nenhum lançamento encontrado"
              description="Comece adicionando suas receitas e despesas"
              action={<Button onClick={openCreate} icon={<Plus size={16} />}>Novo lançamento</Button>}
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(tx => (
                <div key={tx.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 transition-colors group">
                  {/* Category icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${tx.category?.color}20` }}
                  >
                    {tx.category?.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
                      {tx.isShared && (
                        <span className="text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">Casal</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">{tx.category?.name}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-xs text-gray-400">{format(new Date(tx.date), "d MMM yyyy", { locale: ptBR })}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-xs text-gray-400">{tx.user.name}</p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <button
                      onClick={() => handleTogglePaid(tx.id)}
                      className={`text-xs mt-0.5 px-2 py-0.5 rounded-full transition-colors ${
                        tx.isPaid
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {tx.isPaid ? '✓ Pago' : '⏳ Pendente'}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    {tx.userId === user?.id && (
                      <>
                        <button
                          onClick={() => openEdit(tx)}
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTx ? 'Editar lançamento' : 'Novo lançamento'}
      >
        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button
                key={t}
                onClick={() => setForm(f => ({ ...f, type: t, categoryId: '' }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  form.type === t
                    ? t === 'expense' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'expense' ? '↓ Despesa' : '↑ Receita'}
              </button>
            ))}
          </div>

          <Input
            label="Descrição *"
            placeholder="Ex: Supermercado"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />

          <Input
            label="Valor (R$) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data *"
              type="date"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            />
            <Select
              label="Categoria *"
              value={form.categoryId}
              onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
              options={[
                { value: '', label: 'Selecione...' },
                ...filteredCategories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
              ]}
            />
          </div>

          <Select
            label="Recorrência"
            value={form.recurrence}
            onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}
            options={[
              { value: 'none', label: 'Sem recorrência' },
              { value: 'monthly', label: 'Mensal' },
              { value: 'weekly', label: 'Semanal' },
              { value: 'yearly', label: 'Anual' },
            ]}
          />

          <Input
            label="Observações"
            placeholder="Opcional..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPaid}
                onChange={e => setForm(f => ({ ...f, isPaid: e.target.checked }))}
                className="w-4 h-4 rounded text-violet-600"
              />
              <span className="text-sm text-gray-700">Pago/Recebido</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isShared}
                onChange={e => setForm(f => ({ ...f, isShared: e.target.checked }))}
                className="w-4 h-4 rounded text-violet-600"
              />
              <span className="text-sm text-gray-700">Do casal</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editingTx ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
