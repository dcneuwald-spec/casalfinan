import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'solid' | 'soft';
}

export function Badge({ children, color = '#6d28d9', variant = 'soft' }: BadgeProps) {
  if (variant === 'solid') {
    return (
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {children}
    </span>
  );
}

export function TransactionTypeBadge({ type }: { type: 'income' | 'expense' }) {
  return (
    <Badge color={type === 'income' ? '#10b981' : '#ef4444'} variant="soft">
      {type === 'income' ? 'Receita' : 'Despesa'}
    </Badge>
  );
}
