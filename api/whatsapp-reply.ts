// AI 智能客服回复 API
// 部署在 Vercel Serverless Functions (/api/whatsapp-reply)
// 根据客户消息上下文，生成专业的 B2B 外贸回复建议

interface ReplyRequest {
  customer_name: string;
  customer_company?: string;
  customer_country?: string;
  messages: { role: 'customer' | 'me'; text: string; time: string }[];
  product_context?: string;
  language?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customer_name, customer_company, customer_country, messages, product_context, language } = req.body as ReplyRequest;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages are required' });
  }

  const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!AI_API_KEY) {
    return res.status(200).json({
      replies: [
        '您好！感谢您的询盘，我稍后为您准备详细的报价方案。',
        '收到您的消息！请问您需要的产品具体规格和数量是多少？这样我可以给您报最准确的价格。',
      ],
      fallback: true,
    });
  }

  // 构建对话上下文
  const conversationText = messages
    .map(m => `${m.role === 'customer' ? customer_name : '我'}: ${m.text}`)
    .join('\n');

  const langInstruction = language === 'en'
    ? 'Reply in English.'
    : language === 'ar'
    ? 'Reply in Arabic with English translation.'
    : 'Reply in the same language as the customer message. If customer writes in English, reply in English. If in Spanish, reply in Spanish, etc.';

  const systemPrompt = `You are a professional B2B export trade sales representative for KIKI TECH (a Chinese manufacturer of wind turbines, industrial equipment, and renewable energy products). You are communicating with a customer on WhatsApp. Generate 3 professional, natural-sounding reply options that a salesperson could send. ${langInstruction}

Rules:
- Each reply should be concise (suitable for WhatsApp, max 3-4 sentences)
- Be professional yet friendly and conversational
- Address the customer's specific questions or concerns
- Include relevant product/trade knowledge when appropriate
- Suggest next steps (e.g., sending quotation, scheduling a call, sharing catalog)
- Use appropriate trade terms (MOQ, FOB, CIF, T/T, L/C, lead time, etc.) when relevant
- Do NOT include "Dear" or overly formal letter-style language
- Return ONLY valid JSON array of 3 strings, no markdown`;

  const userPrompt = `Customer: ${customer_name}${customer_company ? ` from ${customer_company}` : ''}${customer_country ? ` (${customer_country})` : ''}

${product_context ? `Product Context: ${product_context}` : ''}

Conversation:
${conversationText}

Generate 3 different reply options. Return as JSON array of 3 strings.`;

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
        temperature: 0.6,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI API error:', response.status, errText);
      return res.status(200).json({
        replies: ['抱歉，AI 服务暂时不可用，请稍后重试或手动输入回复。'],
        fallback: true,
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(200).json({
        replies: ['抱歉，AI 未返回有效回复，请手动输入。'],
        fallback: true,
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return res.status(200).json({
          replies: [content.trim()],
        });
      }
    }

    // 支持数组或 { replies: [...] } 格式
    const replies = Array.isArray(parsed) ? parsed : (parsed.replies || [content.trim()]);

    return res.status(200).json({
      replies: replies.slice(0, 3).map((r: any) => typeof r === 'string' ? r : String(r)),
    });
  } catch (error) {
    console.error('WhatsApp reply API error:', error);
    return res.status(200).json({
      replies: ['抱歉，AI 服务暂时不可用，请手动输入回复。'],
      fallback: true,
    });
  }
}
