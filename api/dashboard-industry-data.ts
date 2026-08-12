// 首页行业动态数据 API
// 部署在 Vercel Serverless Functions (/api/dashboard-industry-data)
// 根据用户选择的行业返回：行业快讯、热销市场、热销产品
// 支持 DeepSeek/OpenAI API + 24h 内存缓存 + 本地映射表回退

// ===== 内存缓存（Vercel 实例级别，24h TTL）=====
interface CacheEntry {
  data: any;
  timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时

interface IndustryData {
  news: {
    id: string;
    title: string;
    summary: string;
    source: string;
    category: string;
    date: string;
    hotLevel: string;
  }[];
  hot_markets: {
    id: string;
    country: string;
    flag: string;
    continent: string;
    demand: string;
    inquiries30d: number;
    avgMargin: string;
    risk: string;
  }[];
  hot_products: {
    id: string;
    name: string;
    model: string;
    category: string;
    revenue: string;
    growth: string;
    trend: string;
  }[];
  generated_at: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const industry = req.method === 'GET' ? req.query.industry : req.body.industry;
  if (!industry) {
    return res.status(400).json({ error: 'industry is required' });
  }

  // 1. 检查缓存
  const cacheKey = industry.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return res.status(200).json({ data: cached.data, cached: true });
  }

  const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  // 2. 如果配置了 AI API，尝试调用
  if (AI_API_KEY) {
    try {
      const data = await fetchFromAI(industry, AI_API_KEY, AI_BASE_URL, MODEL);
      cache.set(cacheKey, { data, timestamp: Date.now() });
      return res.status(200).json({ data, cached: false });
    } catch (error) {
      console.error('AI API error, falling back to local:', error);
    }
  }

  // 3. 本地映射表回退
  const data = getLocalIndustryData(industry);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return res.status(200).json({ data, cached: false, fallback: true });
}

async function fetchFromAI(industry: string, apiKey: string, baseUrl: string, model: string): Promise<IndustryData> {
  const systemPrompt = `You are a B2B export trade analyst. Generate realistic industry data for a Chinese export company's dashboard. Return ONLY valid JSON.`;

  const userPrompt = `Generate dashboard data for the industry: "${industry}".

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "news": [
    {"id": "n1", "title": "...", "summary": "...", "source": "...", "category": "政策|市场|技术|项目", "date": "2026-08-XX", "hotLevel": "hot|warm|normal"}
  ],
  "hot_markets": [
    {"id": "m1", "country": "...", "flag": "emoji", "continent": "...", "demand": "...", "inquiries30d": 15, "avgMargin": "25%", "risk": "low|medium|high"}
  ],
  "hot_products": [
    {"id": "p1", "name": "...", "model": "...", "category": "...", "revenue": "$XX.XM", "growth": "+XX%", "trend": "up|down"}
  ]
}

Requirements:
- 6 news articles about export trends, overseas policies, trade shows for "${industry}"
- 5-6 hot export markets with realistic demand and inquiry numbers
- 5-6 hot products with realistic revenue and growth rates
- All content should be specific to the "${industry}" industry
- Use Chinese for country names and category labels, English for product names`;

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) throw new Error(`AI API ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty AI response');

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    else throw new Error('Failed to parse AI response');
  }

  return {
    news: Array.isArray(parsed.news) ? parsed.news : [],
    hot_markets: Array.isArray(parsed.hot_markets) ? parsed.hot_markets : [],
    hot_products: Array.isArray(parsed.hot_products) ? parsed.hot_products : [],
    generated_at: new Date().toISOString(),
  };
}

// ===== 本地行业映射表 =====
const industryMap: Record<string, IndustryData> = {
  '风电设备': {
    news: [
      { id: 'n1', title: '2026年全球海上风电装机量预计突破50GW', summary: '全球风能理事会(GWEC)最新报告显示，海上风电进入加速期，中国制造商出口订单同比增长67%。', source: 'GWEC', category: '市场', date: '2026-08-09', hotLevel: 'hot' },
      { id: 'n2', title: '16MW超大容量海上风机通过DLC认证', summary: '多家中国整机商获DNV荷兰认证，为进入欧洲北海市场扫清技术壁垒。', source: 'DNV Energy', category: '技术', date: '2026-08-07', hotLevel: 'hot' },
      { id: 'n3', title: '巴西发布2026-2030国家能源规划', summary: '巴西计划新增18GW陆上风电装机，对中国设备进口需求强劲。', source: 'MME Brazil', category: '政策', date: '2026-08-05', hotLevel: 'warm' },
      { id: 'n4', title: '沙特NEOM新城绿氢配套5GW风电项目启动EPC招标', summary: 'NEOM项目采购窗口开放，预计风机设备采购额超$30亿。', source: 'NEOM Official', category: '项目', date: '2026-08-03', hotLevel: 'hot' },
      { id: 'n5', title: '风机塔筒出口欧盟反倾销税率调整公告', summary: '欧盟委员会对部分中国塔筒厂商税率从48%下调至34.5%，利好出口。', source: 'EU Commission', category: '政策', date: '2026-08-01', hotLevel: 'warm' },
      { id: 'n6', title: '澳大利亚昆士兰州450MW风电项目正式签约', summary: '中企联合体获得EPC+设备供应合同，预计2027年并网。', source: 'Queensland Gov', category: '项目', date: '2026-07-28', hotLevel: 'normal' },
    ],
    hot_markets: [
      { id: 'm1', country: '沙特阿拉伯', flag: '🇸🇦', continent: '中东', demand: '5GW 海上+陆上', inquiries30d: 18, avgMargin: '28%', risk: 'low' },
      { id: 'm2', country: '巴西', flag: '🇧🇷', continent: '拉美', demand: '18GW 陆上拍卖', inquiries30d: 12, avgMargin: '22%', risk: 'medium' },
      { id: 'm3', country: '澳大利亚', flag: '🇦🇺', continent: '大洋洲', demand: '4.5GW 新项目', inquiries30d: 9, avgMargin: '31%', risk: 'low' },
      { id: 'm4', country: '越南', flag: '🇻🇳', continent: '东南亚', demand: '3.2GW 海上一期', inquiries30d: 21, avgMargin: '19%', risk: 'medium' },
      { id: 'm5', country: '德国', flag: '🇩🇪', continent: '欧洲', demand: '北海 2.8GW', inquiries30d: 7, avgMargin: '25%', risk: 'medium' },
      { id: 'm6', country: '哈萨克斯坦', flag: '🇰🇿', continent: '中亚', demand: '1.8GW 陆上', inquiries30d: 5, avgMargin: '34%', risk: 'low' },
    ],
    hot_products: [
      { id: 'p1', name: '陆上低风速风机', model: 'GW171-6.0MW', category: '整机', revenue: '$18.2M', growth: '+42%', trend: 'up' },
      { id: 'p2', name: '海上大容量风机', model: 'H260-16MW', category: '整机', revenue: '$12.8M', growth: '+156%', trend: 'up' },
      { id: 'p3', name: '钢制塔筒（含防腐）', model: '120m 三段式', category: '塔筒', revenue: '$8.6M', growth: '+28%', trend: 'up' },
      { id: 'p4', name: '碳纤维叶片', model: '92m B型', category: '叶片', revenue: '$6.1M', growth: '+35%', trend: 'up' },
      { id: 'p5', name: '变桨/偏航电控系统', model: 'PCS-5000', category: '电控', revenue: '$3.8M', growth: '+19%', trend: 'up' },
      { id: 'p6', name: '高原型风机（4500m+）', model: 'GW155-4.5MW', category: '整机', revenue: '$2.9M', growth: '+8%', trend: 'up' },
    ],
    generated_at: new Date().toISOString(),
  },
  '光伏储能': {
    news: [
      { id: 'n1', title: '2026全球光伏新增装机预计达450GW', summary: 'IEA报告显示全球光伏装机持续高增长，中国组件出口占全球75%份额。', source: 'IEA', category: '市场', date: '2026-08-09', hotLevel: 'hot' },
      { id: 'n2', title: 'TOPCon电池效率突破26.5%', summary: '多家中国厂商量产效率创纪录，N型技术替代PERC加速。', source: 'PV-Tech', category: '技术', date: '2026-08-07', hotLevel: 'hot' },
      { id: 'n3', title: '美国对东南亚光伏双反调查启动', summary: 'USTR对越南/泰国/马来西亚组件重启调查，影响转口贸易路径。', source: 'USTR', category: '政策', date: '2026-08-05', hotLevel: 'hot' },
      { id: 'n4', title: '德国K2026储能展：工商业储能需求爆发', summary: '欧洲工商业储能市场年增300%，中国PCS厂商订单激增。', source: 'SolarPower Europe', category: '市场', date: '2026-08-03', hotLevel: 'warm' },
      { id: 'n5', title: '印度PLI二期补贴落地：本土制造2.5GW', summary: '印度对进口光伏组件征收25%保障税，本土产能加速替代。', source: 'MNRE India', category: '政策', date: '2026-08-01', hotLevel: 'warm' },
      { id: 'n6', title: '沙特500MW光伏+200MWh储能项目招标', summary: 'ACWA Power启动EPC招标，中国逆变器厂商优势明显。', source: 'ACWA Power', category: '项目', date: '2026-07-28', hotLevel: 'normal' },
    ],
    hot_markets: [
      { id: 'm1', country: '德国', flag: '🇩🇪', continent: '欧洲', demand: '15GW 组件+储能', inquiries30d: 25, avgMargin: '22%', risk: 'low' },
      { id: 'm2', country: '巴西', flag: '🇧🇷', continent: '拉美', demand: '8GW 分布式光伏', inquiries30d: 18, avgMargin: '26%', risk: 'medium' },
      { id: 'm3', country: '澳大利亚', flag: '🇦🇺', continent: '大洋洲', demand: '6GW 户用+储能', inquiries30d: 14, avgMargin: '29%', risk: 'low' },
      { id: 'm4', country: '南非', flag: '🇿🇦', continent: '非洲', demand: '4GW 光伏+储能', inquiries30d: 16, avgMargin: '33%', risk: 'medium' },
      { id: 'm5', country: '菲律宾', flag: '🇵🇭', continent: '东南亚', demand: '3GW 工商业光伏', inquiries30d: 11, avgMargin: '27%', risk: 'medium' },
      { id: 'm6', country: '阿联酋', flag: '🇦🇪', continent: '中东', demand: '5GW 大型地面电站', inquiries30d: 8, avgMargin: '24%', risk: 'low' },
    ],
    hot_products: [
      { id: 'p1', name: 'N型TOPCon组件', model: '440W 双面', category: '组件', revenue: '$22.5M', growth: '+85%', trend: 'up' },
      { id: 'p2', name: '工商业储能一体机', model: '200kWh/100kW', category: '储能', revenue: '$15.8M', growth: '+210%', trend: 'up' },
      { id: 'p3', name: '组串式逆变器', model: '225kW 三相', category: '逆变器', revenue: '$11.2M', growth: '+38%', trend: 'up' },
      { id: 'p4', name: '柔性支架系统', model: '大跨度追踪', category: '支架', revenue: '$7.6M', growth: '+45%', trend: 'up' },
      { id: 'p5', name: '微型逆变器', model: '2000W 单相', category: '逆变器', revenue: '$5.3M', growth: '+62%', trend: 'up' },
      { id: 'p6', name: '户用储能电池', model: '10kWh 堆叠', category: '储能', revenue: '$4.1M', growth: '+28%', trend: 'up' },
    ],
    generated_at: new Date().toISOString(),
  },
};

// 通用行业数据生成器（未在映射表中的行业）
function getLocalIndustryData(industry: string): IndustryData {
  const mapped = industryMap[industry];
  if (mapped) return mapped;

  return {
    news: [
      { id: 'n1', title: `${industry}出口2026年上半年同比增长35%`, summary: `海关总署数据显示，${industry}出口总额持续增长，主要市场集中在东南亚和中东地区。`, source: '海关总署', category: '市场', date: '2026-08-09', hotLevel: 'hot' },
      { id: 'n2', title: `欧盟对华${industry}产品启动反补贴调查`, summary: `欧盟委员会宣布对部分${industry}产品征收临时反补贴税，建议企业提前布局转口贸易。`, source: 'EU Commission', category: '政策', date: '2026-08-07', hotLevel: 'hot' },
      { id: 'n3', title: `2026年${industry}国际展会日程公布`, summary: `下半年${industry}行业将举办12场国际展会，其中德国、迪拜、印度展会关注度最高。`, source: '展会网', category: '项目', date: '2026-08-05', hotLevel: 'warm' },
      { id: 'n4', title: `${industry}产业链数字化转型加速`, summary: `多家头部企业引入AI质检和智能仓储系统，生产效率提升30%以上。`, source: '行业观察', category: '技术', date: '2026-08-03', hotLevel: 'warm' },
      { id: 'n5', title: `RCEP框架下${industry}关税进一步降低`, summary: `区域全面经济伙伴关系协定生效后，${industry}产品在成员国间关税平均降低8.5%。`, source: '商务部', category: '政策', date: '2026-08-01', hotLevel: 'normal' },
      { id: 'n6', title: `中东买家${industry}采购需求激增`, summary: `沙特、阿联酋等海湾国家加大${industry}产品进口力度，询盘量同比增长55%。`, source: '贸促会', category: '市场', date: '2026-07-28', hotLevel: 'normal' },
    ],
    hot_markets: [
      { id: 'm1', country: '美国', flag: '🇺🇸', continent: '北美', demand: `${industry}年进口额$80亿+`, inquiries30d: 22, avgMargin: '26%', risk: 'medium' },
      { id: 'm2', country: '德国', flag: '🇩🇪', continent: '欧洲', demand: `${industry}高端需求旺盛`, inquiries30d: 16, avgMargin: '28%', risk: 'low' },
      { id: 'm3', country: '越南', flag: '🇻🇳', continent: '东南亚', demand: `${industry}供应链转移`, inquiries30d: 19, avgMargin: '21%', risk: 'medium' },
      { id: 'm4', country: '阿联酋', flag: '🇦🇪', continent: '中东', demand: `${industry}基建配套`, inquiries30d: 14, avgMargin: '32%', risk: 'low' },
      { id: 'm5', country: '巴西', flag: '🇧🇷', continent: '拉美', demand: `${industry}替代进口`, inquiries30d: 11, avgMargin: '25%', risk: 'medium' },
      { id: 'm6', country: '印度', flag: '🇮🇳', continent: '南亚', demand: `${industry}本土化需求`, inquiries30d: 17, avgMargin: '23%', risk: 'medium' },
    ],
    hot_products: [
      { id: 'p1', name: `${industry}高端型号`, model: `Pro-X200`, category: '高端系列', revenue: '$15.6M', growth: '+52%', trend: 'up' },
      { id: 'p2', name: `${industry}标准款`, model: `Std-S150`, category: '标准系列', revenue: '$12.3M', growth: '+28%', trend: 'up' },
      { id: 'p3', name: `${industry}定制款`, model: `Custom-C300`, category: '定制系列', revenue: '$8.9M', growth: '+41%', trend: 'up' },
      { id: 'p4', name: `${industry}配件包`, model: `Kit-K100`, category: '配件', revenue: '$5.2M', growth: '+18%', trend: 'up' },
      { id: 'p5', name: `${industry}入门款`, model: `Lite-L050`, category: '入门系列', revenue: '$3.7M', growth: '+15%', trend: 'up' },
      { id: 'p6', name: `${industry}耗材`, model: `Cons-C010`, category: '耗材', revenue: '$2.1M', growth: '+9%', trend: 'up' },
    ],
    generated_at: new Date().toISOString(),
  };
}
