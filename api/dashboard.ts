import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } }
  );

  const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const AI_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  // 解析action
  let action = 'greeting';
  if (req.query?.action) action = req.query.action;
  if (req.query && typeof req.query.get === 'function') {
    const qAction = req.query.get('action');
    if (qAction) action = qAction;
  }
  if (req.url) {
    try {
      const qIdx = req.url.indexOf('?');
      if (qIdx > -1) {
        const qs = req.url.substring(qIdx + 1);
        const params = new URLSearchParams(qs);
        const urlAction = params.get('action');
        if (urlAction) action = urlAction;
      }
    } catch {}
  }

  // ============ AI 调用辅助函数 ============
  async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 2000): Promise<any> {
    if (!AI_API_KEY) {
      return { error: 'AI API key not configured' };
    }
    try {
      const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      });
      if (!response.ok) {
        const errText = await response.text();
        return { error: `AI API error: ${response.status}`, detail: errText };
      }
      const data = await response.json();
      return { content: data.choices[0]?.message?.content || '' };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  // ============ 1. AI 励志词条（每日不同）============
  if (action === 'greeting') {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const weekdayCN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][today.getDay()];

    const systemPrompt = `你是一位深邃的人生哲学家，擅长用简洁有力的语言写出励志格言。
规则：
1. 只输出一句话，15-30字
2. 必须有深度、有哲理、能触动人心
3. 不要使用emoji
4. 不要加引号、括号等标点
5. 不要重复常见网络鸡汤
6. 用中文输出`;

    const userPrompt = `请为 ${dateStr} ${weekdayCN} 写一句独一无二的励志格言。
主题围绕：成长、认知、自律、坚持、自我突破、时间价值、思维方式。
要求：深刻、耐人寻味、能引发思考，不要空洞口号。`;

    const aiResult = await callAI(systemPrompt, userPrompt, 200);

    if (aiResult.content) {
      // 清理AI输出，去掉可能的引号
      let greeting = aiResult.content.trim().replace(/^[""']|[""']$/g, '').replace(/\n/g, ' ').trim();
      // 确保不是太长
      if (greeting.length > 80) greeting = greeting.slice(0, 77) + '...';
      return res.status(200).json({ greeting, ai: true });
    }

    // 降级：本地随机
    const fallbackGreetings = [
      '只有个人进步，才是解决所有问题的最优解。',
      '真正的成长，始于对自己的不满足。',
      '认知的边界，就是人生的天花板。',
      '向内求，向外修。',
      '你的时间有限，不要为别人而活。',
      '种一棵树最好的时间是十年前，其次是现在。',
      '不要等风来，要做自己的风。',
      '人生没有白走的路，每一步都算数。',
      '格局决定结局，态度决定高度。',
      '自律即自由。',
      '所有的优秀，都源于不将就。',
      '真正的高手，都是长期主义者。',
      '慢慢来，比较快。',
      '日拱一卒，功不唐捐。',
      '与其焦虑未来，不如做好当下。',
      '改变是痛苦的，但不改变会更痛苦。',
      '允许一切发生，是一种大智慧。',
      '你的注意力在哪里，你的人生就在哪里。',
      '把时间花在能让你增值的事情上。',
      '人生最大的敌人，从来都是自己。',
      '持续学习，是对抗焦虑最好的武器。',
      '当你真正想做一件事时，整个世界都会为你让路。',
      '最好的投资，是投资自己。',
      '平庸是一种选择，卓越也是一种选择。',
      '不要把希望寄托在别人身上。',
    ];
    const randomGreeting = fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)];
    return res.status(200).json({ greeting: randomGreeting, ai: false });
  }

  // ============ 2. AI 写信 ============
  if (action === 'ai-letter' || action === 'letter') {
    let news: any = null;
    if (req.query?.news) {
      try {
        const decoded = Buffer.from(String(req.query.news), 'base64').toString('utf-8');
        news = JSON.parse(decoded);
      } catch {
        news = null;
      }
    }
    let body = '';
    try {
      if (req.body && typeof req.body === 'string') {
        body = req.body;
      } else if (req.body && typeof req.body === 'object') {
        body = JSON.stringify(req.body);
      }
    } catch {}

    const letterData = body ? JSON.parse(body) : (news || {});
    const { title = '', summary = '', source = '', category = '', industry = '' } = letterData;

    // 先尝试AI生成
    const systemPrompt = `你是KIKI TECH的外贸销售专家，擅长根据行业新闻和市场动态撰写开发信。

要求：
1. 以Runcy的身份撰写，语气亲切专业
2. 根据新闻内容提炼商机切入点
3. 结合KIKI TECH的产品优势（风电/光伏/储能等工业设备）
4. 邮件结构：Subject + 问候 + 新闻关联 + 产品介绍 + 合作提议 + 落款
5. 控制在200字以内，简洁有力
6. 语言使用英文（因为是外贸场景）`;

    const userPrompt = `请根据以下新闻撰写一封外贸开发信：

新闻标题：${title}
新闻摘要：${summary}
新闻来源：${source}
新闻类别：${category}
主营行业：${industry || '风电设备'}

KIKI TECH公司背景：
- 专业工业设备制造商
- 主要产品：风力发电机组(4.5MW-16MW)、光伏储能系统
- 质保期：交付后12个月
- 认证：DNV, IEC, CE等

请直接输出邮件正文内容，包括Subject。`;

    const result = await callAI(systemPrompt, userPrompt, 1500);

    if (result.error) {
      // 降级方案：本地模板
      const fallback = `Subject: Opportunity for Cooperation — ${title}

Dear Valued Partner,

I hope this message finds you well.

I'm Runcy from KIKI TECH, a leading manufacturer of industrial equipment including wind turbines and energy storage systems. We noticed the recent development regarding "${title}" (reported by ${source}), and we believe this may create interesting opportunities for collaboration.

At KIKI TECH, we specialize in:
• High-efficiency wind turbines (4.5MW–16MW) with DNV/IEC certifications
• Complete supply chain support from manufacturing to after-sales
• Competitive pricing with flexible payment terms

Would you be open to discussing how KIKI TECH can support your projects?

Looking forward to your reply.

Best regards,
Runcy
KIKI TECH
Email: sales@kiki-tech.com
www.kiki-tech.com`;

      return res.status(200).json({
        letter: fallback,
        ai: false,
        reason: 'Using fallback template',
      });
    }

    return res.status(200).json({
      letter: result.content,
      ai: true,
    });
  }

  // ============ 3. 行业快讯（AI生成） ============
  if (action === 'industry-news') {
    const industry = req.query?.industry || '风电设备';

    // 先尝试AI生成行业动态
    const systemPrompt = `你是一位外贸行业分析师，擅长追踪工业设备行业的全球动态。请生成真实、专业的行业新闻动态。

要求：
1. 生成5条行业新闻
2. 每条新闻包含：标题、摘要、来源、类别（政策/市场/技术/项目）
3. 内容要真实可信，符合${industry}行业特点
4. 每条新闻20-50字
5. 来源用真实的行业媒体名称
6. 以JSON格式输出`;

    const userPrompt = `请生成${industry}行业最近的5条重要新闻动态，包括：
- 最新政策动向
- 市场趋势变化
- 技术突破进展
- 重大项目动态

输出格式为JSON数组，每条包含：id, title, summary, source, category, date, hotLevel`;

    const result = await callAI(systemPrompt, userPrompt, 2000);

    if (result.error) {
      // 降级方案：返回通用数据
      const fallbackNews = [
        { id: 'n1', title: `${industry}全球市场需求持续增长`, summary: '受新兴市场基建推动，全球'+industry+'需求预计年增长8-12%', source: 'Global Energy Monitor', category: '市场', date: new Date().toISOString().split('T')[0], hotLevel: 'hot' },
        { id: 'n2', title: '欧盟出台新的清洁能源政策', summary: '欧盟宣布2030年清洁能源占比目标，推动行业发展', source: 'Reuters', category: '政策', date: new Date().toISOString().split('T')[0], hotLevel: 'hot' },
        { id: 'n3', title: '大型项目招标在即', summary: '中东、东南亚多个大型'+industry+'项目进入招标阶段', source: 'Project Finance', category: '项目', date: new Date().toISOString().split('T')[0], hotLevel: 'warm' },
        { id: 'n4', title: '技术创新提升设备效率', summary: '新一代技术方案将设备效率提升5-10%', source: 'Tech Review', category: '技术', date: new Date().toISOString().split('T')[0], hotLevel: 'warm' },
        { id: 'n5', title: '供应链优化降低成本', summary: '全球供应链调整，'+industry+'设备成本预计下降3-5%', source: 'Supply Chain Today', category: '市场', date: new Date().toISOString().split('T')[0], hotLevel: 'normal' },
      ];
      return res.status(200).json({
        data: {
          news: fallbackNews,
          hot_products: generateHotProducts(industry),
          hot_markets: generateHotMarkets(),
        },
        ai: false,
      });
    }

    // 解析AI返回的JSON
    let newsData;
    try {
      const content = result.content.replace(/```json|```/g, '').trim();
      newsData = JSON.parse(content);
    } catch {
      // 如果解析失败，尝试用正则提取
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          newsData = JSON.parse(jsonMatch[0]);
        } catch {
          newsData = [];
        }
      } else {
        newsData = [];
      }
    }

    // 确保数据格式正确
    if (!Array.isArray(newsData)) {
      newsData = [];
    }

    const formattedNews = newsData.map((n: any, i: number) => ({
      id: n.id || `n${i}`,
      title: n.title || '行业动态',
      summary: n.summary || '',
      source: n.source || 'Industry Report',
      category: (['政策', '市场', '技术', '项目'] as const).includes(n.category) ? n.category : '市场',
      date: n.date || new Date().toISOString().split('T')[0],
      hotLevel: (['hot', 'warm', 'normal'] as const).includes(n.hotLevel) ? n.hotLevel : 'normal',
    }));

    return res.status(200).json({
      data: {
        news: formattedNews,
        hot_products: generateHotProducts(industry),
        hot_markets: generateHotMarkets(),
      },
      ai: true,
    });
  }

  // ============ 4. AI 风控分析 ============
  if (action === 'risk-analysis') {
    let body = '';
    try {
      if (req.body && typeof req.body === 'string') {
        body = req.body;
      } else if (req.body) {
        body = JSON.stringify(req.body);
      }
    } catch {}

    const data = body ? JSON.parse(body) : {};
    const { invoices = [], shipments = [], customers = [] } = data;

    // AI分析
    const systemPrompt = `你是一位外贸风控专家，擅长分析国际贸易中的收汇和物流风险。

请分析以下数据中的潜在风险，并生成风控预警。
每个预警包含：单号、客户名、金额、状态、建议操作、风险等级(critical/warning/info)、原因分析。

风险判断标准：
- critical: 超过交货期30天未收到尾款、物流状态异常
- warning: 尾款即将到期需要跟进、物流进度滞后
- info: 正常流程中的提醒`;

    const userPrompt = `请分析以下数据生成风控预警：

发票数据：${JSON.stringify(invoices.slice(0, 10))}
物流数据：${JSON.stringify(shipments.slice(0, 10))}
客户数据：${JSON.stringify(customers.slice(0, 10))}

请以JSON数组格式输出风控预警列表。`;

    const result = await callAI(systemPrompt, userPrompt, 2000);

    if (result.error) {
      // 降级方案：使用本地规则
      const alerts = generateLocalRiskAlerts(invoices, shipments, customers);
      return res.status(200).json({ alerts, ai: false });
    }

    // 解析AI返回
    let alerts;
    try {
      const content = result.content.replace(/```json|```/g, '').trim();
      alerts = JSON.parse(content);
    } catch {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          alerts = JSON.parse(jsonMatch[0]);
        } catch {
          alerts = generateLocalRiskAlerts(invoices, shipments, customers);
        }
      } else {
        alerts = generateLocalRiskAlerts(invoices, shipments, customers);
      }
    }

    if (!Array.isArray(alerts)) {
      alerts = generateLocalRiskAlerts(invoices, shipments, customers);
    }

    // 格式化预警数据
    const formattedAlerts = alerts.map((a: any) => ({
      id: a.id || `alert-${Date.now()}-${Math.random()}`,
      docNumber: a.docNumber || a.invoice_no || '未知单号',
      customer: a.customer || a.company || '未知客户',
      amount: a.amount || '—',
      status: a.status || '待跟进',
      action: a.action || '需关注',
      level: (['critical', 'warning', 'info'] as const).includes(a.level) ? a.level : 'info',
      reason: a.reason || a.analysis || '需要进一步分析',
    }));

    return res.status(200).json({ alerts: formattedAlerts, ai: true });
  }

  // ============ 5. AI 快捷操作（写信/背调/物流查询）============
  if (action === 'ai-quick') {
    const type = req.query?.type || '';

    if (type === 'write') {
      // AI写信辅助
      const systemPrompt = `你是外贸销售助手，帮助用户撰写专业的外贸开发信。
请生成一封简洁有力的开发信，包括Subject、问候、产品介绍、合作提议。
使用英文撰写，语气专业亲切。`;
      const userPrompt = `为${req.query?.industry || '风电设备'}行业撰写一封外贸开发信，突出KIKI TECH的工业设备优势。`;

      const result = await callAI(systemPrompt, userPrompt, 1000);
      return res.status(200).json({ result: result.content || '无法生成', ai: !result.error });
    }

    if (type === 'research') {
      // AI客户背调
      const company = req.query?.company || '目标客户';
      const systemPrompt = `你是外贸客户调研专家，帮助分析海外客户的背景和潜力。
请提供：公司类型、规模估计、主要业务、可能的采购产品、风险评估。`;
      const userPrompt = `请分析这家公司：${company}
如果无法获取真实信息，请基于行业通用情况给出合理估计。`;

      const result = await callAI(systemPrompt, userPrompt, 1000);
      return res.status(200).json({ result: result.content || '无法生成', ai: !result.error });
    }

    return res.status(200).json({ result: 'Invalid type' });
  }

  // ============ AI 分析客户官网 ============
  if (action === 'analyze-customer') {
    const { website, company_name_en, country } = req.body || {};

    if (!website) {
      return res.status(200).json({ error: '请填写客户官网' });
    }

    // 先尝试抓取官网内容
    let websiteContent = '';
    try {
      const fetchUrl = website.startsWith('http') ? website : `https://${website}`;
      const fetchRes = await fetch(fetchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
      });
      if (fetchRes.ok) {
        const html = await fetchRes.text();
        // 提取文本内容（简单去标签）
        websiteContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 3000); // 限制长度
      }
    } catch (e) {
      console.log('抓取官网失败，仅使用URL分析');
    }

    const systemPrompt = `你是一位资深的外贸客户背调分析师，擅长通过客户官网信息分析客户背景。
请根据提供的客户官网URL和抓取到的网页内容，输出一份结构化的客户分析报告。
要求输出JSON格式，包含以下字段（如果信息不足，填null）：

{
  "company_name": "公司中文名（如能推断）",
  "customer_type": "客户类型（trader/wholesaler/retailer/factory/brand）",
  "main_products": "主营产品（中文描述）",
  "main_market": "主营销售区域",
  "company_size": "公司规模估算",
  "main_sales_region": "主营销售区域",
  "has_brand": true/false,
  "has_distribution": true/false,
  "pain_points": "客户可能的痛点（价格敏感/交期敏感/品质敏感等）",
  "cooperation_grade": "合作概率评级（A/B/C/D）",
  "inquiry_products": "可能咨询的产品方向",
  "certification_needs": "可能需要的认证（CE/FCC/ROHS等）",
  "backgound_notes": "背调总结备注（50-100字）",
  "suggested_next_followup": "建议下次跟进日期（YYYY-MM-DD格式，根据客户类型和时区建议3-7天后）",
  "suggested_followup_strategy": "跟进策略建议（50字内）"
}

注意：
1. 只输出JSON，不要加markdown标记或其他文字
2. 如果网页内容为空，仅根据域名和公司名推理
3. 日期格式必须是 YYYY-MM-DD`;

    const userPrompt = `请分析以下客户信息：
官网URL: ${website}
公司英文名: ${company_name_en || '未知'}
国家: ${country || '未知'}
抓取到的网页内容: ${websiteContent || '（无法抓取，请仅根据域名推理）'}

请输出结构化的JSON分析报告。`;

    const result = await callAI(systemPrompt, userPrompt, 1500);

    if (result.error) {
      return res.status(200).json({ error: result.error, ai: false });
    }

    // 解析AI返回的JSON
    try {
      let content = result.content.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(content);
      return res.status(200).json({ analysis, ai: true, websiteContent: websiteContent.slice(0, 200) });
    } catch {
      // 尝试提取JSON
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          return res.status(200).json({ analysis, ai: true });
        } catch {}
      }
      return res.status(200).json({ error: 'AI返回格式异常', raw: result.content, ai: false });
    }
  }

  // ============ AI 分析跟进记录 ============
  if (action === 'analyze-followups') {
    const { customer_name, followups } = req.body || {};

    if (!followups || !Array.isArray(followups) || followups.length === 0) {
      return res.status(200).json({ error: '暂无跟进记录可分析' });
    }

    // 将跟进记录整理成文本
    const followupText = followups.map((f: any, i: number) =>
      `${i + 1}. ${f.followup_date} [${f.type || '未分类'}]: ${f.content || ''}`
    ).join('\n');

    const systemPrompt = `你是一位资深的外贸销售跟进分析专家，擅长分析业务员的跟进记录，发现问题和机会。
请根据客户的跟进记录，输出一份JSON格式的分析报告：

{
  "summary": "跟进情况总结（50-100字，概括客户当前状态和进展）",
  "issues": ["发现的问题1", "发现的问题2"],
  "progress_assessment": "进展评估（良好/一般/停滞，并说明原因）",
  "suggested_actions": ["建议的下一步行动1", "建议的下一步行动2"],
  "suggested_next_followup_date": "建议下次跟进日期（YYYY-MM-DD格式）",
  "suggested_followup_strategy": "跟进策略建议（50字内，针对当前情况）",
  "risk_level": "风险等级（低/中/高，客户流失风险评估）",
  "key_insights": "关键洞察（50字内，如客户真实需求、隐藏顾虑等）"
}

注意：
1. 只输出JSON，不要加markdown标记或其他文字
2. 日期格式必须是 YYYY-MM-DD
3. 根据跟进频率、客户回复情况、阶段停滞时间等综合判断风险等级`;

    const userPrompt = `客户名称: ${customer_name || '未知'}
跟进记录:
${followupText}

今天是 ${new Date().toISOString().slice(0, 10)}，请分析以上跟进记录。`;

    const result = await callAI(systemPrompt, userPrompt, 1200);

    if (result.error) {
      return res.status(200).json({ error: result.error, ai: false });
    }

    // 解析AI返回的JSON
    try {
      let content = result.content.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(content);
      return res.status(200).json({ analysis, ai: true });
    } catch {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          return res.status(200).json({ analysis, ai: true });
        } catch {}
      }
      return res.status(200).json({ error: 'AI返回格式异常', raw: result.content, ai: false });
    }
  }

  // 默认返回
  return res.status(200).json({ action, status: 'ok' });
}

// ============ 辅助函数 ============

function generateHotProducts(industry: string): any[] {
  const products: Record<string, any[]> = {
    '风电设备': [
      { id: 'p1', name: '16MW海上风机', model: 'KT-16H', category: '整机', revenue: '$2.8亿+', growth: '+25%', trend: 'up' },
      { id: 'p2', name: '12MW陆上风机', model: 'KT-12L', category: '整机', revenue: '$1.5亿+', growth: '+18%', trend: 'up' },
      { id: 'p3', name: '风机塔筒', model: 'TWR-120', category: '塔筒', revenue: '$8000万+', growth: '+15%', trend: 'up' },
      { id: 'p4', name: '叶片组件', model: 'BLD-85', category: '叶片', revenue: '$6000万+', growth: '+12%', trend: 'up' },
      { id: 'p5', name: '电控系统', model: 'CTR-Pro', category: '电控', revenue: '$3500万+', growth: '+20%', trend: 'up' },
    ],
    '光伏储能': [
      { id: 'p1', name: '400W高效组件', model: 'PV-400M', category: '组件', revenue: '$3.2亿+', growth: '+30%', trend: 'up' },
      { id: 'p2', name: '100kWh储能系统', model: 'ES-100', category: '储能', revenue: '$1.2亿+', growth: '+45%', trend: 'up' },
      { id: 'p3', name: '250kW逆变器', model: 'INV-250', category: '逆变器', revenue: '$7500万+', growth: '+22%', trend: 'up' },
      { id: 'p4', name: '固定支架系统', model: 'MNT-Fix', category: '支架', revenue: '$4500万+', growth: '+18%', trend: 'up' },
      { id: 'p5', name: '工商业储能一体机', model: 'ES-500', category: '储能', revenue: '$3000万+', growth: '+40%', trend: 'up' },
    ],
  };
  return products[industry] || [
    { id: 'p1', name: `${industry}旗舰产品A`, model: 'Model-A', category: '高端系列', revenue: '$1.5亿+', growth: '+20%', trend: 'up' },
    { id: 'p2', name: `${industry}标准产品B`, model: 'Model-B', category: '标准系列', revenue: '$8000万+', growth: '+15%', trend: 'up' },
    { id: 'p3', name: `${industry}入门产品C`, model: 'Model-C', category: '入门系列', revenue: '$5000万+', growth: '+10%', trend: 'up' },
    { id: 'p4', name: `${industry}定制产品D`, model: 'Model-D', category: '定制系列', revenue: '$3000万+', growth: '+18%', trend: 'up' },
    { id: 'p5', name: `${industry}配件套装`, model: 'Kit-01', category: '配件', revenue: '$1500万+', growth: '+12%', trend: 'up' },
  ];
}

function generateHotMarkets(): any[] {
  return [
    { id: 'm1', country: '美国', flag: '🇺🇸', continent: '北美', demand: '清洁能源基建需求旺盛', inquiries30d: 28, avgMargin: '25-30%', risk: 'low' },
    { id: 'm2', country: '德国', flag: '🇩🇪', continent: '欧洲', demand: '能源转型加速推进', inquiries30d: 22, avgMargin: '22-28%', risk: 'low' },
    { id: 'm3', country: '沙特阿拉伯', flag: '🇸🇦', continent: '中东', demand: '大型能源项目密集', inquiries30d: 35, avgMargin: '28-35%', risk: 'medium' },
    { id: 'm4', country: '巴西', flag: '🇧🇷', continent: '南美', demand: '可再生能源快速发展', inquiries30d: 18, avgMargin: '20-25%', risk: 'medium' },
    { id: 'm5', country: '澳大利亚', flag: '🇦🇺', continent: '大洋洲', demand: '储能市场爆发增长', inquiries30d: 15, avgMargin: '24-30%', risk: 'low' },
  ];
}

function generateLocalRiskAlerts(invoices: any[], shipments: any[], customers: any[]): any[] {
  const alerts: any[] = [];
  const now = new Date();

  function daysBetween(a: string, b: Date): number {
    const dA = new Date(a);
    return Math.floor((b.getTime() - dA.getTime()) / (1000 * 60 * 60 * 24));
  }

  for (const pi of invoices) {
    const days = pi.created_at ? daysBetween(pi.created_at, now) : 0;
    const customer = customers.find((c: any) => c.id === pi.customer_id);
    const customerName = customer?.company_name || '未知客户';
    const amount = pi.total_amount ? `$${(Number(pi.total_amount) / 10000).toFixed(1)}万` : '—';

    if (pi.status === 'sent' && days > 14) {
      alerts.push({
        id: `alert-${pi.id}`,
        docNumber: pi.pi_number,
        customer: customerName,
        amount,
        status: '已发送待确认',
        action: '跟进确认',
        level: days > 30 ? 'critical' : 'warning',
        reason: `PI已发送${days}天，尚未收到客户确认，建议立即跟进。`,
      });
    }

    if (pi.status === 'confirmed' && days > 45) {
      alerts.push({
        id: `alert-${pi.id}`,
        docNumber: pi.pi_number,
        customer: customerName,
        amount,
        status: '已确认待收款',
        action: '催收尾款',
        level: days > 60 ? 'critical' : 'warning',
        reason: `PI已确认${days}天，需关注尾款到账情况，避免逾期风险。`,
      });
    }
  }

  for (const ship of shipments) {
    const customer = customers.find((c: any) => c.id === ship.customer_id);
    const customerName = customer?.company_name || '未知客户';
    const eta = ship.eta ? daysBetween(ship.eta, now) : 0;

    if (ship.status === 'in_transit' && eta < 0) {
      alerts.push({
        id: `alert-${ship.id}`,
        docNumber: ship.shipment_number,
        customer: customerName,
        amount: '运输中',
        status: '货物已延迟',
        action: '查询物流',
        level: eta < -7 ? 'critical' : 'warning',
        reason: `货物运输已超过预计到达时间${Math.abs(eta)}天，建议查询物流状态。`,
      });
    }

    if (ship.status === 'in_transit' && eta >= 0 && eta <= 3) {
      alerts.push({
        id: `alert-${ship.id}`,
        docNumber: ship.shipment_number,
        customer: customerName,
        amount: '运输中',
        status: `即将到达（${eta}天）`,
        action: '准备清关',
        level: 'info',
        reason: `货物预计${eta}天内到达目的港，请提前准备清关文件。`,
      });
    }
  }

  return alerts;
}
