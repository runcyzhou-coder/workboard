// WhatsApp Cloud API - 发送消息
// 文档: https://developers.facebook.com/docs/whatsapp-cloudapi/messages/send-text

interface SendRequest {
  to: string;          // 接收方手机号 (国际格式，如 8613800138000)
  text: string;        // 消息内容
  customer_name?: string;
  message_type?: 'text' | 'template';
  template_name?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, text, message_type = 'text' } = req.body as SendRequest;

  if (!to || !text) {
    return res.status(400).json({ error: 'to and text are required' });
  }

  const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    return res.status(200).json({
      ok: false,
      simulated: true,
      message: 'WhatsApp API not configured',
      sentText: text,
    });
  }

  // 手机号格式转换：去除 + 号
  let formattedPhone = to.replace(/[+\s-]/g, '');
  // 如果是中国大陆手机号，确保国家码为 86
  if (formattedPhone.startsWith('1') && formattedPhone.length === 11) {
    formattedPhone = '86' + formattedPhone;
  }

  try {
    let requestBody: any;

    if (message_type === 'template') {
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: req.body.template_name || 'hello_world',
          language: { code: req.body.template_language || 'en_US' },
        },
      };
    } else {
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.error('WhatsApp API error:', JSON.stringify(errData));

      const errMsg = errData?.error?.message || 'Failed to send';
      return res.status(200).json({
        ok: false,
        error: errMsg,
        details: errData,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      ok: true,
      message_id: data.messages?.[0]?.id,
      to: formattedPhone,
    });
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return res.status(200).json({
      ok: false,
      error: error.message || 'Send failed',
    });
  }
}
