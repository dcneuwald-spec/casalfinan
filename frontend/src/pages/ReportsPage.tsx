import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { formatCurrency } from '../utils/currency';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Select } from '../components/ui/Input';

export function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [annualData, setAnnualData] = useState<{
    year: number;
    months: Array<{ month: number; monthName: string; income: number; expense: number; balance: number }>;
    totalIncome: number;
    totalExpense: number;
    totalBalance: number;
  } | null>(null);
  const [catData, setCatData] = useState<{
    data: Array<{ category: { name: string; icon: string; color: string }; amount: number; count: number; percentage: number }>;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [year, month]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [annualRes, catRes] = await Promise.all([
        api.get(`/reports/annual?year=${year}`),
        api.get(`/reports/categories?month=${month}&year=${year}&type=expense`),
      ]);
      setAnnualData(annualRes.data);
      setCatData(catRes.data);
    } catch {
      console.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => ({
    value: now.getFullYear() - i,
    label: String(now.getFullYear() - i),
  }));

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i).toLocaleString('pt-BR', { month: 'long' }),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análise detalhada das suas finanças</p>
        </div>
        <div className="flex gap-3">
          <Select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            options={years}
          />
          <Select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            options={months}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full" />
        </div>
      ) : (
        <>
          {/* Annual summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Receitas no ano', value: annualData?.totalIncome || 0, color: 'text-emerald-600' },
              { label: 'Despesas no ano', value: annualData?.totalExpense || 0, color: 'text-red-500' },
              { label: 'Saldo no ano', value: annualData?.totalBalance || 0, color: (annualData?.totalBalance || 0) >= 0 ? 'text-violet-600' : 'text-red-500' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.color}`}>{formatCurrency(s.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Annual evolution */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Receitas vs Despesas — {year}</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={annualData?.months || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="monthName" tick={{ fontSize: 11 }} tickFormatter={v => v.substring(0, 3)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Balance line */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold text-gray-900">Saldo mensal — {year}</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {annualData?.months.map(m => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-20 capitalize">{m.monthName.substring(0, 3)}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className={`h-5 rounded-full transition-all ${m.balance >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min(100, (Math.abs(m.balance) / Math.max(...(annualData?.months.map(mm => Math.abs(mm.balance)) || [1]))) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-28 text-right ${m.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {formatCurrency(m.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">
                  Despesas por categoria — {new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                </h3>
              </CardHeader>
              <CardContent>
                {(catData?.data.length || 0) === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">Nenhuma despesa neste período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={catData?.data}
                        dataKey="amount"
                        nameKey="category.name"
                        cx="50%" cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} (${((percent as number) * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {catData?.data.map((entry, i) => (
                          <Cell key={i} fill={entry.category?.color || '#ccc'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">Detalhamento por categoria</h3>
              </CardHeader>
              <CardContent>
                {(catData?.data.length || 0) === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-3">
                    {catData?.data.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl">{item.category?.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{item.category?.name}</span>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
                              <span className="text-xs text-gray-400 ml-2">({item.percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${item.percentage}%`, backgroundColor: item.category?.color }}
                            />
                          </div>
                          <span className="text-xs text-gray-400">{item.count} lançamento(s)</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-gray-100 flex justify-between">
                      <span className="text-sm font-semibold text-gray-700">Total</span>
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(catData?.total || 0)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
