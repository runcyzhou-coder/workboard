import { useState, useEffect, useCallback } from 'react';
import {
  Save, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, History, RefreshCw, Globe2, ArrowRight,
  DollarSign, Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, classNames, CURRENCIES } from '@/lib/utils';
import type { ProfitCalculation } from '@/lib/supabase';

// Real-time exchange rate types
interface RateData {
  base: string;
  date: string;
  rates: Record<string, number>;
}
interface RateCache {
  data: RateData | null;
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
}
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
// Fallback rates (2026 baseline) in case API is unreachable
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, CNY: 7.25, JPY: 149.5, HKD: 7.80,
  SGD: 1.34, AUD: 1.52, CAD: 1.36, KRW: 1325, INR: 83.2, RUB: 92.5,
  BRL: 5.15, MXN: 16.8, AED: 3.67, TRY: 32.4,
};

interface CalcInput {
  title: string;
  product_name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  currency: string;
  exchange_rate: number;
  freight_cost: number;
  platform_fee_pct: number;
  platform_fee_fixed: number;
  tariff_pct: number;
  other_costs: number;
}

export function ProfitCalculator() {
  const [history, setHistory] = useState<ProfitCalculation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saved, setSaved] = useState(false);
  const [input, setInput] = useState<CalcInput>({
    title: '', product_name: '', quantity: 100, cost_price: 0, selling_price: 0,
    currency: 'USD', exchange_rate: 1, freight_cost: 0, platform_fee_pct: 0,
    platform_fee_fixed: 0, tariff_pct: 0, other_costs: 0,
  });
  // Real-time rate state
  const [rateCache, setRateCache] = useState<RateCache>({
    data: null, fetchedAt: null, loading: false, error: null,
  });
  const [rateBase, setRateBase] = useState<string>('USD');

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('profit_calculations').select('*').order('created_at', { ascending: false }).limit(20);
    setHistory((data as ProfitCalculation[]) || []);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Fetch real-time exchange rates with caching & fallback
  const fetchRates = useCallback(async (base: string, force = false) => {
    const now = Date.now();
    // Use cache if fresh
    if (!force && rateCache.data && rateCache.fetchedAt && (now - rateCache.fetchedAt) < CACHE_TTL && rateCache.data.base === base) {
      return;
    }
    setRateCache(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Frankfurter API: open-source, no key needed (EUR-based), supports USD base via latest?from=
      // Try frankfurter first
      let data: RateData | null = null;
      try {
        const symbols = Object.keys(FALLBACK_RATES).filter(s => s !== base).join(',');
        const res = await fetch(`https://api.frankfurter.app/latest?from=${base}&to=${symbols}`);
        if (res.ok) {
          const json = await res.json();
          data = { base: json.base || base, date: json.date || new Date().toISOString().slice(0, 10), rates: json.rates || {} };
        }
      } catch { /* ignore, try next API */ }
      // Backup: exchangerate.host (free tier, no key for EUR-based)
      if (!data) {
        try {
          const res2 = await fetch(`https://api.exchangerate.host/latest?base=${base}`);
          if (res2.ok) {
            const j2 = await res2.json();
            if (j2.rates) {
              data = { base: j2.base || base, date: j2.date || new Date().toISOString().slice(0, 10), rates: j2.rates };
            }
          }
        } catch { /* ignore */ }
      }
      // Fallback: build synthetic data using baseline normalized to requested base
      if (!data) {
        const usdToBase = 1 / (FALLBACK_RATES[base] || 1);
        const rates: Record<string, number> = {};
        Object.keys(FALLBACK_RATES).forEach(code => {
          if (code === base) rates[code] = 1;
          else rates[code] = (FALLBACK_RATES[code] || 1) * usdToBase;
        });
        data = { base, date: new Date().toISOString().slice(0, 10), rates };
        setRateCache(prev => ({ ...prev, data, fetchedAt: now, loading: false, error: 'API暂不可用，使用参考基准汇率（非实时）' }));
        return;
      }
      setRateCache({ data, fetchedAt: now, loading: false, error: null });
    } catch (e) {
      // Last-resort fallback
      const msg = e instanceof Error ? e.message : '获取汇率失败';
      const usdToBase = 1 / (FALLBACK_RATES[base] || 1);
      const rates: Record<string, number> = {};
      Object.keys(FALLBACK_RATES).forEach(code => {
        if (code === base) rates[code] = 1;
        else rates[code] = (FALLBACK_RATES[code] || 1) * usdToBase;
      });
      setRateCache({
        data: { base, date: new Date().toISOString().slice(0, 10), rates },
        fetchedAt: now, loading: false,
        error: `${msg}，已使用参考汇率`,
      });
    }
  }, [rateCache.data, rateCache.fetchedAt]);

  // Auto-load rates on mount and when base changes
  useEffect(() => { fetchRates(rateBase); }, [rateBase, fetchRates]);

  function getRate(from: string, to: string): number {
    if (from === to) return 1;
    const rates = rateCache.data?.rates;
    if (!rates) {
      // Fallback via USD baseline
      const fu = FALLBACK_RATES[from] || 1, tu = FALLBACK_RATES[to] || 1;
      return tu / fu;
    }
    if (rateCache.data?.base === from && rates[to]) return rates[to];
    if (rateCache.data?.base === to && rates[from]) return 1 / rates[from];
    // Via base cross-rate
    const base = rateCache.data?.base || 'USD';
    const fromInBase = (base === from) ? 1 : (rates[from] || (1 / (FALLBACK_RATES[from] || 1)));
    const toInBase = (base === to) ? 1 : (rates[to] || (1 / (FALLBACK_RATES[to] || 1)));
    return toInBase / fromInBase;
  }

  function applyRateToCalc(fromCode: string, toCode: string) {
    const rate = getRate(fromCode, toCode);
    setInput(prev => ({ ...prev, currency: toCode, exchange_rate: rate }));
  }

  const quantity = input.quantity || 0;
  const totalCost = (input.cost_price * quantity) + input.freight_cost + input.other_costs + input.platform_fee_fixed;
  const platformFee = totalCost * (input.platform_fee_pct / 100);
  const tariff = input.cost_price * quantity * (input.tariff_pct / 100);
  const grandTotalCost = totalCost + platformFee + tariff;
  const totalRevenue = input.selling_price * quantity;
  const profit = totalRevenue - grandTotalCost;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  const isProfit = profit >= 0;
  const isWarning = profitMargin > 0 && profitMargin < 10;

  async function saveCalc() {
    if (!input.product_name.trim()) { alert('请输入产品名称'); return; }
    const payload = {
      title: input.title || input.product_name,
      product_name: input.product_name,
      quantity, cost_price: input.cost_price, selling_price: input.selling_price,
      currency: input.currency, exchange_rate: input.exchange_rate,
      freight_cost: input.freight_cost, platform_fee_pct: input.platform_fee_pct,
      platform_fee_fixed: input.platform_fee_fixed, tariff_pct: input.tariff_pct,
      tariff_amount: tariff, other_costs: input.other_costs,
      total_cost: grandTotalCost, total_revenue: totalRevenue, profit, profit_margin: profitMargin,
    };
    await supabase.from('profit_calculations').insert(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadHistory();
  }

  async function deleteHistory(id: string) {
    await supabase.from('profit_calculations').delete().eq('id', id);
    loadHistory();
  }

  function loadHistoryItem(item: ProfitCalculation) {
    setInput({
      title: item.title, product_name: item.product_name, quantity: item.quantity,
      cost_price: item.cost_price, selling_price: item.selling_price, currency: item.currency,
      exchange_rate: item.exchange_rate, freight_cost: item.freight_cost,
      platform_fee_pct: item.platform_fee_pct, platform_fee_fixed: item.platform_fee_fixed,
      tariff_pct: item.tariff_pct, other_costs: item.other_costs,
    });
    setShowHistory(false);
  }

  const num = (v: string) => parseFloat(v) || 0;

  const popularPairs = [
    { from: 'USD', to: 'CNY', label: '美元 → 人民币' },
    { from: 'EUR', to: 'CNY', label: '欧元 → 人民币' },
    { from: 'GBP', to: 'CNY', label: '英镑 → 人民币' },
    { from: 'JPY', to: 'CNY', label: '日元 → 人民币' },
    { from: 'USD', to: 'EUR', label: '美元 → 欧元' },
    { from: 'USD', to: 'GBP', label: '美元 → 英镑' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">防亏报价核算</h1>
          <p className="text-slate-500 mt-1">输入成本、数量、运费、关税和平台扣点，自动计算利润与利润率</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm">
            <History className="w-4 h-4" />历史记录
          </button>
          <button onClick={saveCalc} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? '已保存' : '保存核算'}
          </button>
        </div>
      </div>

      {/* Real-time Exchange Rate Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              <Globe2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                实时汇率看板
                {rateCache.loading && (
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-600 animate-spin" />
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                数据来源: {rateCache.error ? '本地参考基准' : 'Frankfurter 公开 API'}
                {rateCache.data?.date && ` · 数据日期 ${rateCache.data.date}`}
                {rateCache.fetchedAt && ` · 更新于 ${new Date(rateCache.fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 shrink-0">基准货币</label>
            <select
              value={rateBase}
              onChange={e => setRateBase(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} · {c.name}</option>)}
            </select>
            <button
              onClick={() => fetchRates(rateBase, true)}
              disabled={rateCache.loading}
              className="p-2 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-white border border-slate-200 disabled:opacity-50 transition-colors"
              title="刷新汇率"
            >
              <RefreshCw className={classNames('w-4 h-4', rateCache.loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {rateCache.error && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{rateCache.error}
          </div>
        )}

        <div className="p-5">
          {/* Popular pairs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {popularPairs.map(pair => {
              const rate = getRate(pair.from, pair.to);
              const isCurrentCalc = input.currency === pair.to;
              return (
                <button
                  key={`${pair.from}-${pair.to}`}
                  onClick={() => applyRateToCalc(pair.from, pair.to)}
                  className={classNames(
                    'text-left p-3 rounded-xl border transition-all hover:shadow-md',
                    isCurrentCalc
                      ? 'border-cyan-400 bg-cyan-50 ring-2 ring-cyan-100'
                      : 'border-slate-200 bg-white hover:border-cyan-300'
                  )}
                >
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                    <span>{pair.from}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>{pair.to}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 leading-tight">
                    {rate.toFixed(rate >= 100 ? 2 : rate >= 10 ? 3 : 4)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{pair.label}</p>
                  {isCurrentCalc && (
                    <p className="text-[10px] font-medium text-cyan-700 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />已应用到核算
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Full rate table */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-600" />
                完整汇率表 <span className="text-xs font-normal text-slate-400">(基准: 1 {rateBase})</span>
              </h3>
              <p className="text-[10px] text-slate-400">点击任意币种可快速切换核算币种并填入对应汇率</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {CURRENCIES.map(c => {
                if (c.code === rateBase) return null;
                const rate = getRate(rateBase, c.code);
                return (
                  <button
                    key={c.code}
                    onClick={() => applyRateToCalc('USD' === rateBase ? 'USD' : rateBase, c.code)}
                    className="group flex flex-col items-center p-2.5 rounded-lg border border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 transition-all"
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <DollarSign className="w-3 h-3 text-slate-400 group-hover:text-cyan-600" />
                      <span className="text-xs font-semibold text-slate-700 group-hover:text-cyan-700">{c.code}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 tabular-nums">
                      {rate.toFixed(rate >= 100 ? 2 : rate >= 10 ? 3 : 4)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Input panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="核算标题">
              <input value={input.title} onChange={e => setInput({ ...input, title: e.target.value })} placeholder="如：蓝牙耳机1000pcs出口德国"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="产品名称 *">
              <input value={input.product_name} onChange={e => setInput({ ...input, product_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="数量">
              <input type="number" value={input.quantity} onChange={e => setInput({ ...input, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="成本单价">
              <input type="number" step="0.01" value={input.cost_price} onChange={e => setInput({ ...input, cost_price: num(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="售价单价">
              <input type="number" step="0.01" value={input.selling_price} onChange={e => setInput({ ...input, selling_price: num(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Field>
            <Field label="币种">
              <select value={input.currency} onChange={e => setInput({ ...input, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
            </Field>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">额外成本</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="运费 (总计)">
                <input type="number" step="0.01" value={input.freight_cost} onChange={e => setInput({ ...input, freight_cost: num(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="其他费用">
                <input type="number" step="0.01" value={input.other_costs} onChange={e => setInput({ ...input, other_costs: num(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="平台固定费用">
                <input type="number" step="0.01" value={input.platform_fee_fixed} onChange={e => setInput({ ...input, platform_fee_fixed: num(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="平台扣点 (%)">
                <input type="number" step="0.01" value={input.platform_fee_pct} onChange={e => setInput({ ...input, platform_fee_pct: num(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="关税 (%)">
                <input type="number" step="0.01" value={input.tariff_pct} onChange={e => setInput({ ...input, tariff_pct: num(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="汇率 (参考)">
                <div className="flex gap-2">
                  <input type="number" step="0.0001" value={input.exchange_rate} onChange={e => setInput({ ...input, exchange_rate: num(e.target.value) })}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button
                    onClick={() => {
                      const rate = getRate('CNY', input.currency);
                      setInput(prev => ({ ...prev, exchange_rate: rate }));
                    }}
                    disabled={rateCache.loading}
                    className="flex items-center gap-1 px-3 py-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100 text-xs font-medium disabled:opacity-50"
                    title="获取 CNY → 当前币种的实时汇率"
                  >
                    <RefreshCw className={classNames('w-3.5 h-3.5', rateCache.loading && 'animate-spin')} />
                    取实时
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  当前币种 {input.currency} · 1 CNY = {(1 / (getRate('CNY', input.currency) || 1)).toFixed(4)} {input.currency}
                </p>
              </Field>
            </div>
          </div>
        </div>

        {/* Result panel */}
        <div className="space-y-4">
          <div className={classNames(
            'rounded-xl p-6 text-white transition-colors',
            isProfit ? (isWarning ? 'bg-gradient-to-br from-amber-500 to-amber-600' : 'bg-gradient-to-br from-emerald-500 to-emerald-600') : 'bg-gradient-to-br from-red-500 to-red-600'
          )}>
            <div className="flex items-center gap-2 mb-4">
              {isProfit ? (isWarning ? <AlertTriangle className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />) : <TrendingDown className="w-5 h-5" />}
              <span className="text-sm font-medium opacity-90">{isProfit ? (isWarning ? '利润偏低' : '盈利') : '亏损'}</span>
            </div>
            <p className="text-3xl font-bold">{isProfit ? '+' : ''}{formatCurrency(profit, input.currency)}</p>
            <p className="text-sm opacity-80 mt-1">利润率: {profitMargin.toFixed(2)}%</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">核算明细</h3>
            <Row label="销售收入" value={formatCurrency(totalRevenue, input.currency)} />
            <Row label="产品成本" value={formatCurrency(input.cost_price * quantity, input.currency)} negative />
            <Row label="运费" value={formatCurrency(input.freight_cost, input.currency)} negative />
            <Row label="其他费用" value={formatCurrency(input.other_costs, input.currency)} negative />
            <Row label="平台固定费" value={formatCurrency(input.platform_fee_fixed, input.currency)} negative />
            <Row label={`平台扣点 (${input.platform_fee_pct}%)`} value={formatCurrency(platformFee, input.currency)} negative />
            <Row label={`关税 (${input.tariff_pct}%)`} value={formatCurrency(tariff, input.currency)} negative />
            <div className="border-t border-slate-100 pt-3 flex justify-between text-sm font-semibold">
              <span className="text-slate-700">总成本</span>
              <span className="text-slate-900">{formatCurrency(grandTotalCost, input.currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-700">净利润</span>
              <span className={isProfit ? 'text-emerald-600' : 'text-red-500'}>
                {isProfit ? '+' : ''}{formatCurrency(profit, input.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      {showHistory && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">历史核算记录</h3>
          {history.length === 0 ? (
            <p className="text-center text-slate-400 py-6 text-sm">暂无历史记录</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{h.title}</p>
                      <span className={classNames('px-2 py-0.5 rounded text-xs font-medium', h.profit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                        {h.profit >= 0 ? '+' : ''}{formatCurrency(h.profit, h.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {h.product_name} · {h.quantity} pcs · 利润率 {h.profit_margin.toFixed(1)}% · {formatDate(h.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => loadHistoryItem(h)} className="px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-medium">载入</button>
                    <button onClick={() => deleteHistory(h.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={negative ? 'text-red-500' : 'text-slate-900'}>{negative ? '-' : ''}{value}</span>
    </div>
  );
}
