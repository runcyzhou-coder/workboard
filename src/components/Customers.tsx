import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Search, Mail, Phone, Globe, MapPin, Edit2, Trash2, X, Tag,
  Users as UsersIcon, Building2, Sparkles, Target, Clock, MessageSquare,
  TrendingUp, Calendar, CheckCircle, AlertCircle, Zap,
  BarChart3, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classNames, formatDate } from '@/lib/utils';
import type { Customer } from '@/lib/supabase';
import { CustomerCharts } from '@/components/CustomerCharts';

const statusOptions: { value: Customer['status']; label: string; color: string }[] = [
  { value: 'prospect', label: '潜在', color: 'bg-slate-100 text-slate-600' },
  { value: 'negotiating', label: '谈判中', color: 'bg-amber-100 text-amber-700' },
  { value: 'active', label: '活跃', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'inactive', label: '不活跃', color: 'bg-slate-100 text-slate-400' },
];

// AI Analysis Types
interface AIAnalysis {
  conversionRate: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  nextFollowUpDays: number;
  recommendedActions: { icon: string; title: string; detail: string; priority: 'high' | 'medium' | 'low' }[];
  riskFactors: string[];
  strengths: string[];
  customerTier: 'A' | 'B' | 'C' | 'D';
}

// Simulated AI analysis engine (in production, replace with real API call)
function analyzeCustomer(customer: Customer): AIAnalysis {
  let score = 50;
  const riskFactors: string[] = [];
  const strengths: string[] = [];

  // Status scoring
  switch (customer.status) {
    case 'active':
      score += 30;
      strengths.push('已建立合作关系，客户信任度高');
      break;
    case 'negotiating':
      score += 15;
      strengths.push('正在积极谈判中，客户有明确采购意向');
      break;
    case 'prospect':
      score += 0;
      if (!customer.notes || customer.notes.length < 10) {
        riskFactors.push('潜在客户资料不完整，缺乏跟进记录');
      }
      break;
    case 'inactive':
      score -= 20;
      riskFactors.push('客户处于不活跃状态，需要重新激活');
      break;
  }

  // Data completeness scoring
  const completeness = [
    customer.contact_name, customer.email, customer.phone,
    customer.country, customer.address, customer.website,
  ].filter(Boolean).length;
  score += completeness * 3;
  if (completeness >= 5) strengths.push('客户信息完整，便于多渠道联系');
  if (completeness <= 2) riskFactors.push('联系方式不足，沟通渠道受限');

  // Country/market scoring
  const highValueMarkets = ['USA', 'United States', '美国', 'Germany', '德国', 'UK', 'United Kingdom', '英国', 'Japan', '日本', 'Australia', '澳大利亚', 'Canada', '加拿大'];
  const emergingMarkets = ['Brazil', '巴西', 'India', '印度', 'Mexico', '墨西哥', 'Vietnam', '越南', 'Indonesia', '印尼'];
  if (customer.country) {
    if (highValueMarkets.some(m => customer.country!.toLowerCase().includes(m.toLowerCase()))) {
      score += 10;
      strengths.push(`${customer.country}属于高价值成熟市场，购买力强`);
    } else if (emergingMarkets.some(m => customer.country!.toLowerCase().includes(m.toLowerCase()))) {
      score += 5;
      strengths.push(`${customer.country}属于新兴市场，增长潜力大`);
    }
  } else {
    riskFactors.push('未填写客户所在国家/地区，难以评估市场风险');
  }

  // Notes scoring
  if (customer.notes && customer.notes.length > 50) {
    score += 5;
    strengths.push('有详细的客户备注信息，便于个性化跟进');
  }

  // Tags scoring
  if (customer.tags && customer.tags.length > 0) {
    const highValueTags = ['VIP', 'vip', '重点', '大客户', '回头客', '高意向'];
    const hasHv = customer.tags.some(t => highValueTags.some(h => t.toLowerCase().includes(h.toLowerCase())));
    if (hasHv) {
      score += 15;
      strengths.push('被标记为重点/VIP客户');
    }
    const riskTags = ['风险', '难搞', '拖延', '欠款', '投诉'];
    const hasRisk = customer.tags.some(t => riskTags.some(r => t.toLowerCase().includes(r.toLowerCase())));
    if (hasRisk) {
      score -= 15;
      riskFactors.push('客户标签中存在风险提示词');
    }
    score += Math.min(customer.tags.length * 2, 6);
  }

  // Recency scoring (based on created_at)
  const createdDays = Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24));
  if (createdDays < 7) {
    score += 8;
    strengths.push('新近添加的客户，时机最佳');
  } else if (createdDays > 180 && customer.status !== 'active') {
    score -= 10;
    riskFactors.push('客户创建超过6个月仍未转化，需加强跟进');
  }

  // Clamp score
  const conversionRate = Math.max(5, Math.min(95, score));

  // Confidence
  const confidence: AIAnalysis['confidence'] = completeness >= 4 ? 'high' : completeness >= 2 ? 'medium' : 'low';

  // Customer Tier
  let customerTier: AIAnalysis['customerTier'];
  if (conversionRate >= 75) customerTier = 'A';
  else if (conversionRate >= 55) customerTier = 'B';
  else if (conversionRate >= 35) customerTier = 'C';
  else customerTier = 'D';

  // Next follow-up recommendation
  let nextFollowUpDays = 7;
  if (customer.status === 'negotiating') nextFollowUpDays = 2;
  else if (customer.status === 'active') nextFollowUpDays = 14;
  else if (customer.status === 'prospect') nextFollowUpDays = 5;
  else if (customer.status === 'inactive') nextFollowUpDays = 21;
  if (conversionRate >= 70) nextFollowUpDays = Math.max(1, nextFollowUpDays - 2);
  if (conversionRate <= 30) nextFollowUpDays += 3;

  // Recommended actions
  const recommendedActions: AIAnalysis['recommendedActions'] = [];
  if (!customer.email) {
    recommendedActions.push({ icon: 'Mail', title: '补充邮箱地址', detail: '邮箱是外贸沟通的核心渠道，建议尽快获取客户邮箱并发送正式问候邮件', priority: 'high' });
  }
  if (!customer.country) {
    recommendedActions.push({ icon: 'MapPin', title: '确认客户所在国家', detail: '了解客户所在国家有助于评估市场容量、关税政策和物流成本', priority: 'high' });
  }
  if (customer.status === 'prospect') {
    recommendedActions.push({ icon: 'MessageSquare', title: '发送初次开发信', detail: '个性化推荐：附上公司介绍、产品目录和同类客户案例，突出差异化优势', priority: 'high' });
  }
  if (customer.status === 'negotiating') {
    recommendedActions.push({ icon: 'Zap', title: '主动提供报价方案', detail: '当前处于谈判关键期，建议制作正式报价单(Quotation)并附MOQ和交期信息', priority: 'high' });
    if (conversionRate >= 60) {
      recommendedActions.push({ icon: 'Target', title: '推进形式发票PI', detail: '成交率较高，可主动推送形式发票(PI)并说明付款方式和贸易条款', priority: 'medium' });
    }
  }
  if (customer.status === 'active') {
    recommendedActions.push({ icon: 'CheckCircle', title: '客户维护与复购跟进', detail: '定期发送新品推荐和节日问候，询问下一季度采购计划，提升客户粘性', priority: 'medium' });
  }
  if (customer.status === 'inactive') {
    recommendedActions.push({ icon: 'TrendingUp', title: '客户唤醒计划', detail: '发送唤醒邮件：告知最新促销活动、新品上架或市场趋势，附专属优惠码', priority: 'medium' });
  }
  if (customer.tags?.length === 0) {
    recommendedActions.push({ icon: 'Tag', title: '完善客户标签', detail: '为客户打上行业、来源、采购品类等标签，便于后续精准营销和分组管理', priority: 'low' });
  }
  if (!customer.notes || customer.notes.length < 20) {
    recommendedActions.push({ icon: 'Edit2', title: '记录客户沟通细节', detail: '每次沟通后记录要点（需求、预算、决策人、顾虑点），避免信息断层', priority: 'medium' });
  }
  if (!customer.phone) {
    recommendedActions.push({ icon: 'Phone', title: '获取电话/WhatsApp', detail: '电话和即时通讯工具能大幅提升沟通效率，尤其是在谈判和确认阶段', priority: 'medium' });
  }

  // Ensure at least some actions
  if (recommendedActions.length < 2) {
    recommendedActions.push({ icon: 'Calendar', title: '安排定期回访', detail: '按照推荐的跟进节奏设置提醒，保持客户热度，定期更新跟进记录', priority: 'medium' });
  }

  // Add a personalized action
  if (conversionRate >= 70) {
    recommendedActions.unshift({ icon: 'Target', title: '优先跟进，加速成单', detail: `此客户评级为${customerTier}级，成交概率高，建议本周内重点跟进，推动签约或付款`, priority: 'high' });
  }

  return {
    conversionRate,
    confidence,
    nextFollowUpDays,
    recommendedActions: recommendedActions.slice(0, 6),
    riskFactors: riskFactors.slice(0, 4),
    strengths: strengths.slice(0, 4),
    customerTier,
  };
}

// ============== 智能识别引擎 ==============
// 从一段非结构化文本（邮件签名、名片 OCR、聊天记录、网页复制内容）中提取客户字段
// 启发式规则 + 正则匹配，支持中英文，离线运行无依赖
const COUNTRY_KEYWORDS: { keys: string[]; name: string }[] = [
  { keys: ['USA', 'United States', 'America', '美国'], name: 'United States' },
  { keys: ['UK', 'United Kingdom', 'England', '英国'], name: 'United Kingdom' },
  { keys: ['Germany', '德国'], name: 'Germany' },
  { keys: ['France', '法国'], name: 'France' },
  { keys: ['Italy', '意大利'], name: 'Italy' },
  { keys: ['Spain', '西班牙'], name: 'Spain' },
  { keys: ['Netherlands', 'Holland', '荷兰'], name: 'Netherlands' },
  { keys: ['Russia', '俄罗斯'], name: 'Russia' },
  { keys: ['Japan', '日本'], name: 'Japan' },
  { keys: ['South Korea', 'Korea', '韩国'], name: 'South Korea' },
  { keys: ['Australia', '澳洲', '澳大利亚'], name: 'Australia' },
  { keys: ['New Zealand', '新西兰'], name: 'New Zealand' },
  { keys: ['Canada', '加拿大'], name: 'Canada' },
  { keys: ['Brazil', '巴西'], name: 'Brazil' },
  { keys: ['Mexico', '墨西哥'], name: 'Mexico' },
  { keys: ['India', '印度'], name: 'India' },
  { keys: ['Vietnam', '越南'], name: 'Vietnam' },
  { keys: ['Thailand', '泰国'], name: 'Thailand' },
  { keys: ['Indonesia', '印尼'], name: 'Indonesia' },
  { keys: ['Malaysia', '马来西亚'], name: 'Malaysia' },
  { keys: ['Singapore', '新加坡'], name: 'Singapore' },
  { keys: ['Philippines', '菲律宾'], name: 'Philippines' },
  { keys: ['Saudi Arabia', '沙特'], name: 'Saudi Arabia' },
  { keys: ['UAE', 'United Arab Emirates', '阿联酋', 'Dubai', '迪拜'], name: 'United Arab Emirates' },
  { keys: ['Turkey', '土耳其'], name: 'Turkey' },
  { keys: ['Egypt', '埃及'], name: 'Egypt' },
  { keys: ['South Africa', '南非'], name: 'South Africa' },
  { keys: ['Nigeria', '尼日利亚'], name: 'Nigeria' },
  { keys: ['Poland', '波兰'], name: 'Poland' },
  { keys: ['Sweden', '瑞典'], name: 'Sweden' },
  { keys: ['Norway', '挪威'], name: 'Norway' },
  { keys: ['Finland', '芬兰'], name: 'Finland' },
  { keys: ['Denmark', '丹麦'], name: 'Denmark' },
  { keys: ['Belgium', '比利时'], name: 'Belgium' },
  { keys: ['Switzerland', '瑞士'], name: 'Switzerland' },
  { keys: ['Austria', '奥地利'], name: 'Austria' },
  { keys: ['Portugal', '葡萄牙'], name: 'Portugal' },
  { keys: ['Greece', '希腊'], name: 'Greece' },
  { keys: ['Czech', '捷克'], name: 'Czech Republic' },
  { keys: ['Argentina', '阿根廷'], name: 'Argentina' },
  { keys: ['Chile', '智利'], name: 'Chile' },
  { keys: ['Colombia', '哥伦比亚'], name: 'Colombia' },
  { keys: ['Peru', '秘鲁'], name: 'Peru' },
  { keys: ['Pakistan', '巴基斯坦'], name: 'Pakistan' },
  { keys: ['Bangladesh', '孟加拉'], name: 'Bangladesh' },
  { keys: ['Iran', '伊朗'], name: 'Iran' },
  { keys: ['Israel', '以色列'], name: 'Israel' },
  { keys: ['Kenya', '肯尼亚'], name: 'Kenya' },
  { keys: ['Morocco', '摩洛哥'], name: 'Morocco' },
  { keys: ['Kazakhstan', '哈萨克斯坦'], name: 'Kazakhstan' },
  { keys: ['Ukraine', '乌克兰'], name: 'Ukraine' },
  { keys: ['中国', 'China', 'PRC'], name: 'China' },
];

function parseCustomerText(text: string): Partial<Customer> {
  const result: Partial<Customer> = {};
  if (!text || !text.trim()) return result;

  const original = text;
  const lines = original.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // 1. 邮箱（用负向前瞻避免吃进 TLD 后紧跟的字母，如 "comTel"）
  const emailMatch = original.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z0-9])/);
  if (emailMatch) result.email = emailMatch[0];

  // 2. 网站（用常见 TLD 白名单，避免 "fans.Best" 误匹配）
  const COMMON_TLDS = 'com|net|org|io|co|edu|gov|info|biz|cn|de|fr|it|es|nl|ru|jp|kr|au|nz|ca|br|mx|in|vn|th|id|my|sg|ph|sa|ae|tr|eg|za|ng|pl|se|no|fi|dk|be|ch|at|pt|gr|cz|ar|cl|pe|pk|bd|ir|il|ke|ma|kz|ua|uk|me|tv|cc|xyz|tech|store|shop|online|site|cloud|dev|app|com\\.cn|com\\.au|co\\.uk|co\\.jp';
  const urlRegex = new RegExp('\\b(?:https?://)?(?:www\\.)?([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:' + COMMON_TLDS + ')(?:/[^\\s]*)?\\b', 'gi');
  const urls = original.match(urlRegex) || [];
  // 排除邮箱中的域名部分
  const urlWithoutEmail = urls.find(u => !u.includes('@') && !/@/.test(u));
  if (urlWithoutEmail) {
    let url = urlWithoutEmail;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^www\./i, '');
    result.website = url;
  }

  // 3. 电话/手机/WhatsApp/微信（优先匹配带标签的）
  const labelPhoneMatch = original.match(/(?:Tel|Phone|Mobile|Telephone|Cell|WhatsApp|WeChat|Skype|电话|手机|微信)\s*[:：]?\s*([+0-9][0-9\s\-()]{6,20})/i);
  if (labelPhoneMatch) {
    result.phone = labelPhoneMatch[1].trim();
  } else {
    const intlMatch = original.match(/\+\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{6,12}/);
    if (intlMatch) {
      result.phone = intlMatch[0].trim();
    } else {
      const phoneMatch = original.match(/\b\d{3,4}[\s-]?\d{7,8}\b/);
      if (phoneMatch) result.phone = phoneMatch[0];
    }
  }

  // 4. 联系人（优先带标签的，不跨行避免越界）
  const labelContactMatch = original.match(/(?:Contact|Attn|Attention|联系人|姓名|Name)\s*[:：]\s*([A-Za-z\u4e00-\u9fa5][A-Za-z\u4e00-\u9fa5 \t.\-]{1,30})/i);
  if (labelContactMatch) {
    result.contact_name = labelContactMatch[1].trim();
  } else {
    // Mr./Ms./Mrs./Dr. + 1~4 个首字母大写的词（仅用连字符或空格/制表符分隔，不跨行，避免越界到职位词）
    const titleMatch = original.match(/\b(?:Mr|Mrs|Ms|Miss|Dr|Sir)\.?[ \t]+([A-Z][a-z]+(?:[- \t][A-Z][a-z]+){0,3})/);
    if (titleMatch) {
      result.contact_name = titleMatch[0].replace(/[ \t]+/g, ' ').trim();
    }
  }

  // 5. 公司名（优先带标签的；其次按职位词切分文本，在切出的块里找公司后缀，避免越界）
  const labelCompanyMatch = original.match(/(?:Company\s*Name|Company|公司名称|公司|客户名称)\s*[:：]\s*([^\n\r,;|]{2,60})/i);
  if (labelCompanyMatch) {
    result.company_name = labelCompanyMatch[1].trim();
  } else {
    const JOB_TITLES = 'Manager|Director|Officer|Executive|President|CEO|CTO|CFO|COO|Procurement|Sales|Marketing|Engineer|Consultant|Specialist|Representative|Head|Chief|Supervisor|Coordinator|Assistant|先生|女士|经理|主管|总监|主任|负责人|采购|销售';
    const segments = original.split(new RegExp('(?:' + JOB_TITLES + ')', 'i'));
    let found = false;
    for (const seg of segments) {
      const m = seg.match(/([A-Za-z\u4e00-\u9fa5][A-Za-z0-9\u4e00-\u9fa5\s,&.'\-]{2,40}?(?:Co\.,?\s*Ltd\.?|Inc\.?|Corp(?:oration)?|GmbH|LLC|Limited|S\.A\.|S\.p\.A\.|B\.V\.|Pte\.?\s*Ltd|有限公司|股份有限公司|集团有限公司|公司))/i);
      if (m) {
        result.company_name = m[0].replace(/\s+/g, ' ').trim();
        found = true;
        break;
      }
    }
    if (!found && lines.length > 0 && lines[0].length >= 2 && lines[0].length <= 60 && !/^[\d\s\-()+]+$/.test(lines[0])) {
      result.company_name = lines[0];
    }
  }

  // 6. 地址（优先带标签的；遇到下一个字段标签时截断，避免越界）
  const labelAddressMatch = original.match(/(?:Address|Addr|地址|Add)\s*[:：]\s*([^\n\r]{5,150})/i);
  if (labelAddressMatch) {
    let addr = labelAddressMatch[1].trim();
    // 截断遇到的下一个字段标签
    addr = addr.split(/(?:Website|Email|Tel|Phone|Mobile|Fax|Skype|WhatsApp|WeChat|Contact|Mr\.|Mrs\.|Ms\.|网址|邮箱|电话|手机|传真|联系人)\s*[:：]/i)[0].trim();
    result.address = addr;
  } else {
    const addrLine = lines.find(l =>
      /(?:street|st\.?|road|rd\.?|avenue|ave\.?|blvd|drive|dr\.?|lane|ln\.?|suite|号|路|街|道|大厦|工业|building|floor|no\.\s?\d)/i.test(l) && l.length >= 8
    );
    if (addrLine) result.address = addrLine;
  }

  // 7. 国家（关键词匹配）
  const lowerText = original.toLowerCase();
  for (const c of COUNTRY_KEYWORDS) {
    if (c.keys.some(k => lowerText.includes(k.toLowerCase()))) {
      result.country = c.name;
      break;
    }
  }

  return result;
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [tagInput, setTagInput] = useState('');
  // AI analysis state
  const [analyzingCustomer, setAnalyzingCustomer] = useState<Customer | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // Pre-compute analysis at top level (hooks rule compliance)
  const currentAnalysis = useMemo(() => analyzingCustomer ? analyzeCustomer(analyzingCustomer) : null, [analyzingCustomer]);
  // 图表面板展开/收起
  const [showCharts, setShowCharts] = useState(false);
  // 智能识别 state
  const [rawText, setRawText] = useState('');
  const [recognizing, setRecognizing] = useState(false);
  const [recognizedFields, setRecognizedFields] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    setCustomers((data as Customer[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter(c => {
    const matchSearch = !search ||
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.country || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  async function save() {
    if (!form.company_name?.trim()) return;
    const payload = { ...form };
    if (editing) {
      await supabase.from('customers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      await supabase.from('customers').insert(payload);
    }
    setShowForm(false);
    setEditing(null);
    setForm({});
    setTagInput('');
    setRawText('');
    setRecognizedFields([]);
    load();
  }

  async function remove(id: string) {
    if (!confirm('确定删除此客户？')) return;
    await supabase.from('customers').delete().eq('id', id);
    load();
  }

  function startEdit(c: Customer) {
    setEditing(c);
    setForm(c);
    setRawText('');
    setRecognizedFields([]);
    setShowForm(true);
  }

  function startAdd() {
    setEditing(null);
    setForm({ status: 'prospect' });
    setRawText('');
    setRecognizedFields([]);
    setShowForm(true);
  }

  // 智能识别：把 rawText 解析后填入表单空字段
  function recognizeText() {
    if (!rawText.trim()) return;
    setRecognizing(true);
    setRecognizedFields([]);
    // 用 setTimeout 让 UI 显示"识别中"状态
    setTimeout(() => {
      const parsed = parseCustomerText(rawText);
      const fieldLabels: { key: keyof Customer; label: string }[] = [
        { key: 'company_name', label: '公司名' },
        { key: 'contact_name', label: '联系人' },
        { key: 'email', label: '邮箱' },
        { key: 'phone', label: '电话' },
        { key: 'country', label: '国家' },
        { key: 'address', label: '地址' },
        { key: 'website', label: '网站' },
      ];
      const newForm = { ...form };
      const filled: string[] = [];
      fieldLabels.forEach(({ key, label }) => {
        const value = parsed[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          // 只填充空字段，不覆盖用户已填的
          const existing = newForm[key];
          if (existing === undefined || existing === null || String(existing).trim() === '') {
            (newForm as any)[key] = value;
            filled.push(label);
          }
        }
      });
      setForm(newForm);
      setRecognizedFields(filled);
      setRecognizing(false);
    }, 450);
  }

  function clearRecognized() {
    setRecognizedFields([]);
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    const tags = [...(form.tags || []), tag];
    setForm({ ...form, tags });
    setTagInput('');
  }

  function removeTag(tag: string) {
    setForm({ ...form, tags: (form.tags || []).filter(t => t !== tag) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">客户管理</h1>
          <p className="text-slate-500 mt-1">管理外贸客户信息与跟进状态</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          新建客户
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索公司名、联系人、邮箱、国家..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">全部状态</option>
          {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* 客户可视化图表 */}
      {!loading && customers.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-900">客户数据可视化</span>
              <span className="text-xs text-slate-400">国家分布 · 状态分布 · 行业分布 · 标签分布</span>
            </div>
            {showCharts ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {showCharts && (
            <div className="px-5 pb-5">
              <CustomerCharts customers={customers} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>加载中...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>{search || filterStatus !== 'all' ? '没有匹配的客户' : '还没有客户，点击"新建客户"开始'}</p>
          </div>
        ) : (
          filtered.map(c => {
            const statusInfo = statusOptions.find(s => s.value === c.status);
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 truncate">{c.company_name}</h3>
                    {c.contact_name && <p className="text-sm text-slate-500 mt-0.5">{c.contact_name}</p>}
                  </div>
                  <span className={classNames('px-2 py-0.5 rounded text-xs font-medium shrink-0', statusInfo?.color)}>
                    {statusInfo?.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-slate-600">
                  {c.email && <div className="flex items-center gap-2 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{c.email}</span></div>}
                  {c.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />{c.phone}</div>}
                  {c.country && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{c.country}</div>}
                  {c.website && <div className="flex items-center gap-2 truncate"><Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" /><span className="truncate">{c.website}</span></div>}
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                )}

                {c.notes && <p className="text-xs text-slate-500 mt-3 line-clamp-2">{c.notes}</p>}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => { setAnalyzingCustomer(c); setAnalyzing(true); setTimeout(() => setAnalyzing(false), 600); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />AI分析
                  </button>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(c)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? '编辑客户' : '新建客户'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* 智能识别区域（仅新建时显示） */}
              {!editing && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-900">智能识别</span>
                    <span className="text-xs text-indigo-500">粘贴邮件签名 / 名片 / 聊天记录，自动填表</span>
                  </div>
                  <textarea
                    value={rawText}
                    onChange={e => { setRawText(e.target.value); if (recognizedFields.length) clearRecognized(); }}
                    placeholder={`示例：\nJohn Smith\nACME Trading Co., Ltd\nEmail: john@acme.com\nTel: +1 234 567 8900\nAddress: 123 Main Street, New York, USA\nwww.acme.com`}
                    rows={5}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-indigo-300/70 resize-y font-mono"
                  />
                  <div className="flex items-center justify-between mt-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      {recognizedFields.length > 0 ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs text-emerald-700 font-medium">已填入:</span>
                          {recognizedFields.map(f => (
                            <span key={f} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[11px] font-medium">{f}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-indigo-500/80">支持识别：公司名 · 联系人 · 邮箱 · 电话 · 国家 · 地址 · 网站</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={recognizeText}
                      disabled={!rawText.trim() || recognizing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition-colors shrink-0"
                    >
                      {recognizing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          识别中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          自动识别并填入
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              <Field label="公司名称 *">
                <input value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="联系人">
                  <input value={form.contact_name || ''} onChange={e => setForm({ ...form, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="状态">
                  <select value={form.status || 'prospect'} onChange={e => setForm({ ...form, status: e.target.value as Customer['status'] })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="邮箱">
                  <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="电话">
                  <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="国家">
                  <input value={form.country || ''} onChange={e => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="网站">
                  <input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
              </div>
              <Field label="地址">
                <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="标签">
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="输入标签后回车"
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={addTag} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-sm">
                    <Tag className="w-4 h-4" />
                  </button>
                </div>
                {form.tags && form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
              <Field label="备注">
                <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">取消</button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
                {editing ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {analyzingCustomer && currentAnalysis && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAnalyzingCustomer(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {(() => {
              const analysis = currentAnalysis;
              const tierColors: Record<string, string> = {
                A: 'from-emerald-500 to-teal-600',
                B: 'from-blue-500 to-indigo-600',
                C: 'from-amber-500 to-orange-600',
                D: 'from-slate-500 to-slate-600',
              };
              const tierTextColors: Record<string, string> = {
                A: 'text-emerald-600 bg-emerald-50 border-emerald-200',
                B: 'text-blue-600 bg-blue-50 border-blue-200',
                C: 'text-amber-600 bg-amber-50 border-amber-200',
                D: 'text-slate-600 bg-slate-50 border-slate-200',
              };
              const rateColor = analysis.conversionRate >= 70 ? 'text-emerald-600' : analysis.conversionRate >= 40 ? 'text-amber-600' : 'text-red-600';
              const rateBg = analysis.conversionRate >= 70 ? 'bg-emerald-500' : analysis.conversionRate >= 40 ? 'bg-amber-500' : 'bg-red-500';
              const priorityColor: Record<string, string> = {
                high: 'bg-red-50 text-red-700 border-red-200',
                medium: 'bg-amber-50 text-amber-700 border-amber-200',
                low: 'bg-slate-50 text-slate-600 border-slate-200',
              };
              const priorityLabel: Record<string, string> = { high: '高优先', medium: '中优先', low: '低优先' };
              const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                Mail, Phone, MapPin, MessageSquare, Zap, Target, CheckCircle, TrendingUp, Tag, Edit2, Calendar, Globe, Building2, UsersIcon, Sparkles, Clock,
              };
              const nextDate = new Date();
              nextDate.setDate(nextDate.getDate() + analysis.nextFollowUpDays);

              return (
                <>
                  {/* Header */}
                  <div className={classNames('rounded-t-2xl px-6 py-5 text-white bg-gradient-to-r', tierColors[analysis.customerTier])}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                          {analyzing ? (
                            <Sparkles className="w-6 h-6 animate-pulse" />
                          ) : (
                            <Sparkles className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold">AI 客户智能分析</h2>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-white/25 backdrop-blur">
                              {analyzingCustomer.company_name}
                            </span>
                          </div>
                          <p className="text-sm text-white/80 mt-1">成交预测 · 跟进建议 · 风险评估</p>
                        </div>
                      </div>
                      <button onClick={() => setAnalyzingCustomer(null)} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6">
                    {analyzing ? (
                      <div className="flex flex-col items-center justify-center py-16 space-y-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-indigo-100" />
                          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
                          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-600 animate-pulse" />
                        </div>
                        <p className="text-slate-600 font-medium">AI 正在分析客户数据...</p>
                        <p className="text-xs text-slate-400">评估成交概率、识别风险因素、生成个性化跟进方案</p>
                      </div>
                    ) : (
                      <>
                        {/* KPI Row */}
                        <div className="grid grid-cols-3 gap-4">
                          {/* Conversion Rate */}
                          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                              <Target className="w-4 h-4 text-slate-500" />
                              <span className="text-xs font-medium text-slate-500">成交率预测</span>
                            </div>
                            <p className={classNames('text-3xl font-bold', rateColor)}>{analysis.conversionRate}%</p>
                            <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div className={classNames('h-full rounded-full transition-all duration-1000', rateBg)} style={{ width: `${analysis.conversionRate}%` }} />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                              置信度: <span className="font-medium text-slate-600">{analysis.confidence === 'high' ? '高' : analysis.confidence === 'medium' ? '中' : '低'}</span>
                            </p>
                          </div>

                          {/* Customer Tier */}
                          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                              <TrendingUp className="w-4 h-4 text-slate-500" />
                              <span className="text-xs font-medium text-slate-500">客户分级</span>
                            </div>
                            <div className="flex items-end gap-2">
                              <span className={classNames('text-5xl font-black', tierTextColors[analysis.customerTier].split(' ')[0])}>
                                {analysis.customerTier}
                              </span>
                              <span className="text-xs text-slate-500 pb-2 mb-0.5">级客户</span>
                            </div>
                            <span className={classNames('inline-block mt-3 px-2 py-1 rounded-md text-xs font-medium border', tierTextColors[analysis.customerTier])}>
                              {analysis.customerTier === 'A' ? '战略级，优先资源投入' :
                               analysis.customerTier === 'B' ? '高价值，重点跟进培养' :
                               analysis.customerTier === 'C' ? '普通级，常规跟进' :
                               '待激活，谨慎投入资源'}
                            </span>
                          </div>

                          {/* Next Follow-up */}
                          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            <div className="flex items-center gap-2 mb-3">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span className="text-xs font-medium text-slate-500">建议下次跟进</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{analysis.nextFollowUpDays} 天内</p>
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{nextDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                            </div>
                            <span className="inline-block mt-3 px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {analysis.nextFollowUpDays <= 3 ? '紧急跟进' : analysis.nextFollowUpDays <= 7 ? '近期安排' : '计划提醒'}
                            </span>
                          </div>
                        </div>

                        {/* Strengths & Risks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 mb-3">
                              <CheckCircle className="w-4 h-4" />机会与优势
                            </h3>
                            {analysis.strengths.length === 0 ? (
                              <p className="text-xs text-emerald-700/60">暂无显著优势，建议完善客户信息</p>
                            ) : (
                              <ul className="space-y-2">
                                {analysis.strengths.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="bg-red-50/50 rounded-xl p-5 border border-red-100">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-3">
                              <AlertCircle className="w-4 h-4" />风险因素
                            </h3>
                            {analysis.riskFactors.length === 0 ? (
                              <p className="text-xs text-red-700/60">未发现明显风险，继续保持</p>
                            ) : (
                              <ul className="space-y-2">
                                {analysis.riskFactors.map((r, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Recommended Actions */}
                        <div>
                          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-4">
                            <Zap className="w-5 h-5 text-amber-500" />
                            AI 推荐跟进动作
                            <span className="text-xs text-slate-400 font-normal">（按优先级排序）</span>
                          </h3>
                          <div className="space-y-3">
                            {analysis.recommendedActions.map((action, i) => {
                              const Icon = iconMap[action.icon] || Target;
                              return (
                                <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all bg-white">
                                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                                    <Icon className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-semibold text-slate-900">{action.title}</h4>
                                      <span className={classNames('px-2 py-0.5 rounded text-[10px] font-semibold border', priorityColor[action.priority])}>
                                        {priorityLabel[action.priority]}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{action.detail}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Footer Tips */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white">
                          <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-bold mb-1">外贸跟进心法</h4>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                "80% 的成交来自第 4-11 次跟进。大多数外贸人在第 2 次被拒绝后就放弃了，而客户需要时间建立信任。
                                坚持用不同角度（案例、价格、交期、售后）与客户沟通，让他记住你，等到采购时机自然想到你。"
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  {!analyzing && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                      <p className="text-xs text-slate-500">
                        客户录入时间: {formatDate(analyzingCustomer.created_at)} · AI 分析结果仅供参考
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setAnalyzingCustomer(null)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">关闭</button>
                        <button onClick={() => { startEdit(analyzingCustomer); setAnalyzingCustomer(null); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
                          编辑客户资料
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
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
