// AI 客户智能分析 API
// 部署在 Vercel Serverless Functions (/api/customer-analysis)
// 使用 DeepSeek/OpenAI API 分析客户转化率、风险、推荐动作

interface AnalysisRequest {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  address?: string;
  website?: string;
  status: string;
  tags?: string[];
  notes?: string;
  created_at: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const customer = req.body as AnalysisRequest;
  if (!customer.company_name) {
    return res.status(400).json({ error: 'company_name is required' });
  }

  const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!AI_API_KEY) {
    return res.status(200).json({ error: 'AI API key not configured', fallback: true });
  }

  const systemPrompt = `You are an expert B2B export trade sales analyst. Analyze the customer data and return actionable insights in JSON format. Return ONLY valid JSON, no markdown.`;

  const userPrompt = `Analyze this B2B customer and provide sales intelligence:

Company: ${customer.company_name}
Contact: ${customer.contact_name || 'N/A'}
Email: ${customer.email || 'N/A'}
Phone: ${customer.phone || 'N/A'}
Country: ${customer.country || 'N/A'}
Website: ${customer.website || 'N/A'}
Status: ${customer.status}
Tags: ${customer.tags?.join(', ') || 'none'}
Notes: ${customer.notes || 'N/A'}
Created: ${customer.created_at}

Return ONLY valid JSON with this exact structure:
{
  "conversionRate": 0-100,
  "confidence": "high|medium|low",
  "nextFollowUpDays": number,
  "recommendedActions": [
    {"icon": "Mail|MapPin|MessageSquare|Zap|Target|CheckCircle|TrendingUp|Tag|Edit2|Phone", "title": "简短标题", "detail": "具体建议", "priority": "high|medium|low"}
  ],
  "riskFactors": ["风险因素1", "风险因素2"],
  "strengths": ["优势1", "优势2"],
  "customerTier": "A|B|C|D"
}

Rules:
- conversionRate: 基于客户状态、信息完整度、市场、标签等综合评估 0-100
- confidence: 数据完整度 high/medium/low
- nextFollowUpDays: 建议下次跟进天数
- recommendedActions: 3-6 个具体可执行的推荐动作，用中文
- riskFactors: 2-4 个风险因素，用中文
- strengths: 2-4 个优势，用中文
- customerTier: A(优质) B(良好) C(一般) D(需关注)`;

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
      return res.status(200).json({ error: 'AI API error', fallback: true });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(200).json({ error: 'Empty AI response', fallback: true });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(200).json({ error: 'Failed to parse', fallback: true });
      }
    }

    return res.status(200).json({
      analysis: {
        conversionRate: Math.max(5, Math.min(95, Number(parsed.conversionRate) || 50)),
        confidence: parsed.confidence || 'medium',
        nextFollowUpDays: Number(parsed.nextFollowUpDays) || 7,
        recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
        riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        customerTier: parsed.customerTier || 'C',
      },
    });
  } catch (error) {
    console.error('Customer analysis API error:', error);
    return res.status(200).json({ error: 'Analysis failed', fallback: true });
  }
}
