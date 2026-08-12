// Green-API Webhook 接收接口
// 接收 Green-API 推送的消息，存入 Supabase，并触发 AI 自动回复
// 同时兼容 Generic 格式 { sender, message }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } }
);

const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const AI_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Green-API 配置
const GREEN_API_ID = process.env.GREEN_API_ID_INSTANCE || '';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN_INSTANCE || '';
const GREEN_API_BASE = 'https://api.green-api.com';

// ===== 存储消息 =====
async function saveMessage(phone: string, name: string, text: string, sender: 'customer' | 'me') {
  const now = new Date().toISOString();

  // 查找或创建客户
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id, contact_name, company_name, country')
    .ilike('phone', phone)
    .maybeSingle();

  let customerId: string;
  let customerName = name || `Customer ${phone}`;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    customerName = existingCustomer.contact_name || existingCustomer.company_name || customerName;
  } else {
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        company_name: customerName,
        contact_name: customerName,
        phone: phone,
        email: '',
        country: '',
        status: 'active',
        notes: 'WhatsApp Green-API 自动创建',
      })
      .select('id')
      .single();

    if (error || !newCustomer) {
      console.error('[Webhook] 创建客户失败:', error);
      customerId = 'unknown';
    } else {
      customerId = newCustomer.id;
    }
  }

  // 存储消息
  const { error: msgError } = await supabase
    .from('whatsapp_messages')
    .insert({
      customer_id: customerId,
      phone: phone,
      sender: sender,
      text: text,
      received_at: now,
    });

  if (msgError) {
    console.error('[Webhook] 存储消息失败:', msgError);
  }

  return { customerId, customerName };
}

// ===== AI 生成回复 =====
async function generateAiReply(
  customerName: string,
  message: string,
  history: { role: string; text: string }[]
): Promise<string | null> {
  if (!AI_API_KEY) {
    console.warn('[Webhook] AI API key 未配置');
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
      console.error('[Webhook] AI API 错误:', response.status);
      return null;
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || null;
  } catch (err) {
    console.error('[Webhook] AI 生成失败:', err);
    return null;
  }
}

// ===== 通过 Green-API 发送消息 =====
async function sendViaGreenApi(phone: string, text: string): Promise<boolean> {
  if (!GREEN_API_ID || !GREEN_API_TOKEN) {
    console.warn('[Webhook] Green-API 凭据未配置');
    return false;
  }

  // Green-API 的 chatId 格式: 85256973869@c.us
  const chatId = phone.includes('@') ? phone : `${phone}@c.us`;

  try {
    const response = await fetch(
      `${GREEN_API_BASE}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chatId,
          message: text,
        }),
      }
    );

    if (!response.ok) {
      console.error('[Webhook] Green-API 发送失败:', response.status);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Webhook] Green-API 请求异常:', err);
    return false;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // ===== 兼容两种格式 =====

    // 格式1: Green-API Webhook
    if (body.typeWebhook === 'incomingMessageReceived' || body.messageData) {
      const sender = body.senderData?.sender || '';
      const senderName = body.senderData?.senderName || `Customer ${sender}`;
      const idMessage = body.idMessage || '';

      // 提取消息文本
      let text = '';
      const msgData = body.messageData || {};

      if (msgData.typeMessage === 'textMessage') {
        text = msgData.textMessageData?.textMessage || '';
      } else if (msgData.typeMessage === 'extendedTextMessage') {
        text = msgData.extendedTextMessageData?.text || '';
      } else if (msgData.typeMessage === 'imageMessage') {
        text = `[图片] ${msgData.imageMessageData?.caption || ''}`;
      } else if (msgData.typeMessage === 'videoMessage') {
        text = `[视频] ${msgData.videoMessageData?.caption || ''}`;
      } else if (msgData.typeMessage === 'voiceMessage') {
        text = '[语音消息]';
      } else if (msgData.typeMessage === 'documentMessage') {
        text = `[文件] ${msgData.documentMessageData?.fileName || ''}`;
      } else if (msgData.typeMessage === 'locationMessage') {
        text = `[位置] ${msgData.locationMessageData?.latitude || ''}, ${msgData.locationMessageData?.longitude || ''}`;
      } else if (msgData.typeMessage === 'contactMessage') {
        text = `[联系人] ${msgData.contactMessageData?.displayName || ''}`;
      } else {
        text = `[${msgData.typeMessage || 'unknown'}]`;
      }

      if (!sender || !text) {
        return res.status(200).json({ ok: true });
      }

      console.log(`[Green-API] 收到消息: ${senderName} (${sender}): ${text}`);

      // 1. 存储买家消息
      const { customerId, customerName } = await saveMessage(sender, senderName, text, 'customer');

      // 2. 获取历史消息
      const { data: history } = await supabase
        .from('whatsapp_messages')
        .select('sender, text')
        .eq('phone', sender)
        .order('received_at', { ascending: true })
        .limit(20);

      // 3. AI 生成回复
      const aiReply = await generateAiReply(
        customerName,
        text,
        (history || []).map(h => ({ role: h.sender, text: h.text }))
      );

      // 4. 通过 Green-API 自动发送
      let sent = false;
      if (aiReply) {
        sent = await sendViaGreenApi(sender, aiReply);
        if (sent) {
          // 5. 保存发出的消息
          await saveMessage(sender, customerName, aiReply, 'me');
          console.log(`[Green-API] AI 自动回复已发送: ${sender}: ${aiReply.substring(0, 50)}...`);
        }
      }

      return res.status(200).json({
        ok: true,
        received: { sender, message: text },
        ai_reply: aiReply,
        auto_sent: sent,
      });
    }

    // 格式2: Generic Webhook { sender, message }
    const phone = body.sender || body.phone || body.from || body.number;
    const text = body.message || body.text || body.body || body.content;

    if (!phone || !text) {
      return res.status(400).json({ error: 'sender and message are required' });
    }

    console.log(`[Generic] 收到消息: ${phone}: ${text}`);

    const { customerId, customerName } = await saveMessage(phone, `Customer ${phone}`, text, 'customer');

    const { data: history } = await supabase
      .from('whatsapp_messages')
      .select('sender, text')
      .eq('phone', phone)
      .order('received_at', { ascending: true })
      .limit(20);

    const aiReply = await generateAiReply(
      customerName,
      text,
      (history || []).map(h => ({ role: h.sender, text: h.text }))
    );

    let sent = false;
    if (aiReply) {
      sent = await sendViaGreenApi(phone, aiReply);
      if (sent) {
        await saveMessage(phone, customerName, aiReply, 'me');
      }
    }

    return res.status(200).json({
      ok: true,
      received: { sender: phone, message: text },
      ai_reply: aiReply,
      auto_sent: sent,
    });
  } catch (error: any) {
    console.error('[Webhook] 错误:', error);
    return res.status(200).json({ ok: true });
  }
}
