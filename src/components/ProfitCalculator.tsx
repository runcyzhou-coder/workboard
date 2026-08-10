import { useState, useEffect, useCallback } from 'react';
import {
  Calculator as CalcIcon, Plus, Save, Trash2, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, History,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate, classNames, CURRENCIES } from '@/lib/utils';
import type { ProfitCalculation } from '@/lib/supabase';

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

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('profit_calculations').select('*').order('created_at', { ascending: false }).limit(20);
    setHistory((data as ProfitCalculation[]) || []);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

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
                <input type="number" step="0.0001" value={input.exchange_rate} onChange={e => setInput({ ...input, exchange_rate: num(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
