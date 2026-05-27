import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Bill, Category } from '../types';
import { formatCurrency } from '../utils/currency';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';

interface BillForm {
  description: string; amount: string; dueDay: string;
  categoryId: string; isActive: boolean; isShared: boolean;
}

const defaultForm: BillForm = {
  description: '', amount: '', dueDay: '10',
  categoryId: '', isActive: true, isShared: false,
};

export function BillsPage() {
  const { user } = useAuthStore();
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [form, setForm] = useState<BillForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billsRes, catRes] = await Promise.all([
        api.get('/bills'), api.get('/categories')
      ]);
      setBills(billsRes.data);
      setCategories(catRes.data);
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => { setEditingBill(null); setForm(defaultForm); setIsModalOpen(true); };
  const openEdit = (bill: Bill) => {
    setEditingBill(bill);
    setForm({
      description: bill.description,
      amount: bill.amount.toString(),
      dueDay: bill.dueDay.toString(),
      categoryId: bill.categoryId || '',
      isActive: bill.isActive,
      isShared: bill.isShared,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount) { toast.error('Preencha os campos obrigatórios'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        dueDay: parseInt(form.dueDay),
        categoryId: form.categoryId || null,
      };
      if (editingBill) {
        await api.put(`/bills/${editingBill.id}`, payload);
        toast.success('Conta atualizada!');
      } else {
        await api.post('/bills', payload);
        toast.success('Conta criada!');
      }
      setIsModalOpen(false);
      loadData();
    } catch { toast.error('Erro ao salvar conta'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta conta fixa?')) return;
    try {
      await api.delete(`/bills/${id}`);
      toast.success('Conta excluída');
      loadData();
    } catch { toast.error('Erro ao excluir'); }
  };

  const handlePay = async (bill: Bill) => {
    if (!bill.categoryId) { toast.error('Configure uma categoria para esta conta antes de pagar'); return; }
    try {
      await api.post(`/bills/${bill.id}/pay`, {
        date: new Date().toISOString().split('T')[0],
        categoryId: bill.categoryId,
      });
      toast.success(`Pagamento de "${bill.description}" registrado!`);
    } catch { toast.error('Erro ao registrar pagamento'); }
  };

  const totalMonthly = bills.filter(b => b.isActive).reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contas Fixas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Assinaturas e despesas recorrentes</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>Nova conta</Button>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-5 text-white">
        <p className="text-sm text-white/70">Total mensal (contas ativas)</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(totalMonthly)}</p>
        <p className="text-sm text-white/70 mt-1">{bills.filter(b => b.isActive).length} conta(s) ativa(s)</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full" />
        </div>
      ) : bills.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="📋"
              title="Nenhuma conta fixa"
              description="Cadastre suas assinaturas e contas mensais"
              action={<Button onClick={openCreate} icon={<Plus size={16} />}>Nova conta</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {bills.map(bill => {
                const cat = categories.find(c => c.id === bill.categoryId);
                return (
                  <div key={bill.id} className={`flex items-center gap-4 px-6 py-4 group hover:bg-gray-50 transition-colors ${!bill.isActive ? 'opacity-50' : ''}`}>
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: cat ? `${cat.color}20` : '#f3f4f6' }}
                    >
                      {cat?.icon || '📋'}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{bill.description}</p>
                        {bill.isShared && <span className="text-xs bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full">Casal</span>}
                        {!bill.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Inativa</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Vence todo dia {bill.dueDay} · {bill.user.name}
                        {bill._count && ` · ${bill._count.transactions} pagamento(s)`}
                      </p>
                    </div>

                    {/* Amount */}
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(bill.amount)}/mês</p>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {bill.userId === user?.id && (
                        <>
                          <button
                            onClick={() => handlePay(bill)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Registrar pagamento"
                          >
                            <CheckCircle size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(bill)}
                            className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(bill.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBill ? 'Editar conta' : 'Nova conta fixa'}>
        <div className="space-y-4">
          <Input label="Descrição *" placeholder="Ex: Netflix, Aluguel..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor mensal (R$) *" type="number" step="0.01" min="0" placeholder="0,00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            <Input label="Dia do vencimento" type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} />
          </div>
          <Select
            label="Categoria"
            value={form.categoryId}
            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            options={[
              { value: '', label: 'Selecione...' },
              ...categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
            ]}
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Conta ativa</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isShared} onChange={e => setForm(f => ({ ...f, isShared: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-gray-700">Do casal</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editingBill ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
