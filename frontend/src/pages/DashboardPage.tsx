import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import type { DashboardData, Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { Card, CardHeader, CardContent } from '../components/ui/Card';

function SummaryCard({
  title, value, icon, color, subtitle
}: {
  title: string; value: string; icon: React.ReactNode; color: string; subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-gray-50`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionItem({ tx }: { tx: Transaction }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${tx.category?.color}20` }}
      >
        {tx.category?.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{tx.description}</p>
        <p className="text-xs text-gray-400">
          {format(new Date(tx.date), "d MMM", { locale: ptBR })} · {tx.user.name}
        </p>
      </div>
      <div className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [month, year]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/dashboard?month=${month}&year=${year}`);
      setData(d);
    } catch {
      console.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthLabel = new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Visão geral das suas finanças</p>
        </div>
        {/* Month navigation */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 capitalize min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Receitas"
          value={formatCurrency(data?.summary.totalIncome || 0)}
          icon={<TrendingUp size={22} className="text-emerald-500" />}
          color="text-emerald-600"
        />
        <SummaryCard
          title="Despesas"
          value={formatCurrency(data?.summary.totalExpense || 0)}
          icon={<TrendingDown size={22} className="text-red-500" />}
          color="text-red-500"
        />
        <SummaryCard
          title="Saldo"
          value={formatCurrency(data?.summary.balance || 0)}
          icon={<Wallet size={22} className="text-violet-500" />}
          color={(data?.summary.balance || 0) >= 0 ? 'text-violet-600' : 'text-red-500'}
        />
        <SummaryCard
          title="A Pagar"
          value={formatCurrency(data?.pendingTransactions.reduce((s, t) => s + t.amount, 0) || 0)}
          icon={<AlertCircle size={22} className="text-amber-500" />}
          color="text-amber-600"
          subtitle={`${data?.pendingTransactions.length || 0} lançamento(s)`}
        />
      </div>

      {/* Per-user breakdown */}
      {(data?.userBreakdown.length || 0) > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data?.userBreakdown.map(ub => (
            <Card key={ub.user.id}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-semibold">
                    {ub.user.name.charAt(0)}
                  </div>
                  <p className="font-semibold text-gray-900">{ub.user.name}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Receitas</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(ub.income)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Despesas</p>
                    <p className="text-sm font-semibold text-red-500">{formatCurrency(ub.expense)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Saldo</p>
                    <p className={`text-sm font-semibold ${ub.balance >= 0 ? 'text-violet-600' : 'text-red-500'}`}>
                      {formatCurrency(ub.balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly evolution */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Evolução mensal</h3>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data?.monthlyEvolution || []}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Receitas" stroke="#10b981" fill="url(#income)" strokeWidth={2} />
                <Area type="monotone" dataKey="expense" name="Despesas" stroke="#ef4444" fill="url(#expense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenses by category pie */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Despesas por categoria</h3>
          </CardHeader>
          <CardContent>
            {(data?.expensesByCategory.length || 0) === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Nenhuma despesa neste período
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie
                      data={data?.expensesByCategory.slice(0, 6)}
                      dataKey="amount"
                      nameKey="category.name"
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={75}
                    >
                      {data?.expensesByCategory.slice(0, 6).map((e, i) => (
                        <Cell key={i} fill={e.category?.color || '#ccc'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {data?.expensesByCategory.slice(0, 5).map((e, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-base">{e.category?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-gray-700 truncate">{e.category?.name}</p>
                          <p className="text-xs text-gray-500">{formatCurrency(e.amount)}</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5">
                          <div
                            className="h-1 rounded-full"
                            style={{
                              width: `${Math.min(100, (e.amount / (data?.summary.totalExpense || 1)) * 100)}%`,
                              backgroundColor: e.category?.color
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent transactions */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Últimos lançamentos</h3>
          </CardHeader>
          <CardContent>
            {(data?.recentTransactions.length || 0) === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Nenhum lançamento neste período</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.recentTransactions.map(tx => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending bills */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">A pagar / receber</h3>
          </CardHeader>
          <CardContent>
            {(data?.pendingTransactions.length || 0) === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Nenhum item pendente 🎉</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.pendingTransactions.map(tx => (
                  <TransactionItem key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900">Comparativo mensal</h3>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.monthlyEvolution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              <Legend />
              <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
