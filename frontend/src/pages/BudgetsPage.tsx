import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Budget, Category } from '../types';
import { formatCurrency } from '../utils/currency';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';

export function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState({ amount: '', categoryId: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [budRes, catRes] = await Promise.all([
        api.get(`/budgets?month=${month}&year=${year}`),
        api.get('/categories'),
      ]);
      setBudgets(budRes.data);
      setCategories(catRes.data);
    } catch { toast.error('Erro ao carregar orçamentos'); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setEditingBudget(null); setForm({ amount: '', categoryId: '' }); setIsModalOpen(true); };
  const openEdit = (b: Budget) => {
    setEditingBudget(b);
    setForm({ amount: b.amount.toString(), categoryId: b.categoryId });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || !form.categoryId) { toast.error('Preencha todos os campos'); return; }
    setSaving(true);
    try {
      await api.post('/budgets', {
        amount: parseFloat(form.amount),
        categoryId: form.categoryId,
        month, year,
      });
      toast.success(editingBudget ? 'Orçamento atualizado!' : 'Orçamento criado!');
      setIsModalOpen(false);
      loadData();
    } catch { toast.error('Erro ao salvar orçamento'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este orçamento?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('Orçamento excluído');
      loadData();
    } catch { toast.error('Erro ao excluir'); }
  };

  const monthLabel = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');
  const usedCatIds = budgets.map(b => b.categoryId);
  const availableCats = editingBudget
    ? expenseCategories
    : expenseCategories.filter(c => !usedCatIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Defina metas de gasto por categoria</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>Novo orçamento</Button>
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-2 w-fit bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16} /></button>
        <span className="text-sm font-medium text-gray-700 capitalize min-w-[150px] text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={16} /></button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total orçado', value: formatCurrency(totalBudget), color: 'text-violet-600' },
          { label: 'Total gasto', value: formatCurrency(totalSpent), color: 'text-red-500' },
          { label: 'Disponível', value: formatCurrency(totalBudget - totalSpent), color: totalBudget - totalSpent >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Budgets list */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full" />
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="🎯"
              title="Nenhum orçamento definido"
              description="Defina quanto você quer gastar em cada categoria neste mês"
              action={<Button onClick={openCreate} icon={<Plus size={16} />}>Criar orçamento</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {budgets.map(budget => {
            const pct = budget.amount > 0 ? Math.min(100, ((budget.spent || 0) / budget.amount) * 100) : 0;
            const isOver = (budget.spent || 0) > budget.amount;
            return (
              <Card key={budget.id}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${budget.category.color}20` }}
                      >
                        {budget.category.icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{budget.category.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatCurrency(budget.spent || 0)} de {formatCurrency(budget.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isOver ? 'text-red-500' : 'text-gray-700'}`}>
                          {pct.toFixed(0)}%
                        </p>
                        <p className={`text-xs ${isOver ? 'text-red-400' : 'text-gray-400'}`}>
                          {isOver
                            ? `${formatCurrency((budget.spent || 0) - budget.amount)} acima`
                            : `${formatCurrency(budget.amount - (budget.spent || 0))} restante`
                          }
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(budget)} className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(budget.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-violet-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBudget ? 'Editar orçamento' : 'Novo orçamento'}>
        <div className="space-y-4">
          <Select
            label="Categoria *"
            value={form.categoryId}
            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            options={[
              { value: '', label: 'Selecione...' },
              ...availableCats.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]}
          />
          <Input label="Valor orçado (R$) *" type="number" step="0.01" min="0" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editingBudget ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
