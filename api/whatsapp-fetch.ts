import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  const SUPABASE_CONNECTED = !!process.env.VITE_SUPABASE_URL;
  
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false } }
  );

  const GREEN_API_ID = process.env.GREEN_API_ID_INSTANCE || '';
  const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN_INSTANCE || '';
  const GREEN_API_BASE = 'https://api.green-api.com';
  const AI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
  const AI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const AI_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  // ============ DEBUG (before action parsing) ============
  if (req.url && req.url.includes('action=debug')) {
    return res.status(200).json({
      url: req.url,
      query: req.query ? String(req.query) : null,
      hasQuery: !!req.query,
      queryType: req.query ? typeof req.query : 'null',
      keys: req.query && typeof req.query === 'object' ? Object.keys(req.query) : [],
    });
  }

  // 解析 action - 支持 req.query (Vercel) 和 req.url
  let action = 'fetch';
  let data: any = null;

  // 优先使用 req.query (Vercel 已解析的参数)
  if (req.query) {
    if (req.query.action) action = req.query.action;
    if (req.query.data) {
      try {
        const jsonStr = Buffer.from(String(req.query.data), 'base64').toString('utf-8');
        data = JSON.parse(jsonStr);
      } catch {}
    }
    // 如果 req.query 是 URLSearchParams 对象
    if (action === 'fetch' && typeof req.query.get === 'function') {
      const qAction = req.query.get('action');
      if (qAction) action = qAction;
      const qData = req.query.get('data');
      if (qData && !data) {
        try {
          const jsonStr = Buffer.from(qData, 'base64').toString('utf-8');
          data = JSON.parse(jsonStr);
        } catch {}
      }
    }
  }

  // 回退：从 req.url 解析
  if (req.url && action === 'fetch') {
    try {
      const qIdx = req.url.indexOf('?');
      if (qIdx > -1) {
        const qs = req.url.substring(qIdx + 1);
        const params = new URLSearchParams(qs);
        const urlAction = params.get('action');
        if (urlAction) action = urlAction;
        const encodedData = params.get('data');
        if (encodedData && !data) {
          try {
            const jsonStr = Buffer.from(encodedData, 'base64').toString('utf-8');
            data = JSON.parse(jsonStr);
          } catch {}
        }
      }
    } catch {}
  }

  // ============ FETCH ============
  if (action === 'fetch') {
    const queryStr = req.url?.split('?')[1] || '';
    const params = new URLSearchParams(queryStr);
    let phone: string | null = params.get('phone');
    if (!phone && req.query?.phone) phone = String(req.query.phone);
    if (!phone && req.query?.get) phone = req.query.get('phone');
    
    if (phone) {
      const { data: messages } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('phone', phone)
        .order('received_at', { ascending: true })
        .limit(100);
      return res.status(200).json({ messages: messages || [] });
    }

    // 获取所有客户（手动创建的客户）
    const { data: allCustomers } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    // 获取所有 WhatsApp 消息的最新一条
    const { data: allMsgs } = await supabase
      .from('whatsapp_messages')
      .select('phone, sender, text, received_at, customer_id')
      .order('received_at', { ascending: false })
      .limit(500);

    const convMap = new Map();
    for (const msg of (allMsgs || [])) {
      if (!convMap.has(msg.phone)) convMap.set(msg.phone, msg);
    }

    const conversations: any[] = [];
    const processedPhones = new Set();

    // 1. 先处理有消息的客户
    for (const [phone, msg] of convMap) {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .ilike('phone', phone)
        .maybeSingle();

      if (customer) {
        conversations.push({
          phone,
          lastMessage: msg.text || '（暂无消息）',
          lastTime: msg.received_at,
          sender: msg.sender,
          customer,
        });
        processedPhones.add(phone);
      }
    }

    // 2. 再处理没有消息但有客户记录的客户
    for (const cust of (allCustomers || [])) {
      const custPhone = cust.phone;
      if (!custPhone || processedPhones.has(custPhone)) continue;

      // 查找该客户的最后一条消息
      const { data: lastMsg } = await supabase
        .from('whatsapp_messages')
        .select('text, received_at, sender')
        .eq('phone', custPhone)
        .order('received_at', { ascending: false })
        .limit(1);

      conversations.push({
        phone: custPhone,
        lastMessage: lastMsg?.[0]?.text || '（暂无消息）',
        lastTime: lastMsg?.[0]?.received_at || cust.created_at,
        sender: lastMsg?.[0]?.sender || '',
        customer: cust,
      });
    }

    // 按最后消息时间排序
    conversations.sort((a, b) => (b.lastTime || '').localeCompare(a.lastTime || ''));

    return res.status(200).json({ version: 'v2', action, supabase: SUPABASE_CONNECTED, conversations });
  }

  // ============ STATUS ============
  if (action === 'status') {
    if (!GREEN_API_ID || !GREEN_API_TOKEN) {
      return res.status(200).json({ connected: false, configured: false, message: 'Green-API 凭据未配置' });
    }
    try {
      const stateResponse = await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/getStateInstance/${GREEN_API_TOKEN}`);
      if (!stateResponse.ok) {
        return res.status(200).json({ connected: true, configured: true, state: 'authorized', message: '连接中' });
      }
      const stateData = await stateResponse.json();
      const state = stateData.stateInstance;
      if (state === 'authorized') {
        return res.status(200).json({ connected: true, configured: true, state, message: 'WhatsApp 已连接' });
      }
      if (state === 'notAuthorized') {
        try {
          const qrResponse = await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/qr/${GREEN_API_TOKEN}`);
          if (qrResponse.ok) {
            const qrData = await qrResponse.json();
            if (qrData.type === 'qrCode') {
              return res.status(200).json({ connected: false, configured: true, state, qrCode: qrData.message, message: '请扫描二维码登录 WhatsApp' });
            }
          }
        } catch {}
        return res.status(200).json({ connected: false, configured: true, state, message: '请扫码登录' });
      }
      return res.status(200).json({ connected: false, configured: true, state, message: `状态: ${state}` });
    } catch {
      return res.status(200).json({ connected: true, configured: true, message: '连接中' });
    }
  }

  // ============ SEND ============
  if (action === 'send') {
    const body = data || {};
    let to = body.to;
    let text = body.text;
    if (!to && req.query?.to) to = String(req.query.to);
    if (!text && req.query?.text) text = String(req.query.text);
    if ((!to || !text) && req.url) {
      try {
        const qIdx = req.url.indexOf('?');
        if (qIdx > -1) {
          const params = new URLSearchParams(req.url.substring(qIdx + 1));
          if (!to && params.get('to')) to = params.get('to');
          if (!text && params.get('text')) text = params.get('text');
        }
      } catch {}
    }
    if (!to || !text) return res.status(400).json({ error: 'to and text are required' });
    const phone = to.replace(/[+\s-]/g, '');
    if (GREEN_API_ID && GREEN_API_TOKEN) {
      const chatId = `${phone}@c.us`;
      const response = await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message: text }),
      });
      if (response.ok) {
        const { data: ec } = await supabase.from('customers').select('id').ilike('phone', phone).maybeSingle();
        const cid = ec?.id || body.customer_id || 'unknown';
        await supabase.from('whatsapp_messages').insert({
          customer_id: cid, phone, sender: 'me', text, received_at: new Date().toISOString(),
        });
        return res.status(200).json({ ok: true, to: phone });
      }
    }
    return res.status(200).json({ ok: false, error: '发送失败' });
  }

  // ============ POLL ============
  if (action === 'poll') {
    // 检查 poll 是否被暂停（通过查询参数）
    if (req.query?.cleanup === '1' || req.query?.skip_write === '1') {
      return res.status(200).json({ ok: true, processed: 0, skipped: 'cleanup' });
    }
    
    if (!GREEN_API_ID || !GREEN_API_TOKEN) return res.status(200).json({ ok: true, processed: 0 });
    let processed = 0;

    // receiveNotification 队列（Webhook 的备份）
    try {
      for (let i = 0; i < 5; i++) {
        const resp = await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/receiveNotification/${GREEN_API_TOKEN}`);
        if (!resp.ok) break;
        const notification = await resp.json();
        if (!notification) break;
        const receiptId = notification.receiptId;
        
        const notifBody = notification.body || {};
        if (notifBody.typeWebhook === 'incomingMessageReceived' && notifBody.messageData) {
          const rawSender = notifBody.senderData?.sender || '';
          const senderName = notifBody.senderData?.senderName || '';
          const msgData = notifBody.messageData || {};
          let text = '';
          if (msgData.typeMessage === 'textMessage') text = msgData.textMessageData?.textMessage || '';
          else if (msgData.typeMessage === 'extendedTextMessage') text = msgData.extendedTextMessageData?.text || '';
          else if (msgData.typeMessage === 'imageMessage') text = `[图片] ${msgData.imageMessageData?.caption || ''}`;
          else if (msgData.typeMessage === 'videoMessage') text = `[视频] ${msgData.videoMessageData?.caption || ''}`;
          else if (msgData.typeMessage === 'voiceMessage') text = '[语音消息]';
          else if (msgData.typeMessage === 'stickerMessage') text = '[表情]';
          else text = `[${msgData.typeMessage || 'unknown'}]`;
          
          if (rawSender && text) {
            const phone = rawSender.replace(/@c\.us$/, '').replace(/[+\s-]/g, '');
            const now = new Date().toISOString();
            
            const { data: dup } = await supabase.from('whatsapp_messages')
              .select('id').eq('phone', phone).eq('text', text)
              .eq('sender', 'customer')
              .gte('received_at', new Date(Date.now() - 300000).toISOString())
              .limit(1);
            
            if (!dup || dup.length === 0) {
              const { data: ec } = await supabase.from('customers').select('id').ilike('phone', phone).maybeSingle();
              let cid = ec?.id || null;
              // 只存储消息，不自动创建客户
              await supabase.from('whatsapp_messages').insert({
                customer_id: cid, phone, sender: 'customer', text, received_at: now,
              });
              processed++;
            }
          }
        }
        
        if (receiptId) {
          fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/deleteNotification/${GREEN_API_TOKEN}/${receiptId}`, { method: 'DELETE' }).catch(() => {});
        }
      }
    } catch {}

    return res.status(200).json({ ok: true, processed });
  }

  // ============ PROCESS ============
  if (action === 'process') {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentMsgs } = await supabase
      .from('whatsapp_messages')
      .select('id, phone, text, received_at, customer_id')
      .eq('sender', 'customer')
      .gte('received_at', fiveMinutesAgo)
      .order('received_at', { ascending: true })
      .limit(30);

    if (!recentMsgs || recentMsgs.length === 0) return res.status(200).json({ ok: true, processed: 0 });

    const needsReply = [];
    const priceKeywordsGlobal = ['报价', '多少钱', '价格', '单价', '总价', '费用', '怎么卖',
                                 'quote', 'quotation', 'price', 'cost', 'how much', 'pricing', 'unit price', 'total price'];
    for (const msg of recentMsgs) {
      const { data: myMsgs } = await supabase
        .from('whatsapp_messages')
        .select('id, text')
        .eq('phone', msg.phone)
        .eq('sender', 'me')
        .gt('received_at', msg.received_at)
        .limit(1);

      if (myMsgs && myMsgs.length > 0) continue;

      const { data: chatHistory } = await supabase
        .from('whatsapp_messages')
        .select('sender, text, received_at')
        .eq('phone', msg.phone)
        .lte('received_at', msg.received_at)
        .order('received_at', { ascending: false })
        .limit(40);

      let pendingQuote = false;
      for (const hist of (chatHistory || [])) {
        const t = (hist.text || '').toLowerCase();
        if (hist.sender === 'customer') {
          if (priceKeywordsGlobal.some(kw => t.includes(kw))) {
            pendingQuote = true;
            break;
          }
        }
      }

      if (pendingQuote) {
        const { data: msgsAfterQuote } = await supabase
          .from('whatsapp_messages')
          .select('sender, text')
          .eq('phone', msg.phone)
          .gt('received_at', msg.received_at)
          .order('received_at', { ascending: true })
          .limit(10);
        let hasManualReply = false;
        for (const r of (msgsAfterQuote || [])) {
          if (r.sender === 'me' && !(r.text || '').includes('报价单我这边正在整理') && !(r.text || '').includes('I\'m currently preparing a detailed quotation')) {
            hasManualReply = true;
            break;
          }
        }
        if (!hasManualReply) continue;
      }

      needsReply.push(msg);
    }

    if (needsReply.length === 0) return res.status(200).json({ ok: true, processed: 0 });

    const results = [];
    for (const msg of needsReply) {
      const phone = msg.phone;
      const { data: customer } = await supabase.from('customers').select('contact_name, company_name').eq('id', msg.customer_id).maybeSingle();
      const customerName = customer?.contact_name || customer?.company_name || `Customer ${phone}`;
      const customerMsgLower = (msg.text || '').toLowerCase();

      const askingQuote = priceKeywordsGlobal.some(kw => customerMsgLower.includes(kw));

      let aiReply = null;
      if (askingQuote) {
        aiReply = customerMsgLower.match(/[\u4e00-\u9fa5]/)
          ? `嗨${customerName ? ' ' + customerName : ''}！报价单我这边正在整理中（包含最新的运费和配件套餐），整理好了马上单独发给您哈！稍等一下😊`
          : `Hi${customerName ? ' ' + customerName : ''}! I'm currently preparing a detailed quotation for you with the latest shipping rates and package options. I'll send it over shortly! 😊`;
      } else {
        if (AI_API_KEY) {
          try {
            const { data: history } = await supabase
              .from('whatsapp_messages')
              .select('sender, text')
              .eq('phone', phone)
              .order('received_at', { ascending: true })
              .limit(20);
            const conv = (history || []).map((h: any) => `${h.sender === 'customer' ? customerName : '我'}: ${h.text}`).join('\n');
            const response = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AI_API_KEY}` },
              body: JSON.stringify({
                model: AI_MODEL,
                temperature: 0.8,
                max_tokens: 500,
                messages: [
                  {
                    role: 'system',
                    content: `你是 Runcy，KIKI TECH 的外贸销售经理。

## 基本设定
- 名字：Runcy
- 职位：KIKI TECH 外贸销售经理
- 回复语言：客户用什么语言就用什么语言回复（中文/英文自动识别）
- 态度：对客户非常热情、亲切，像朋友聊天一样，不要太正式、不要死板
- 回复长度：1-3 句话，简洁但不生硬，可适当加表情（😊🙏✨ 之类）

## 公司政策（必记）
- 产品质保：交付后 12 个月
- 严禁编造任何产品参数、价格、规格、交期。不确定的就说"我确认一下哈"

## 固定回复模板
### 客户只说了需求（问型号/选型/匹配）
回复："我需要和我们的技术部门沟通一下您的具体需求，从而帮助您更好地匹配型号😊"
（或者英文版："Let me check with our engineering team about your specific requirements so I can recommend the best model for you 😊"）

### 不知道答案 / 不确定的信息
中文："这个我需要确认一下哈，稍后给您回复！"
英文："Let me double-check on this and get back to you shortly!"

## 沟通技巧（参考顶级外贸销冠话术，灵活运用）
1. 先共情再回答：如"理解理解！很多客户刚开始也有这个疑问～"
2. 主动提问推进对话：回答完加一个问题，比如"方便告诉我您那边是什么应用场景吗？"
3. 降低压迫感：多用"哈、啦、呢"；英文多用 "sure thing / no worries / happy to help"
4. 客户问候或寒暄：热情回应，不要直接进推销
5. 适当口语化：像真人聊天，中英文都可以混一些缩写（u/ur/pls/ok啦）

## 重要约束
- 禁止编造任何具体的报价、价格、数字
- 只输出给客户的回复内容本身，不要加任何解释
`,
                  },
                  { role: 'user', content: `以下是和客户的对话历史：\n${conv}\n\n客户刚发了：${msg.text}\n\n请你以 Runcy 的身份回复客户（只输出回复的消息内容，不要加解释）：` },
                ],
              }),
            });
            if (response.ok) {
              const data = await response.json();
              aiReply = data.choices?.[0]?.message?.content?.trim() || null;
            }
          } catch {}
        }
      }

      if (aiReply && GREEN_API_ID && GREEN_API_TOKEN) {
        try {
          const chatId = `${phone}@c.us`;
          const resp = await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/sendMessage/${GREEN_API_TOKEN}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: aiReply }),
          });
          if (resp.ok) {
            await supabase.from('whatsapp_messages').insert({
              customer_id: msg.customer_id, phone, sender: 'me', text: aiReply,
              received_at: new Date().toISOString(),
            });
            results.push({ phone, processed: true });
          } else {
            results.push({ phone, processed: false, reason: 'send_failed' });
          }
        } catch { results.push({ phone, processed: false }); }
      } else {
        results.push({ phone, processed: false, reason: 'ai_or_config' });
      }
    }
    return res.status(200).json({ ok: true, processed: results.filter(r => r.processed).length, results });
  }

  // ============ WEBHOOK (接收 Green-API 推送消息) ============
  if (action === 'webhook') {
    try {
      let bodyObj: any = data;
      if (!bodyObj) {
        if (req.body) {
          if (typeof req.body === 'string') {
            try { bodyObj = JSON.parse(req.body); } catch { bodyObj = {}; }
          } else if (Buffer.isBuffer(req.body)) {
            try { bodyObj = JSON.parse(req.body.toString()); } catch { bodyObj = {}; }
          } else {
            bodyObj = req.body;
          }
        } else {
          bodyObj = {};
        }
      }
      
      if (bodyObj && bodyObj.typeWebhook === 'incomingMessageReceived' && bodyObj.messageData) {
        const rawSender = bodyObj.senderData?.sender || '';
        const senderName = bodyObj.senderData?.senderName || '';
        const msgData = bodyObj.messageData || {};
        let text = '';
        if (msgData.typeMessage === 'textMessage') text = msgData.textMessageData?.textMessage || '';
        else if (msgData.typeMessage === 'extendedTextMessage') text = msgData.extendedTextMessageData?.text || '';
        else if (msgData.typeMessage === 'imageMessage') text = `[图片] ${msgData.imageMessageData?.caption || ''}`;
        else if (msgData.typeMessage === 'videoMessage') text = `[视频] ${msgData.videoMessageData?.caption || ''}`;
        else if (msgData.typeMessage === 'voiceMessage') text = '[语音消息]';
        else text = `[${msgData.typeMessage || 'unknown'}]`;
        if (rawSender && text) {
          const phone = rawSender.replace(/@c\.us$/, '').replace(/[+\s-]/g, '');
          const now = new Date().toISOString();
          const { data: dup } = await supabase.from('whatsapp_messages').select('id').eq('phone', phone).eq('text', text).eq('sender', 'customer').gte('received_at', new Date(Date.now() - 60000).toISOString()).limit(1);
          if (!dup || dup.length === 0) {
            const { data: ec } = await supabase.from('customers').select('id').ilike('phone', phone).maybeSingle();
            let cid = ec?.id || null;
            // 只存储消息，不自动创建客户
            await supabase.from('whatsapp_messages').insert({
              customer_id: cid, phone, sender: 'customer', text, received_at: now,
            });
          }
        }
      }
    } catch {}
    return res.status(200).json({ ok: true });
  }

  // ============ CLEANUP ============
  // 只清除自动创建的 WhatsApp 消息和自动创建的客户（保留手动创建的客户）
  if (action === 'cleanup') {
    try {
      let deletedMessages = 0;
      let deletedCustomers = 0;
      let clearedGreenQueue = 0;
      const debug: string[] = [];

      // Step 1: 先清空 Green-API 的 receiveNotification 队列（防止重新写入）
      if (GREEN_API_ID && GREEN_API_TOKEN) {
        try {
          for (let i = 0; i < 100; i++) {
            const resp = await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/receiveNotification/${GREEN_API_TOKEN}`);
            if (!resp.ok) break;
            const notification = await resp.json();
            if (!notification) break;
            await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/deleteNotification/${GREEN_API_TOKEN}/${notification.receiptId}`, { method: 'DELETE' });
            clearedGreenQueue++;
          }
          debug.push(`Green-API queue cleared: ${clearedGreenQueue}`);
        } catch (e: any) {
          debug.push(`Green-API queue error: ${String(e)}`);
        }
      }

      // Step 2: 等待前端正在进行的 poll 完成
      await new Promise(resolve => setTimeout(resolve, 9000));

      // Step 3: 再次清空 Green-API 队列
      if (GREEN_API_ID && GREEN_API_TOKEN) {
        try {
          for (let i = 0; i < 100; i++) {
            const resp = await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/receiveNotification/${GREEN_API_TOKEN}`);
            if (!resp.ok) break;
            const notification = await resp.json();
            if (!notification) break;
            await fetch(`${GREEN_API_BASE}/waInstance${GREEN_API_ID}/deleteNotification/${GREEN_API_TOKEN}/${notification.receiptId}`, { method: 'DELETE' });
            clearedGreenQueue++;
          }
          debug.push(`Green-API queue re-cleared: ${clearedGreenQueue}`);
        } catch (e: any) {
          debug.push(`Green-API queue re-clear error: ${String(e)}`);
        }
      }

      // Step 4: 只删除没有关联客户的 WhatsApp 消息
      const { data: allMsgs, error: e1 } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .is('customer_id', null);  // 只清理没有关联客户的消息
      debug.push(`orphan msgs found: ${allMsgs?.length || 0}, err: ${e1 || 'none'}`);

      if (allMsgs && allMsgs.length > 0) {
        for (const msg of allMsgs) {
          const { error } = await supabase
            .from('whatsapp_messages')
            .delete()
            .eq('id', msg.id);
          if (!error) deletedMessages++;
          else debug.push(`Failed to delete msg ${msg.id}: ${String(error)}`);
        }
      }
      debug.push(`msgs deleted: ${deletedMessages}`);

      // Step 5: 只删除自动创建的客户（备注包含"自动"或 "WhatsApp"）
      const { data: autoCusts, error: e2 } = await supabase
        .from('customers')
        .select('id')
        .or('notes.ilike.%自动%,notes.ilike.%WhatsApp%,company_name.ilike.%Customer%');
      debug.push(`auto custs found: ${autoCusts?.length || 0}, err: ${e2 || 'none'}`);

      if (autoCusts && autoCusts.length > 0) {
        for (const cust of autoCusts) {
          const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', cust.id);
          if (!error) deletedCustomers++;
          else debug.push(`Failed to delete cust ${cust.id}: ${String(error)}`);
        }
      }
      debug.push(`custs deleted: ${deletedCustomers}`);

      return res.status(200).json({
        ok: true,
        deleted_customers: deletedCustomers,
        deleted_messages: deletedMessages,
        green_queue_cleared: clearedGreenQueue,
        debug,
      });
    } catch (err: any) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }

  // ============ CUSTOMER ANALYSIS ============
  // AI 分析客户
  if (action === 'analyze' || action === 'customer-analysis') {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
      let customerData = data;
      if (!customerData && req.body) {
        customerData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }

      if (!customerData) {
        return res.status(400).json({ ok: false, error: '缺少客户数据' });
      }

      // 如果没有 AI API Key，使用本地分析
      if (!AI_API_KEY) {
        return res.status(200).json({
          ok: true,
          analysis: localAnalysis(customerData),
          source: 'local',
        });
      }

      // 调用 DeepSeek AI 分析
      const customerInfo = JSON.stringify({
        company: customerData.company_name || '',
        contact: customerData.contact_name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        country: customerData.country || '',
        website: customerData.website || '',
        notes: customerData.notes || '',
        status: customerData.status || '',
        tags: customerData.tags || [],
      });

      const systemPrompt = `你是一个专业的外贸销售顾问，擅长分析客户并给出攻单建议。请根据以下客户信息，生成一份简洁的分析报告，包含：
1. 客户评级（A/B/C/D级）
2. 成交可能性评估（0-100分）
3. 关键优势
4. 风险因素
5. 推荐跟进动作（2-3条）
6. 建议跟进时间

请用中文回复，格式为 JSON 对象，包含以下字段：
- customerTier: A/B/C/D
- conversionRate: 0-100
- confidence: high/medium/low
- strengths: string[]
- riskFactors: string[]
- recommendedActions: {icon: string, title: string, detail: string, priority: string}[]
- nextFollowUpDays: number`;

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
            { role: 'user', content: `请分析以下客户：\n${customerInfo}` },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error:', errorText);
        return res.status(200).json({
          ok: true,
          analysis: localAnalysis(customerData),
          source: 'local',
          error: 'AI API 调用失败，使用本地分析',
        });
      }

      const aiData = await response.json();
      let analysisResult = localAnalysis(customerData); // 默认使用本地分析

      if (aiData.choices && aiData.choices.length > 0) {
        const aiContent = aiData.choices[0].message.content;
        try {
          // 尝试解析 JSON
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            analysisResult = {
              customerTier: parsed.customerTier || 'C',
              conversionRate: parsed.conversionRate || 50,
              confidence: parsed.confidence || 'medium',
              strengths: parsed.strengths || [],
              riskFactors: parsed.riskFactors || [],
              recommendedActions: parsed.recommendedActions || [],
              nextFollowUpDays: parsed.nextFollowUpDays || 7,
            };
          }
        } catch {
          // 解析失败，使用本地分析
        }
      }

      return res.status(200).json({
        ok: true,
        analysis: analysisResult,
        source: 'ai',
      });
    } catch (err: any) {
      console.error('Customer analysis error:', err);
      return res.status(200).json({
        ok: true,
        analysis: localAnalysis(data || {}),
        source: 'local',
        error: String(err),
      });
    }
  }

  // ============ CLIENT RESEARCH ============
  // AI 客户一键背调（永久可用：AI + 本地回退双保险）
  if (action === 'research' || action === 'client-research') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
      let customerData = data;
      if (!customerData && req.body) {
        customerData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      }
      if (!customerData) {
        return res.status(400).json({ ok: false, error: '缺少客户数据' });
      }

      // 如果没有 AI API Key，直接使用本地分析
      if (!AI_API_KEY) {
        return res.status(200).json({
          ok: true,
          report: localResearch(customerData),
          source: 'local',
        });
      }

      // 调用 AI 进行背调
      const customerInfo = JSON.stringify({
        company_name: customerData.company_name || '',
        website: customerData.website || '',
        country: customerData.country || '',
        contact_name: customerData.contact_name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        notes: customerData.notes || '',
        industry: customerData.industry || '',
      });

      const systemPrompt = `你是一位资深外贸客户调研专家。请根据客户信息生成一份专业的背调报告，格式为 JSON。

报告需要包含以下字段：
{
  "company_type": "公司类型（如：制造商/分销商/批发商/工程商等）",
  "scale": "规模（如：小型/中型/大型）",
  "industry": "行业定位",
  "main_business": "主营业务（一句话概述）",
  "pitch_hook": "建议的破冰切入点（一句话，20字以内）",
  "match_level": "high/medium/low",
  "risk_level": "low/medium/high",
  "match_score": 0-100,
  "confidence": "high/medium/low",
  "decision_makers": [
    {"title": "职位名称", "department": "部门"}
  ],
  "strengths": ["优势1", "优势2"],
  "risk_factors": ["风险1", "风险2"],
  "ai_pitch_strategy": "AI 破冰策略（详细说明如何切入）",
  "tags": ["标签1", "标签2"],
  "estimated_budget": "预算估算（如：$10k-$50k/年）",
  "timeline": "采购周期预期"
}

请基于外贸行业知识和客户背景进行合理推断。`;

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
            { role: 'user', content: `请对以下客户进行背调分析：\n${customerInfo}` },
          ],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Research AI API error:', errorText);
        // AI 失败时使用本地分析，确保永久可用
        return res.status(200).json({
          ok: true,
          report: localResearch(customerData),
          source: 'local',
          note: 'AI 暂时不可用，已使用本地分析',
        });
      }

      const aiData = await response.json();
      let report = localResearch(customerData);

      if (aiData.choices && aiData.choices.length > 0) {
        const aiContent = aiData.choices[0].message.content;
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            report = {
              company_type: parsed.company_type || report.company_type,
              scale: parsed.scale || report.scale,
              industry: parsed.industry || customerData.industry || '外贸行业',
              main_business: parsed.main_business || report.main_business,
              key_match_products: parsed.key_match_products || report.key_match_products,
              risk_assessment: parsed.risk_assessment || report.risk_assessment,
              pitch_hook: parsed.pitch_hook || report.pitch_hook,
              matching_point: parsed.matching_point || report.matching_point,
              match_level: parsed.match_level || report.match_level,
              risk_level: parsed.risk_level || report.risk_level,
              match_score: parsed.match_score ?? report.match_score,
              confidence: parsed.confidence || report.confidence,
              decision_makers: parsed.decision_makers || report.decision_makers,
              strengths: parsed.strengths || report.strengths,
              risk_factors: parsed.risk_factors || report.risk_factors,
              ai_pitch_strategy: parsed.ai_pitch_strategy || report.ai_pitch_strategy,
              tags: parsed.tags || report.tags,
              estimated_budget: parsed.estimated_budget || report.estimated_budget,
              timeline: parsed.timeline || report.timeline,
              generated_at: parsed.generated_at || new Date().toISOString(),
            };
          }
        } catch {
          // 解析失败，使用本地报告
        }
      }

      return res.status(200).json({
        ok: true,
        report,
        source: 'ai',
      });
    } catch (err: any) {
      console.error('Research error:', err);
      // 出错时使用本地分析，确保永久可用
      return res.status(200).json({
        ok: true,
        report: localResearch(data || {}),
        source: 'local',
        note: '使用本地分析作为备份',
      });
    }
  }

  return res.status(400).json({ error: 'Unknown action' });
}

// 本地分析函数（当 AI 不可用时使用）
function localAnalysis(customer: any) {
  let score = 50;
  const riskFactors: string[] = [];
  const strengths: string[] = [];
  const recommendedActions: { icon: string; title: string; detail: string; priority: string }[] = [];

  // 状态评分
  const status = customer.status || '';
  if (status === 'active') { score += 30; strengths.push('已建立合作关系'); }
  else if (status === 'negotiating') { score += 15; strengths.push('正在积极谈判中'); }
  else if (status === 'inactive') { score -= 20; riskFactors.push('客户处于不活跃状态'); }

  // 数据完整性
  const fields = [customer.contact_name, customer.email, customer.phone, customer.country, customer.address, customer.website];
  const completeness = fields.filter(Boolean).length;
  score += completeness * 3;
  if (completeness >= 5) strengths.push('客户信息完整');
  if (completeness <= 2) riskFactors.push('客户资料不完整');

  // 国家市场
  const highValueMarkets = ['USA', 'United States', '美国', 'Germany', '德国', 'UK', '英国', 'Japan', '日本', 'Australia', '加拿大'];
  if (customer.country) {
    if (highValueMarkets.some(m => customer.country.toLowerCase().includes(m.toLowerCase()))) {
      score += 10;
      strengths.push(`${customer.country}属于高价值市场`);
    }
  }

  // 备注长度
  if (customer.notes && customer.notes.length > 50) {
    score += 5;
    strengths.push('有详细的沟通记录');
  }

  // 评分限制
  score = Math.max(0, Math.min(100, score));

  // 客户等级
  let tier = 'D';
  if (score >= 80) tier = 'A';
  else if (score >= 60) tier = 'B';
  else if (score >= 40) tier = 'C';

  // 推荐动作
  if (status === 'prospect') {
    recommendedActions.push({ icon: 'MessageSquare', title: '建立初次联系', detail: '通过 WhatsApp 或邮件发送问候，介绍公司和产品', priority: 'high' });
  }
  if (status === 'negotiating') {
    recommendedActions.push({ icon: 'Zap', title: '提供报价方案', detail: '制作正式报价单，包含 MOQ 和交期信息', priority: 'high' });
  }
  if (status === 'active') {
    recommendedActions.push({ icon: 'CheckCircle', title: '维护客户关系', detail: '定期发送新品推荐和节日问候', priority: 'medium' });
  }
  if (status === 'inactive') {
    recommendedActions.push({ icon: 'TrendingUp', title: '客户唤醒计划', detail: '发送唤醒邮件，告知最新促销活动', priority: 'medium' });
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push({ icon: 'Calendar', title: '安排定期回访', detail: '保持客户热度，定期更新跟进记录', priority: 'medium' });
  }

  return {
    customerTier: tier,
    conversionRate: score,
    confidence: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
    strengths,
    riskFactors,
    recommendedActions: recommendedActions.slice(0, 4),
    nextFollowUpDays: score >= 60 ? 3 : 7,
  };
}

// 本地背调函数（AI 不可用时使用，确保永久可用）
function localResearch(customer: any) {
  const companyName = customer.company_name || '该客户';
  const website = customer.website || '';
  const country = customer.country || '';
  const notes = customer.notes || '';
  const email = customer.email || '';
  const phone = customer.phone || '';

  // 基础推断
  let companyType = '外贸采购商';
  let scale = '中型';
  let matchLevel = 'medium';
  let riskLevel = 'low';
  let matchScore = 55;
  let confidence = 'medium';

  // 根据信息丰富度调整
  const infoScore = [companyName, website, country, email, phone].filter(Boolean).length;
  if (infoScore >= 4) { matchScore += 20; confidence = 'high'; scale = '中型'; }
  if (infoScore <= 1) { matchScore -= 10; confidence = 'low'; riskLevel = 'medium'; scale = '小型'; }

  // 根据备注关键词判断
  if (notes.includes('大型') || notes.includes('集团') || notes.includes('Group')) {
    scale = '大型';
    matchScore += 15;
    companyType = '企业集团';
  }
  if (notes.includes('制造商') || notes.includes('工厂') || notes.includes('Factory')) {
    companyType = '制造商';
    matchScore += 10;
  }
  if (notes.includes('贸易') || notes.includes('贸易商') || notes.includes('Trading')) {
    companyType = '贸易商/分销商';
  }
  if (notes.includes('电商') || notes.includes('电商平台') || notes.includes('Amazon')) {
    companyType = '跨境电商';
    matchLevel = 'high';
    matchScore += 10;
  }

  // 根据国家判断市场价值
  const highValueMarkets = ['USA', 'United States', '美国', 'Germany', '德国', 'UK', '英国', 'Japan', '日本', 'Australia', 'Canada', '加拿大', 'Netherlands', '荷兰'];
  if (highValueMarkets.some(m => country.toLowerCase().includes(m.toLowerCase()))) {
    matchScore += 10;
    matchLevel = matchScore >= 70 ? 'high' : matchLevel;
  }

  // 根据邮件判断
  if (email.includes('@gmail') || email.includes('@outlook')) {
    // 个人邮箱，可能是小型客户或个人买家
    if (scale === '中型') scale = '中小型';
  } else if (email && !email.includes('@gmail') && !email.includes('@outlook') && !email.includes('@qq') && !email.includes('@163')) {
    // 企业邮箱，更可信
    matchScore += 5;
    if (confidence === 'medium') confidence = 'high';
  }

  matchScore = Math.max(20, Math.min(95, matchScore));

  if (matchScore >= 70) { matchLevel = 'high'; riskLevel = 'low'; }
  else if (matchScore >= 40) { matchLevel = 'medium'; riskLevel = 'medium'; }
  else { matchLevel = 'low'; riskLevel = 'high'; }

  const strengths: string[] = [];
  const riskFactors: string[] = [];
  const tags: string[] = [];

  if (matchLevel === 'high') {
    strengths.push('客户信息完整度高', '目标市场明确', '有明确采购意向');
  } else if (matchLevel === 'medium') {
    strengths.push('有初步合作意向', '具备基本信息');
  } else {
    riskFactors.push('客户信息不完整', '需要进一步核实身份');
  }

  if (country) {
    tags.push(country);
    const highValue = ['美国', '德国', '英国', '日本', 'Australia', 'Canada'];
    if (highValue.some(m => country.toLowerCase().includes(m.toLowerCase()))) {
      tags.push('高价值市场');
    }
  }

  const decisionMakers = [
    { title: '采购经理 / Procurement Manager', department: '采购部' },
    { title: '供应链经理 / Supply Chain Manager', department: '供应链管理部' },
    { title: 'Operations Director / 运营总监', department: '运营部' },
  ];

  // 根据行业推断的行业定位
  let industry = '工业品采购';
  if (companyType === '制造商') industry = '制造业 / OEM 采购';
  if (companyType === '跨境电商') industry = '跨境零售电商';
  if (companyType === '贸易商') industry = '国际贸易批发分销';

  const mainBusiness = `${companyName} 从事${industry}业务，主要采购工业设备及相关产品`;
  const keyMatchProducts = ['工业设备采购', '零部件供应', '定制化需求'];

  const pitchHook = matchLevel === 'high'
    ? `关于${industry}采购需求的专业解决方案`
    : `专业的${industry}合作伙伴`;

  const matchingPoint = `${companyName}在${industry}领域有明确需求，与 KIKI TECH 的产品定位高度契合`;

  const aiPitchStrategy = `建议以【行业解决方案】为切入点，重点展示 KIKI TECH 在${industry}领域的成熟案例和技术优势。${matchLevel === 'high' ? '客户信息完整，可直接发送定制化方案。' : '建议先进行初步接触，了解客户具体需求后再推进。'}`;

  const riskAssessment = riskLevel === 'low'
    ? '风险较低，客户信息完整，有明确合作意向'
    : riskLevel === 'medium'
      ? '中等风险，建议进一步核实客户身份和采购需求'
      : '风险较高，客户信息不完整，需谨慎推进';

  const estimatedBudget = matchScore >= 70 ? '$50k-$200k/年' : matchScore >= 40 ? '$10k-$50k/年' : '待评估';
  const timeline = matchLevel === 'high' ? '已有明确采购计划，3-6个月周期' : '处于调研阶段，6-12个月周期';

  return {
    company_type: companyType,
    scale,
    industry,
    main_business: mainBusiness,
    key_match_products: keyMatchProducts,
    risk_assessment: riskAssessment,
    ai_pitch_strategy: aiPitchStrategy,
    tags,
    match_level: matchLevel,
    risk_level: riskLevel,
    match_score: matchScore,
    confidence,
    decision_makers: decisionMakers,
    strengths,
    risk_factors: riskFactors,
    pitch_hook: pitchHook,
    matching_point: matchingPoint,
    estimated_budget: estimatedBudget,
    timeline,
    generated_at: new Date().toISOString(),
  };
}