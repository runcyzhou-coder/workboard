import { useMemo } from 'react';
import {
  MapPin, Building2, BarChart3, PieChart as PieIcon,
  TrendingUp, Users, Globe2, Layers,
} from 'lucide-react';
import { classNames } from '@/lib/utils';
import type { Customer } from '@/lib/supabase';

interface CustomerChartsProps {
  customers: Customer[];
}

// 颜色调色板
const PALETTE = [
  '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#3b82f6', '#84cc16', '#a855f7',
];

export function CustomerCharts({ customers }: CustomerChartsProps) {
  // 按国家分组
  const countryData = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      const country = c.country?.trim() || '未填写';
      map.set(country, (map.get(country) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10
  }, [customers]);

  // 按状态分组
  const statusData = useMemo(() => {
    const labels: Record<string, string> = {
      prospect: '潜在', negotiating: '谈判中', active: '活跃', inactive: '不活跃',
    };
    const map = new Map<string, number>();
    customers.forEach(c => {
      const key = labels[c.status] || c.status;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [customers]);

  // 按行业分组（从 tags 中提取行业信息，或从 notes 推断）
  const industryData = useMemo(() => {
    const industryKeywords: Record<string, string[]> = {
      '风电/能源': ['风电', '风机', 'wind', 'energy', '能源', '发电', 'turbine', 'renewable'],
      '建筑/建材': ['建筑', '建材', 'construction', 'building', '水泥', 'steel'],
      '机械/制造': ['机械', '制造', 'machinery', 'manufacturing', 'equipment', '设备'],
      '电子/电器': ['电子', '电器', 'electronic', 'electrical', ' appliance'],
      '汽车/交通': ['汽车', 'auto', 'vehicle', 'transport', '交通'],
      '医疗/健康': ['医疗', 'medical', 'health', '医院'],
      '农业/食品': ['农业', 'agriculture', 'food', '食品', 'farm'],
      '贸易/零售': ['贸易', 'trade', 'retail', '零售', '批发'],
    };
    const map = new Map<string, number>();
    customers.forEach(c => {
      const text = `${c.company_name} ${c.tags?.join(' ') || ''} ${c.notes || ''}`.toLowerCase();
      let matched = false;
      for (const [industry, keywords] of Object.entries(industryKeywords)) {
        if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
          map.set(industry, (map.get(industry) || 0) + 1);
          matched = true;
          break;
        }
      }
      if (!matched) {
        map.set('其他/未分类', (map.get('其他/未分类') || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [customers]);

  // 按标签分组
  const tagData = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach(c => {
      c.tags?.forEach(tag => {
        map.set(tag, (map.get(tag) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [customers]);

  const total = customers.length;
  const maxCountry = Math.max(...countryData.map(d => d[1]), 1);

  // 计算饼图角度
  function pieSegments(data: [string, number][]) {
    const total = data.reduce((s, d) => s + d[1], 0) || 1;
    let angle = 0;
    return data.map(([label, value], i) => {
      const pct = value / total;
      const startAngle = angle;
      const endAngle = angle + pct * 360;
      angle = endAngle;
      return { label, value, pct, startAngle, endAngle, color: PALETTE[i % PALETTE.length] };
    });
  }

  // SVG 饼图路径
  function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
  }

  function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const statusSegments = pieSegments(statusData);
  const industrySegments = pieSegments(industryData);

  if (total === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm">添加客户后即可查看可视化图表</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 概览统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="客户总数" value={total} color="from-indigo-500 to-blue-600" />
        <StatCard icon={Globe2} label="覆盖国家" value={countryData.filter(d => d[0] !== '未填写').length} color="from-cyan-500 to-teal-600" />
        <StatCard icon={TrendingUp} label="活跃客户" value={customers.filter(c => c.status === 'active').length} color="from-emerald-500 to-green-600" />
        <StatCard icon={Layers} label="行业数量" value={industryData.filter(d => d[0] !== '其他/未分类').length} color="from-amber-500 to-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 国家分布 - 横向条形图 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">客户国家分布</h3>
              <p className="text-xs text-slate-500">Top 10 国家/地区</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {countryData.map(([country, count], i) => (
              <div key={country} className="flex items-center gap-3">
                <div className="w-24 text-xs text-slate-600 font-medium truncate shrink-0">{country}</div>
                <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                  <div
                    className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                    style={{
                      width: `${(count / maxCountry) * 100}%`,
                      backgroundColor: PALETTE[i % PALETTE.length],
                    }}
                  >
                    <span className="text-[10px] text-white font-bold">{count}</span>
                  </div>
                </div>
                <div className="w-10 text-xs text-slate-400 text-right shrink-0">
                  {Math.round(count / total * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 客户状态分布 - 饼图 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <PieIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">客户状态分布</h3>
              <p className="text-xs text-slate-500">按跟进状态分类</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* SVG 饼图 */}
            <div className="relative shrink-0">
              <svg width="140" height="140" viewBox="0 0 140 140">
                {statusSegments.map((seg, i) => (
                  <path
                    key={i}
                    d={arcPath(70, 70, 60, seg.startAngle, seg.endAngle)}
                    fill={seg.color}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
                <circle cx="70" cy="70" r="28" fill="white" />
                <text x="70" y="68" textAnchor="middle" className="text-xl font-bold fill-slate-900">{total}</text>
                <text x="70" y="82" textAnchor="middle" className="text-[10px] fill-slate-400">总客户</text>
              </svg>
            </div>
            {/* 图例 */}
            <div className="flex-1 space-y-2">
              {statusSegments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs text-slate-600 flex-1">{seg.label}</span>
                  <span className="text-xs font-semibold text-slate-900">{seg.value}</span>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(seg.pct * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 行业分布 - 饼图 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">客户行业分布</h3>
              <p className="text-xs text-slate-500">按行业领域分类</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <svg width="140" height="140" viewBox="0 0 140 140">
                {industrySegments.map((seg, i) => (
                  <path
                    key={i}
                    d={arcPath(70, 70, 60, seg.startAngle, seg.endAngle)}
                    fill={seg.color}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
                <circle cx="70" cy="70" r="28" fill="white" />
                <text x="70" y="68" textAnchor="middle" className="text-xl font-bold fill-slate-900">
                  {industryData.length}
                </text>
                <text x="70" y="82" textAnchor="middle" className="text-[10px] fill-slate-400">行业</text>
              </svg>
            </div>
            <div className="flex-1 space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {industrySegments.map((seg, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs text-slate-600 flex-1 truncate">{seg.label}</span>
                  <span className="text-xs font-semibold text-slate-900">{seg.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 标签分布 - 横向条形图 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">客户标签分布</h3>
              <p className="text-xs text-slate-500">Top 8 高频标签</p>
            </div>
          </div>
          {tagData.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">暂无标签数据</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tagData.map(([tag, count], i) => {
                const maxTag = Math.max(...tagData.map(d => d[1]), 1);
                return (
                  <div key={tag} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-slate-600 font-medium truncate shrink-0">{tag}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
                        style={{
                          width: `${(count / maxTag) * 100}%`,
                          backgroundColor: PALETTE[(i + 4) % PALETTE.length],
                        }}
                      >
                        <span className="text-[10px] text-white font-bold">{count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Users;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={classNames('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center mb-2', color)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
