export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

export function getMonthName(month: number): string {
  return new Date(2024, month - 1).toLocaleString('pt-BR', { month: 'long' });
}

export function MONTHS() {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2024, i).toLocaleString('pt-BR', { month: 'long' }),
    short: new Date(2024, i).toLocaleString('pt-BR', { month: 'short' }),
  }));
}
