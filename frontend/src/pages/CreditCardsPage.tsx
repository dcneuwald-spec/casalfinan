import { useState, useEffect, useCallback } from 'react';
import { Plus, CreditCard as CreditCardIcon, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { CreditCard } from '../types';
import { formatCurrency } from '../utils/currency';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuthStore } from '../stores/authStore';

const CARD_COLORS = [
  '#6d28d9', '#2563eb', '#0891b2', '#059669',
  '#d97706', '#dc2626', '#db2777', '#7c3aed',
];

const BANKS = ['Nubank', 'Itaú', 'Bradesco', 'Santander', 'Caixa', 'Banco do Brasil', 'Inter', 'XP', 'Outro'];

interface CardForm {
  name: string; bank: string; limit: string;
  closingDay: string; dueDay: string; color: string;
  coupleShared: boolean;
}

const defaultForm: CardForm = {
  name: '', bank: 'Nubank', limit: '', closingDay: '20', dueDay: '5',
  color: '#6d28d9', coupleShared: false,
};

export function CreditCardsPage() {
  const { user } = useAuthStore();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CardForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/credit-cards');
      setCards(data);
    } catch { toast.error('Erro ao carregar cartões'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  const openCreate = () => { setEditingCard(null); setForm(defaultForm); setIsModalOpen(true); };
  const openEdit = (card: CreditCard) => {
    setEditingCard(card);
    setForm({
      name: card.name, bank: card.bank,
      limit: card.limit.toString(),
      closingDay: card.closingDay.toString(),
      dueDay: card.dueDay.toString(),
      color: card.color,
      coupleShared: card.coupleShared,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.limit) { toast.error('Preencha os campos obrigatórios'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, bank: form.bank,
        limit: parseFloat(form.limit),
        closingDay: parseInt(form.closingDay),
        dueDay: parseInt(form.dueDay),
        color: form.color,
        coupleShared: form.coupleShared,
      };
      if (editingCard) {
        await api.put(`/credit-cards/${editingCard.id}`, payload);
        toast.success('Cartão atualizado!');
      } else {
        await api.post('/credit-cards', payload);
        toast.success('Cartão adicionado!');
      }
      setIsModalOpen(false);
      loadCards();
    } catch { toast.error('Erro ao salvar cartão'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este cartão?')) return;
    try {
      await api.delete(`/credit-cards/${id}`);
      toast.success('Cartão excluído');
      loadCards();
    } catch { toast.error('Erro ao excluir'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cartões de Crédito</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie seus cartões e faturas</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>Adicionar cartão</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full" />
        </div>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon="💳"
              title="Nenhum cartão cadastrado"
              description="Adicione seus cartões de crédito para acompanhar as faturas"
              action={<Button onClick={openCreate} icon={<Plus size={16} />}>Adicionar cartão</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.id} className="relative">
              {/* Credit card visual */}
              <div
                className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}aa)` }}
              >
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10" style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <p className="text-xs text-white/70 mb-0.5">{card.bank}</p>
                    <p className="font-bold text-lg">{card.name}</p>
                  </div>
                  <CreditCardIcon size={28} className="opacity-70" />
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-white/70 text-xs">Limite</p>
                    <p className="font-semibold">{formatCurrency(card.limit)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Fechamento</p>
                    <p className="font-semibold">Dia {card.closingDay}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs">Vencimento</p>
                    <p className="font-semibold">Dia {card.dueDay}</p>
                  </div>
                </div>
                {card.coupleShared && (
                  <span className="absolute bottom-4 right-4 text-xs bg-white/20 px-2 py-0.5 rounded-full">Casal</span>
                )}
              </div>

              {/* Card info */}
              <div className="mt-3 flex items-center justify-between px-1">
                <div className="text-sm">
                  <span className="text-gray-500">Titular: </span>
                  <span className="font-medium text-gray-700">{card.user.name}</span>
                </div>
                {card.userId === user?.id && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(card)}
                      className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCard ? 'Editar cartão' : 'Novo cartão'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome do cartão *" placeholder="Ex: Nubank Principal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <Select
              label="Banco *"
              value={form.bank}
              onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
              options={BANKS.map(b => ({ value: b, label: b }))}
            />
          </div>
          <Input label="Limite (R$) *" type="number" step="0.01" min="0" placeholder="5000.00" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Dia de fechamento" type="number" min="1" max="31" value={form.closingDay} onChange={e => setForm(f => ({ ...f, closingDay: e.target.value }))} />
            <Input label="Dia de vencimento" type="number" min="1" max="31" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Cor do cartão</label>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className={`w-8 h-8 rounded-lg transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.coupleShared} onChange={e => setForm(f => ({ ...f, coupleShared: e.target.checked }))} className="w-4 h-4 rounded text-violet-600" />
            <span className="text-sm text-gray-700">Cartão do casal</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editingCard ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
