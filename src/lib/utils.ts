export function formatCurrency(amount: number, currency = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CNY: '¥',
    JPY: '¥',
    HKD: 'HK$',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
  };
  const symbol = symbols[currency] || currency + ' ';
  return symbol + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function classNames(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateDocNumber(prefix: string): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `${prefix}-${ymd}-${rand}`;
}

export const TRADE_TERMS = [
  { code: 'EXW', name: 'Ex Works', meaning: '工厂交货（买方承担全部费用和风险）' },
  { code: 'FOB', name: 'Free On Board', meaning: '船上交货（卖方负责到装运港船上）' },
  { code: 'CIF', name: 'Cost, Insurance & Freight', meaning: '成本加保险费加运费（到目的港）' },
  { code: 'CFR', name: 'Cost & Freight', meaning: '成本加运费（到目的港）' },
  { code: 'DDP', name: 'Delivered Duty Paid', meaning: '完税后交货（卖方承担所有费用）' },
  { code: 'DAP', name: 'Delivered At Place', meaning: '目的地交货' },
  { code: 'FCA', name: 'Free Carrier', meaning: '货交承运人' },
  { code: 'CPT', name: 'Carriage Paid To', meaning: '运费付至' },
  { code: 'CIP', name: 'Carriage & Insurance Paid To', meaning: '运费和保险费付至' },
  { code: 'DPU', name: 'Delivered at Place Unloaded', meaning: '目的地卸货后交货' },
];

export const PAYMENT_TERMS = [
  { code: 'T/T 30%', name: 'T/T 30% Deposit + 70% Before Shipment', meaning: '电汇：30%定金，发货前付清尾款' },
  { code: 'T/T 100%', name: 'T/T 100% in Advance', meaning: '电汇：100%预付' },
  { code: 'L/C at sight', name: 'L/C at Sight', meaning: '即期信用证' },
  { code: 'L/C 60 days', name: 'L/C 60 Days', meaning: '60天远期信用证' },
  { code: 'D/P', name: 'Documents against Payment', meaning: '付款交单' },
  { code: 'D/A', name: 'Documents against Acceptance', meaning: '承兑交单' },
  { code: 'Net 30', name: 'Net 30 Days', meaning: '30天账期' },
  { code: 'Net 60', name: 'Net 60 Days', meaning: '60天账期' },
];

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'KRW', name: 'Korean Won', symbol: '₩' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
];
