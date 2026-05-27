export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  coupleId?: string | null;
  couple?: Couple;
}

export interface Couple {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: User[];
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  coupleId: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  notes?: string;
  isPaid: boolean;
  isShared: boolean;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  userId: string;
  categoryId: string;
  creditCardId?: string | null;
  billId?: string | null;
  category: Category;
  user: { id: string; name: string; avatar?: string };
  creditCard?: { id: string; name: string; color: string } | null;
  createdAt: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  userId: string;
  coupleShared: boolean;
  user: { id: string; name: string };
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  dueDay: number;
  categoryId?: string | null;
  userId: string;
  isActive: boolean;
  isShared: boolean;
  user: { id: string; name: string };
  _count?: { transactions: number };
}

export interface Budget {
  id: string;
  amount: number;
  month: number;
  year: number;
  categoryId: string;
  userId: string;
  category: Category;
  spent?: number;
}

export interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    month: number;
    year: number;
  };
  expensesByCategory: Array<{
    category: Category;
    amount: number;
    categoryId: string;
    _sum: { amount: number };
  }>;
  monthlyEvolution: Array<{
    month: string;
    year: number;
    income: number;
    expense: number;
  }>;
  recentTransactions: Transaction[];
  pendingTransactions: Transaction[];
  userBreakdown: Array<{
    user: { id: string; name: string; avatar?: string };
    income: number;
    expense: number;
    balance: number;
  }>;
}
