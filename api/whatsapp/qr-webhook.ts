// Generic Webhook 接口 — 适配 Evolution API / 扫码网关
// 接收格式: { sender: string, message: string }
// 接收买家消息后存入 Supabase，并触发 AI 生成回复，再通过网关自动发送

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } }
);

// AI 配置
const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const AI_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// 网关发送配置
const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL || ''; // e.g. http://localhost:3000/send-message
const GATEWAY_TOKEN = process.env.WHATSAPP_GATEWAY_TOKEN || ''; // 网关鉴权 token

// ===== 存储买家消息 =====
async function saveIncomingMessage(sender: string, message: string) {
  const now = new Date().toISOString();

  // 1. 查找或创建客户
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, contact_name, company_name, country')
    .ilike('phone', sender)
    .maybeSingle();

  let customerId: string;
  let customerName = `Customer ${sender}`;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    customerName = existingCustomer.contact_name || existingCustomer.company_name || customerName;
  } else {
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        company_name: customerName,
        contact_name: customerName,
        phone: sender,
        email: '',
        country: '',
        status: 'active',
        notes: 'WhatsApp 扫码网关自动创建',
      })
      .select('id')
      .single();

    if (error || !newCustomer) {
      console.error('[QR-Webhook] 创建客户失败:', error);
      customerId = 'unknown';
    } else {
      customerId = newCustomer.id;
    }
  }

  // 2. 存储消息
  const { error: msgError } = await supabase
    .from('whatsapp_messages')
    .insert({
      customer_id: customerId,
      phone: sender,
      sender: 'customer',
      text: message,
      received_at: now,
    });

  if (msgError) {
    console.error('[QR-Webhook] 存储消息失败:', msgError);
  }

  return { customerId, customerName };
}

// ===== AI 生成回复（RAG 知识库检索） =====
async function generateAiReply(
  sender: string,
  customerName: string,
  message: string,
  history: { role: string; text: string }[]
): Promise<string | null> {
  if (!AI_API_KEY) {
    console.warn('[QR-Webhook] AI API key 未配置，跳过自动回复');
    return null;
  }

  const conversationText = history.length > 0
    ? history.map(m => `${m.role === 'customer' ? customerName : '我'}: ${m.text}`).join('\n')
    : `${customerName}: ${message}`;

  const systemPrompt = `You are a professional B2B export trade sales representative for KIKI TECH (a Chinese manufacturer of wind turbines, industrial equipment, and renewable energy products). You are replying to a customer on WhatsApp.

Rules:
- Reply in the same language as the customer message
- Keep it concise and natural for WhatsApp (1-3 sentences)
- Be professional yet friendly
- Address the customer's specific question
- Suggest next steps when appropriate
- Do NOT use overly formal letter-style language
- Return ONLY the reply text, no JSON, no markdown, no quotes`;

  const userPrompt = `Conversation history:
${conversationText}

Latest message from customer: ${message}

Write a direct reply:`;

  try {
    const response = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
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
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('[QR-Webhook] AI API 错误:', response.status);
      return null;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error('[QR-Webhook] AI 返回空内容');
      return null;
    }

    return reply;
  } catch (err) {
    console.error('[QR-Webhook] AI 生成失败:', err);
    return null;
  }
}

// ===== 通过网关发送消息 =====
async function sendViaGateway(receiver: string, text: string): Promise<boolean> {
  if (!GATEWAY_URL) {
    console.warn('[QR-Webhook] 网关 URL 未配置，跳过自动发送');
    return false;
  }

  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN ? { 'Authorization': `Bearer ${GATEWAY_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        sender: receiver, // 网关通常用 receiver 字段
        receiver: receiver,
        message: text,
      }),
    });

    if (!response.ok) {
      console.error('[QR-Webhook] 网关发送失败:', response.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[QR-Webhook] 网关请求异常:', err);
    return false;
  }
}

// ===== 保存发出的消息 =====
async function saveOutgoingMessage(receiver: string, text: string, customerId: string) {
  const now = new Date().toISOString();
  await supabase
    .from('whatsapp_messages')
    .insert({
      customer_id: customerId,
      phone: receiver,
      sender: 'me',
      text: text,
      received_at: now,
    });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sender, message } = req.body;

    // 兼容多种字段名
    const phone = sender || req.body.phone || req.body.from || req.body.number;
    const text = message || req.body.text || req.body.body || req.body.content;

    if (!phone || !text) {
      return res.status(400).json({ error: 'sender and message are required' });
    }

    console.log(`[QR-Webhook] 收到消息: ${phone}: ${text}`);

    // 1. 存储买家消息
    const { customerId, customerName } = await saveIncomingMessage(phone, text);

    // 2. 获取最近的历史消息（用于 AI 上下文）
    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('sender, text')
      .eq('phone', phone)
      .order('received_at', { ascending: true })
      .limit(20);

    // 3. AI 生成回复
    const aiReply = await generateAiReply(
      phone,
      customerName,
      text,
      (history || []).map(h => ({ role: h.sender, text: h.text }))
    );

    // 4. 通过网关自动发送 AI 回复
    let sent = false;
    if (aiReply) {
      sent = await sendViaGateway(phone, aiReply);
      if (sent) {
        // 5. 保存发出的消息
        await saveOutgoingMessage(phone, aiReply, customerId);
        console.log(`[QR-Webhook] AI 自动回复已发送: ${phone}: ${aiReply.substring(0, 50)}...`);
      }
    }

    return res.status(200).json({
      ok: true,
      received: { sender: phone, message: text },
      ai_reply: aiReply,
      auto_sent: sent,
    });
  } catch (error: any) {
    console.error('[QR-Webhook] 错误:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
}
