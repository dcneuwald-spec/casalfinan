import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import type { Category } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';

const EMOJIS = ['🍽️', '🚗', '🏠', '🏥', '📚', '🎮', '👗', '💄', '🐾', '✈️', '📱', '📈', '💸',
  '💰', '💼', '📊', '🏢', '💵', '🎵', '☕', '🎬', '🛒', '⚡', '💊', '🏋️', '🎁'];
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#F0B27A', '#F8C8DC', '#A8D5BA', '#85C1E9', '#BB8FCE', '#52BE80',
  '#6d28d9', '#2563eb', '#059669', '#dc2626', '#d97706'];

interface CatForm {
  name: string; icon: string; color: string;
  type: 'income' | 'expense' | 'both';
}

const defaultForm: CatForm = { name: '', icon: '💸', color: '#6d28d9', type: 'expense' };

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [form, setForm] = useState<CatForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch { toast.error('Erro ao carregar categorias'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const openCreate = () => { setEditingCat(null); setForm(defaultForm); setIsModalOpen(true); };
  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type as 'income' | 'expense' | 'both' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Digite um nome'); return; }
    setSaving(true);
    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, form);
        toast.success('Categoria atualizada!');
      } else {
        await api.post('/categories', form);
        toast.success('Categoria criada!');
      }
      setIsModalOpen(false);
      loadCategories();
    } catch { toast.error('Erro ao salvar categoria'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta categoria? Lançamentos vinculados serão afetados.')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Categoria excluída');
      loadCategories();
    } catch { toast.error('Erro ao excluir'); }
  };

  const income = categories.filter(c => c.type === 'income');
  const expense = categories.filter(c => c.type === 'expense');
  const both = categories.filter(c => c.type === 'both');

  const renderGroup = (title: string, items: Category[], color: string) => {
    if (items.length === 0) return null;
    return (
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${color}`}>{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map(cat => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-3 group hover:shadow-sm transition-all flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${cat.color}20` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{cat.name}</p>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(cat)} className="p-1 rounded hover:bg-violet-50 text-gray-400 hover:text-violet-600">
                  <Edit2 size={12} />
                </button>
                <button onClick={() => handleDelete(cat.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organize seus lançamentos</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>Nova categoria</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin w-6 h-6 border-4 border-violet-200 border-t-violet-600 rounded-full" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon="🏷️" title="Nenhuma categoria" description="Crie categorias para organizar seus lançamentos" action={<Button onClick={openCreate} icon={<Plus size={16} />}>Nova categoria</Button>} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {renderGroup('Despesas', expense, 'text-red-500')}
          {renderGroup('Receitas', income, 'text-emerald-600')}
          {renderGroup('Ambos', both, 'text-violet-600')}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCat ? 'Editar categoria' : 'Nova categoria'} size="sm">
        <div className="space-y-4">
          <Input label="Nome *" placeholder="Ex: Alimentação" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />

          <Select
            label="Tipo"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value as 'income' | 'expense' | 'both' }))}
            options={[
              { value: 'expense', label: 'Despesa' },
              { value: 'income', label: 'Receita' },
              { value: 'both', label: 'Ambos' },
            ]}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Ícone</label>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setForm(f => ({ ...f, icon: emoji }))}
                  className={`w-9 h-9 rounded-lg text-lg transition-all hover:scale-110 ${form.icon === emoji ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'hover:bg-gray-100'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  className={`w-7 h-7 rounded-lg transition-transform ${form.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${form.color}20` }}>
              {form.icon}
            </div>
            <p className="font-medium text-gray-900">{form.name || 'Preview'}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={handleSave} loading={saving} className="flex-1">{editingCat ? 'Salvar' : 'Criar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
