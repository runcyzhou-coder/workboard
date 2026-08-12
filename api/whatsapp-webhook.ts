// WhatsApp Cloud API - Webhook 接收消息
// 文档: https://developers.facebook.com/docs/whatsapp-cloudapi/webhooks
// 当客户发送 WhatsApp 消息时，Meta 会将消息推送到此 URL

import { createClient } from '@supabase/supabase-js';

// Supabase 客户端用于存储消息
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } }
);

interface WhatsAppMessage {
  id: string;
  role: 'customer' | 'me';
  text: string;
  time: string;
  customer_id?: string;
}

// Webhook 存储：在内存中维护最新消息（Vercel 无状态，每次请求独立）
// 我们使用 Supabase 存储会话历史，前端定时轮询
async function saveMessage(
  phone: string,
  name: string,
  text: string,
  wamId: string
) {
  const now = new Date().toISOString();

  // 1. 查找或创建客户
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('id')
    .ilike('phone', phone)
    .maybeSingle();

  let customerId: string;

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert({
        company_name: name || `Customer ${phone}`,
        contact_name: name || 'Unknown',
        phone: phone,
        email: '',
        country: '',
        status: 'active',
        notes: 'WhatsApp 自动创建',
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Create customer error:', createError);
      // 即使创建失败也继续存消息
      customerId = 'unknown';
    } else {
      customerId = newCustomer.id;
    }
  }

  // 2. 存储消息到 whatsapp_messages 表
  const { error: msgError } = await supabase
    .from('whatsapp_messages')
    .insert({
      customer_id: customerId,
      phone: phone,
      sender: 'customer',
      text: text,
      wam_id: wamId,
      received_at: now,
    });

  if (msgError) {
    console.error('Save message error:', msgError);
    // 尝试自动创建表
    await ensureWhatsAppTables();
  }

  return customerId;
}

async function ensureWhatsAppTables() {
  // 简化版：如果表不存在，提示用户创建
  console.warn('[WhatsApp] 可能需要创建 whatsapp_messages 表');
}

export default async function handler(req: any, res: any) {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'kiki_whatsapp_verify';

  // ========== GET 请求：Webhook 验证 ==========
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WhatsApp Webhook] Verification successful');
      return res.status(200).send(challenge);
    } else {
      console.warn('[WhatsApp Webhook] Verification failed:', { mode, token });
      return res.status(403).json({ error: 'Verification failed' });
    }
  }

  // ========== POST 请求：接收消息 ==========
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    // Meta 发送的数据格式:
    // {
    //   "entry": [{
    //     "changes": [{
    //       "field": "messages",
    //       "value": {
    //         "messages": [{
    //           "from": "8613800138000",
    //           "text": { "body": "你好" },
    //           "wamid": "wamid.xxx"
    //         }]
    //       }
    //     }]
    //   }]
    // }

    const entries = body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const messages = change.value?.messages || [];
        const contacts = change.value?.contacts || [];

        for (const msg of messages) {
          const from = msg.from;
          const wamid = msg.wamid;
          const contact = contacts.find((c: any) => c.wa_id === from);
          const name = contact?.profile?.name || `Customer ${from}`;

          let text = '';
          let messageType = msg.type;

          if (msg.type === 'text' && msg.text) {
            text = msg.text.body || '';
          } else if (msg.type === 'image' && msg.image?.caption) {
            text = `[图片] ${msg.image.caption}`;
          } else if (msg.type === 'voice') {
            text = '[语音消息]';
            messageType = 'voice';
          } else if (msg.type === 'video') {
            text = msg.video?.caption || '[视频消息]';
          } else if (msg.type === 'document') {
            text = `[文件] ${msg.document?.filename || ''}`;
          } else if (msg.type === 'location') {
            text = `[位置] ${msg.location?.latitude}, ${msg.location?.longitude}`;
          } else if (msg.type === 'contacts') {
            text = '[联系人]';
          } else if (msg.type === 'interactive') {
            text = `[按钮回复] ${msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || ''}`;
          } else if (msg.type === 'reaction') {
            text = `[表情] ${msg.reaction?.emoji || ''}`;
          } else {
            text = `[${msg.type || 'unknown'}]`;
          }

          // 仅在有内容时保存
          if (text && messageType !== 'system') {
            await saveMessage(from, name, text, wamid);
            console.log(`[WhatsApp] 收到消息: ${name} (${from}): ${text}`);
          }

          // 如果是媒体消息，自动确认（标记为已读）
          if (wamid && (msg.type === 'text')) {
            await markAsRead(wamid);
          }
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    return res.status(200).json({ ok: true }); // 即使出错也返回 200，防止 Meta 重试
  }
}

// 标记消息为已读
async function markAsRead(wamid: string) {
  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) return;

  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: wamid,
        }),
      }
    );
  } catch {
    // 忽略标记错误
  }
}
