import { useState } from 'react';
import {
  Globe2, Ship, FileText, Calculator, Search, Info,
} from 'lucide-react';
import { TRADE_TERMS, PAYMENT_TERMS, CURRENCIES, formatCurrency, classNames } from '@/lib/utils';

type ToolTab = 'incoterms' | 'payment' | 'currency' | 'container' | 'hs-lookup';

export function TradeTools() {
  const [tab, setTab] = useState<ToolTab>('incoterms');

  const tabs: { id: ToolTab; label: string; icon: typeof Globe2 }[] = [
    { id: 'incoterms', label: '贸易术语', icon: Ship },
    { id: 'payment', label: '付款方式', icon: FileText },
    { id: 'currency', label: '汇率换算', icon: Calculator },
    { id: 'container', label: '集装箱计算', icon: Globe2 },
    { id: 'hs-lookup', label: 'HS编码查询', icon: Search },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">贸易工具</h1>
        <p className="text-slate-500 mt-1">常用外贸工具：贸易术语、付款方式、汇率换算、集装箱计算</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={classNames(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
                tab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'incoterms' && <IncotermsTool />}
      {tab === 'payment' && <PaymentTool />}
      {tab === 'currency' && <CurrencyTool />}
      {tab === 'container' && <ContainerTool />}
      {tab === 'hs-lookup' && <HsLookupTool />}
    </div>
  );
}

function IncotermsTool() {
  const [search, setSearch] = useState('');
  const filtered = TRADE_TERMS.filter(t =>
    !search || t.code.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.meaning.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索术语代码或名称..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(term => (
          <div key={term.code} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-sm">{term.code}</span>
              <h3 className="font-semibold text-slate-900 text-sm">{term.name}</h3>
            </div>
            <p className="text-sm text-slate-600">{term.meaning}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaymentTool() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {PAYMENT_TERMS.map(term => (
        <div key={term.code} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs">{term.code}</span>
          </div>
          <h3 className="font-semibold text-slate-900 text-sm mb-1">{term.name}</h3>
          <p className="text-sm text-slate-600">{term.meaning}</p>
          <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50 rounded-lg">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {term.code.startsWith('T/T') ? '最常用方式。定金保护卖方，尾款发货前支付确保收款安全。' :
               term.code.startsWith('L/C') ? '银行信用担保，安全性高但手续复杂、费用较高。适合大额交易。' :
               term.code.startsWith('D/P') ? '付款后交单，买方不付款则无法提货。风险介于L/C和D/A之间。' :
               term.code.startsWith('D/A') ? '承兑后交单，卖方承担较大风险。仅对信用良好的老客户使用。' :
               '账期交易，卖方承担全部收款风险。需对客户信用有充分了解。'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CurrencyTool() {
  const [amount, setAmount] = useState(100);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('CNY');
  const [rate, setRate] = useState(7.25);

  const result = amount * rate;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">汇率换算器</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">金额</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">汇率 (1 {from} = ? {to})</label>
          <input type="number" step="0.0001" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">从</label>
          <select value={from} onChange={e => setFrom(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">到</label>
          <select value={to} onChange={e => setTo(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-5 text-center">
        <p className="text-sm text-slate-500 mb-1">{formatCurrency(amount, from)} =</p>
        <p className="text-3xl font-bold text-blue-600">{formatCurrency(result, to)}</p>
        <p className="text-xs text-slate-400 mt-2">汇率仅供参考，请以实际银行汇率为准</p>
      </div>
    </div>
  );
}

function ContainerTool() {
  const [boxL, setBoxL] = useState(40);
  const [boxW, setBoxW] = useState(30);
  const [boxH, setBoxH] = useState(20);
  const [containerType, setContainerType] = useState<'20gp' | '40gp' | '40hq'>('40hq');

  const containers = {
    '20gp': { name: '20GP', l: 589, w: 235, h: 239 },
    '40gp': { name: '40GP', l: 1203, w: 235, h: 239 },
    '40hq': { name: '40HQ', l: 1203, w: 235, h: 269 },
  };

  const c = containers[containerType];

  const fitL = Math.floor(c.l / boxL);
  const fitW = Math.floor(c.w / boxW);
  const fitH = Math.floor(c.h / boxH);
  const totalBoxes = fitL * fitW * fitH;
  const boxVolume = (boxL * boxW * boxH) / 1000000;
  const containerVolume = (c.l * c.w * c.h) / 1000000;
  const utilization = containerVolume > 0 ? ((totalBoxes * boxVolume) / containerVolume) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">集装箱装柜计算</h3>

      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">集装箱类型</label>
        <div className="flex gap-2">
          {(Object.keys(containers) as (keyof typeof containers)[]).map(k => (
            <button key={k} onClick={() => setContainerType(k)}
              className={classNames('px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                containerType === k ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {containers[k].name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">内部尺寸 (cm): {c.l} × {c.w} × {c.h}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">箱长 (cm)</label>
          <input type="number" value={boxL} onChange={e => setBoxL(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">箱宽 (cm)</label>
          <input type="number" value={boxW} onChange={e => setBoxW(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">箱高 (cm)</label>
          <input type="number" value={boxH} onChange={e => setBoxH(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-5 space-y-3">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-blue-600">{fitL}</p><p className="text-xs text-slate-500">长方向</p></div>
          <div><p className="text-2xl font-bold text-blue-600">{fitW}</p><p className="text-xs text-slate-500">宽方向</p></div>
          <div><p className="text-2xl font-bold text-blue-600">{fitH}</p><p className="text-xs text-slate-500">高方向</p></div>
        </div>
        <div className="border-t border-blue-200 pt-3 text-center">
          <p className="text-sm text-slate-600">可装箱数</p>
          <p className="text-3xl font-bold text-slate-900">{totalBoxes} 箱</p>
          <p className="text-xs text-slate-500 mt-1">空间利用率: {utilization.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

function HsLookupTool() {
  const [search, setSearch] = useState('');

  const commonHsCodes = [
    { code: '8517.62.00', desc: '蓝牙耳机/无线通信设备', category: '电子产品' },
    { code: '9403.60.00', desc: '木制家具', category: '家具' },
    { code: '6109.10.00', desc: '棉制T恤', category: '纺织品' },
    { code: '8543.70.00', desc: 'LED灯/照明设备', category: '照明' },
    { code: '3926.90.00', desc: '塑料制品', category: '塑料' },
    { code: '7326.90.00', desc: '钢铁制品', category: '金属制品' },
    { code: '8471.30.00', desc: '笔记本电脑/计算机', category: '电子产品' },
    { code: '4202.92.00', desc: '箱包/背包', category: '箱包' },
    { code: '9504.50.00', desc: '游戏机/娱乐设备', category: '玩具' },
    { code: '4011.10.00', desc: '轮胎', category: '橡胶' },
    { code: '8504.40.00', desc: '电源适配器/充电器', category: '电子产品' },
    { code: '9018.90.00', desc: '医疗器械', category: '医疗' },
  ];

  const filtered = commonHsCodes.filter(h =>
    !search || h.code.includes(search) || h.desc.includes(search) || h.category.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 font-medium">HS编码 (海关编码) 查询</p>
          <p className="text-xs text-blue-700 mt-1">以下为常见产品的HS编码参考。实际出口请以海关确认的编码为准，可通过中国海关总署官网或第三方平台查询完整编码。</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索产品名称或编码..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-slate-600">
              <th className="px-4 py-3 font-medium">HS编码</th>
              <th className="px-4 py-3 font-medium">产品描述</th>
              <th className="px-4 py-3 font-medium">分类</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(h => (
              <tr key={h.code} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3"><span className="font-mono font-medium text-blue-600">{h.code}</span></td>
                <td className="px-4 py-3 text-slate-700">{h.desc}</td>
                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{h.category}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
