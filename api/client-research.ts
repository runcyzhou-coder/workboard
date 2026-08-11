// AI 客户一键背调 API
// 部署在 Vercel Serverless Functions (/api/client-research)
// 支持 DeepSeek / OpenAI API，未配置时使用本地规则引擎回退

interface ResearchRequest {
  company_name: string;
  website?: string;
  country?: string;
  contact_name?: string;
  notes?: string;
}

interface BackgroundReport {
  company_type: string;
  scale: string;
  main_business: string;
  key_match_products: string[];
  risk_assessment: string;
  ai_pitch_strategy: string;
  tags: string[];
  match_level: 'high' | 'medium' | 'low';
  risk_level: 'low' | 'medium' | 'high';
  decision_makers: { title: string; department: string }[];
  pitch_hook: string;
  matching_point: string;
  generated_at: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { company_name, website, country, contact_name, notes } = req.body as ResearchRequest;

  if (!company_name) {
    return res.status(400).json({ error: 'company_name is required' });
  }

  const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  // 如果没有配置 AI API Key，使用本地规则引擎生成报告
  if (!AI_API_KEY) {
    const report = generateLocalReport(company_name, website, country, contact_name, notes);
    return res.status(200).json({ report, fallback: true });
  }

  const systemPrompt = `You are a professional B2B trade research analyst specializing in wind turbine and industrial equipment export. Analyze the target company and return a structured JSON report in English.`;

  const userPrompt = `Analyze the following company and provide a background research report:

Company Name: ${company_name}
Website: ${website || 'N/A'}
Country: ${country || 'N/A'}
Contact Person: ${contact_name || 'N/A'}
Notes: ${notes || 'N/A'}

Based on your knowledge of this company and the industry, provide a comprehensive B2B background report. Return ONLY valid JSON with the following structure (no markdown, no explanation outside JSON):

{
  "company_type": "e.g., EPC Contractor / Distributor / Developer / Utility Company",
  "scale": "e.g., Large Enterprise (5000+ employees) / Medium (500-5000) / Small (<500)",
  "main_business": "Brief description of their main business activities and projects",
  "key_match_products": ["Wind Turbines", "Towers", "Blades", "Electrical Components"],
  "risk_assessment": "Assessment of commercial, financial, and geopolitical risks",
  "ai_pitch_strategy": "Detailed strategy on how to approach this client, what pain points to address, and key selling points to emphasize",
  "tags": ["e.g., Middle East Giant", "High Match", "Low Risk"],
  "match_level": "high | medium | low",
  "risk_level": "low | medium | high",
  "decision_makers": [
    {"title": "Procurement Director", "department": "Procurement"},
    {"title": "Supply Chain Manager", "department": "Supply Chain"},
    {"title": "CTO", "department": "Engineering"}
  ],
  "pitch_hook": "A concise one-sentence icebreaker for the first cold email, referencing a specific pain point or market opportunity",
  "matching_point": "Analysis of how the client's main products/needs match with our wind turbine products"
}`;

  try {
    const response = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      const report = generateLocalReport(company_name, website, country, contact_name, notes);
      return res.status(200).json({ report, fallback: true });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      const report = generateLocalReport(company_name, website, country, contact_name, notes);
      return res.status(200).json({ report, fallback: true });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // 尝试从 markdown code block 中提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    const report: BackgroundReport = {
      company_type: parsed.company_type || 'Unknown',
      scale: parsed.scale || 'Unknown',
      main_business: parsed.main_business || '',
      key_match_products: Array.isArray(parsed.key_match_products) ? parsed.key_match_products : [],
      risk_assessment: parsed.risk_assessment || '',
      ai_pitch_strategy: parsed.ai_pitch_strategy || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      match_level: parsed.match_level || 'medium',
      risk_level: parsed.risk_level || 'medium',
      decision_makers: Array.isArray(parsed.decision_makers) ? parsed.decision_makers : [],
      pitch_hook: parsed.pitch_hook || '',
      matching_point: parsed.matching_point || '',
      generated_at: new Date().toISOString(),
    };

    return res.status(200).json({ report });
  } catch (error) {
    console.error('Research API error:', error);
    const report = generateLocalReport(company_name, website, country, contact_name, notes);
    return res.status(200).json({ report, fallback: true });
  }
}

// 本地规则引擎（AI API 不可用时的回退方案）
function generateLocalReport(
  company_name: string,
  website?: string,
  country?: string,
  contact_name?: string,
  notes?: string,
): BackgroundReport {
  const name = company_name.toLowerCase();
  const ctry = (country || '').toLowerCase();

  // 公司类型判断
  let company_type = 'Distributor / Trader';
  if (/power|energy|electric|utilit/.test(name)) company_type = 'Utility / Power Developer';
  else if (/epc|contract|construct|engineer/.test(name)) company_type = 'EPC Contractor';
  else if (/wind|turbine|renew/.test(name)) company_type = 'Renewable Energy Company';
  else if (/trad|import|export|commerc/.test(name)) company_type = 'Trading Company';

  // 规模判断
  let scale = 'Medium Enterprise (500-5000 employees)';
  if (/group|holdings|international|global/.test(name)) scale = 'Large Enterprise (5000+ employees)';
  else if (/ltd|co\.|llc|gmbh/.test(name) && !/group|international/.test(name)) scale = 'Small-Medium Enterprise (<500 employees)';

  // 地区标签
  const regionTags: string[] = [];
  if (/saudi|arabia|middle east|gcc|dubai|uae/.test(ctry + name)) regionTags.push('中东大客');
  if (/german|europe|eu|france|spain|italy/.test(ctry + name)) regionTags.push('欧洲市场');
  if (/brazil|latin|south america|mexico/.test(ctry + name)) regionTags.push('拉美新兴');
  if (/vietnam|asia|india|indonesia|thailand/.test(ctry + name)) regionTags.push('亚太区域');
  if (/australia|new zealand|oceania/.test(ctry + name)) regionTags.push('大洋洲市场');
  if (/usa|united states|america|canada|north america/.test(ctry + name)) regionTags.push('北美市场');

  // 匹配度
  let match_level: 'high' | 'medium' | 'low' = 'medium';
  if (/wind|turbine|power|energy|renew/.test(name + (notes || ''))) match_level = 'high';
  else if (/trad|import|export/.test(name)) match_level = 'medium';
  else match_level = 'low';

  // 风险
  let risk_level: 'low' | 'medium' | 'high' = 'medium';
  if (/saudi|uae|gcc|german|australia|canada|usa/.test(ctry)) risk_level = 'low';
  else if (/brazil|india|vietnam|indonesia/.test(ctry)) risk_level = 'medium';
  else if (/iran|russia|north korea|sanction/.test(ctry)) risk_level = 'high';

  const tags: string[] = [];
  if (regionTags.length > 0) tags.push(regionTags[0]);
  tags.push(match_level === 'high' ? '高匹配度' : match_level === 'medium' ? '中等匹配' : '低匹配');
  tags.push(risk_level === 'low' ? '低风险' : risk_level === 'medium' ? '中风险' : '高风险');
  if (/group|international|global|holdings/.test(name)) tags.push('集团客户');

  const key_match_products: string[] = [];
  if (match_level === 'high') {
    key_match_products.push('Wind Turbines (1.5MW-16MW)', 'Tower Sections', 'Blade Sets');
  } else {
    key_match_products.push('Industrial Components', 'Electrical Equipment');
  }

  const main_business = `${company_name} operates as a ${company_type.toLowerCase()} in ${country || 'the global market'}. ${website ? `Their website (${website}) indicates active business operations. ` : ''}${notes ? `Additional context: ${notes}. ` : ''}The company appears to be engaged in procurement and project development activities relevant to industrial equipment trade.`;

  const risk_assessment = risk_level === 'low'
    ? `Based in ${country || 'a stable market'}, this company shows low commercial risk. The market has established trade relations and reliable payment practices. Standard trade terms (T/T, L/C) are commonly accepted.`
    : risk_level === 'medium'
    ? `${country || 'The market'} presents moderate risk factors including currency fluctuations and evolving trade policies. Recommend using L/C or T/T with deposit for initial transactions. Monitor local regulations.`
    : `High risk market conditions detected. Strongly recommend L/C at sight, comprehensive insurance, and thorough due diligence before engagement. Consider trade finance solutions.`;

  const ai_pitch_strategy = match_level === 'high'
    ? `Strategy: Position KIKI TECH as a strategic wind turbine supplier. 1) Highlight our 1.5MW-16MW product range matching their project needs. 2) Reference successful projects in similar markets. 3) Offer technical consultation and site assessment support. 4) Propose a pilot order with favorable payment terms to build trust. 5) Emphasize our certifications (DNV, CE, IEC) and after-sales service network. Key contact approach: Send a personalized technical proposal to ${contact_name || 'the procurement team'} referencing their recent projects.`
    : `Strategy: Build awareness and nurture the relationship. 1) Start with a company introduction and product catalog. 2) Offer market insights relevant to their region. 3) Propose a sample or trial order to establish trade history. 4) Follow up with competitive pricing and flexible terms. Key approach: Connect with ${contact_name || 'the decision maker'} on LinkedIn, then follow up with a tailored email.`;

  // 决策人线索
  const decision_makers: { title: string; department: string }[] = [];
  if (match_level === 'high') {
    decision_makers.push(
      { title: 'Procurement Director', department: 'Procurement' },
      { title: 'Chief Technology Officer', department: 'Engineering' },
      { title: 'Project Manager', department: 'Project Management' },
    );
  } else {
    decision_makers.push(
      { title: 'Supply Chain Manager', department: 'Supply Chain' },
      { title: 'Import/Export Manager', department: 'Trade' },
    );
  }

  // 破冰切入点
  const pitch_hook = match_level === 'high'
    ? `Noticed ${company_name}'s recent expansion in renewable energy projects — our 16MW turbine series could cut your LCOE by 15% while meeting ${country || 'your market'}'s grid requirements.`
    : `Saw ${company_name}'s growing presence in ${country || 'your region'} — we supply certified industrial components with flexible MOQ and competitive lead times for distributors like you.`;

  // 匹配分析
  const matching_point = match_level === 'high'
    ? `${company_name}'s core business in renewable energy development directly aligns with KIKI TECH's wind turbine product line (1.5MW-16MW). Their project pipeline requires reliable turbine supply with strong after-sales support — our key competitive edge. Additional match on tower sections and blade sets for their EPC needs.`
    : `${company_name} operates as a ${company_type.toLowerCase()} with potential demand for industrial components. While not a direct wind energy player, their trade activities in ${country || 'their market'} could benefit from our competitively priced electrical equipment and components. Suggest starting with a catalog review and trial order.`;

  return {
    company_type,
    scale,
    main_business,
    key_match_products,
    risk_assessment,
    ai_pitch_strategy,
    tags,
    match_level,
    risk_level,
    decision_makers,
    pitch_hook,
    matching_point,
    generated_at: new Date().toISOString(),
  };
}
