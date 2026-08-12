// Generic 网关发送接口 — 适配 Evolution API / 扫码网关
// 前端调用此接口，通过网关 HTTP POST 发送消息给买家

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } }
);

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL || '';
const GATEWAY_TOKEN = process.env.WHATSAPP_GATEWAY_TOKEN || '';

interface SendRequest {
  to: string;       // 接收方手机号
  text: string;     // 消息内容
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

  if (!GATEWAY_URL) {
    return res.status(200).json({
      ok: false,
      simulated: true,
      message: '网关 URL 未配置，消息未发送',
    });
  }

  // 手机号格式清理
  const formattedPhone = to.replace(/[+\s-]/g, '');

  try {
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN ? { 'Authorization': `Bearer ${GATEWAY_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        sender: formattedPhone,
        receiver: formattedPhone,
        message: text,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error('[QR-Send] 网关返回错误:', response.status, errText);
      return res.status(200).json({
        ok: false,
        error: `网关错误: ${response.status}`,
      });
    }

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
