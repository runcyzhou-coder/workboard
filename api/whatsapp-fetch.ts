// 获取 WhatsApp 聊天历史
// 前端通过此 API 加载客户对话

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } }
  );

  // 获取所有客户列表（有 WhatsApp 消息的）
  if (req.method === 'GET') {
    const { customer_id, phone, limit = 50 } = req.query;

    try {
      // 如果指定了客户，获取该客户的消息
      if (customer_id || phone) {
        let query = supabase
          .from('whatsapp_messages')
          .select('*')
          .order('received_at', { ascending: true })
          .limit(Number(limit));

        if (customer_id) query = query.eq('customer_id', customer_id);
        if (phone) query = query.eq('phone', phone);

        const { data, error } = await query;

        if (error) {
          console.error('Fetch messages error:', error);
          return res.status(200).json({ messages: [], error: 'table_not_ready' });
        }

        return res.status(200).json({ messages: data || [] });
      }

      // 否则返回有 WhatsApp 消息的客户列表
      const { data: messages, error } = await supabase
        .from('whatsapp_messages')
        .select('phone, sender, text, received_at, customer_id')
        .order('received_at', { ascending: false });

      if (error) {
        console.error('Fetch all messages error:', error);
        return res.status(200).json({ conversations: [], error: 'table_not_ready' });
      }

      // 聚合为每个客户的最近一条消息
      const phoneMap = new Map<string, any>();
      for (const msg of (messages || [])) {
        if (!phoneMap.has(msg.phone)) {
          phoneMap.set(msg.phone, msg);
        }
      }

      // 查找对应的客户信息
      const phones = Array.from(phoneMap.keys());
      const { data: customers, error: custErr } = await supabase
        .from('customers')
        .select('id, company_name, contact_name, phone, country, status, notes')
        .in('phone', phones);

      if (custErr) {
        return res.status(200).json({ conversations: Array.from(phoneMap.values()) });
      }

      const customerMap = new Map((customers || []).map(c => [c.phone, c]));

      const conversations = Array.from(phoneMap.values()).map(msg => ({
        phone: msg.phone,
        lastMessage: msg.text,
        lastTime: msg.received_at,
        sender: msg.sender,
        customer: customerMap.get(msg.phone) || {
          id: 'unknown',
          company_name: `Customer ${msg.phone}`,
          contact_name: '',
          country: '',
        },
      }));

      return res.status(200).json({ conversations });
    } catch (err: any) {
      console.error('WhatsApp fetch error:', err);
      return res.status(200).json({ messages: [], conversations: [] });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
