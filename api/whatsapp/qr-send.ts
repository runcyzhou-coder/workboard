// Green-API 发送消息接口
// 前端调用此接口，通过 Green-API 发送消息给买家

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } }
);

const GREEN_API_ID = process.env.GREEN_API_ID_INSTANCE || '';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN_INSTANCE || '';
const GREEN_API_BASE = 'https://api.green-api.com';

interface SendRequest {
  to: string;
  text: string;
  customer_id?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, text, customer_id } = req.body as SendRequest;

  if (!to || !text) {
    return res.status(400).json({ error: 'to and text are required' });
  }

  if (!GREEN_API_ID || !GREEN_API_TOKEN) {
    return res.status(200).json({
      ok: false,
      simulated: true,
      message: 'Green-API 凭据未配置',
    });
  }

  // 手机号格式清理
  const formattedPhone = to.replace(/[+\s-]/g, '');
  const chatId = formattedPhone.includes('@') ? formattedPhone : `${formattedPhone}@c.us`;

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
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('[QR-Send] Green-API 返回错误:', response.status, errText);
      return res.status(200).json({
        ok: false,
        error: `Green-API 错误: ${response.status}`,
      });
    }

    const data = await response.json();

    // 发送成功后，存储到 Supabase
    const now = new Date().toISOString();
    let customerId = customer_id || 'unknown';

    if (!customer_id) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .ilike('phone', formattedPhone)
        .maybeSingle();

      customerId = existingCustomer?.id || 'unknown';
    }

    await supabase
      .from('whatsapp_messages')
      .insert({
        customer_id: customerId,
        phone: formattedPhone,
        sender: 'me',
        text: text,
        received_at: now,
      });

    return res.status(200).json({
      ok: true,
      message_id: data.idMessage,
      to: formattedPhone,
    });
  } catch (error: any) {
    console.error('[QR-Send] 发送失败:', error);
    return res.status(200).json({
      ok: false,
      error: error.message || '发送失败',
    });
  }
}
