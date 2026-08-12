// Green-API 状态检查 + 二维码获取接口
// 前端调用此接口检查 WhatsApp 连接状态，获取二维码

const GREEN_API_ID = process.env.GREEN_API_ID_INSTANCE || '';
const GREEN_API_TOKEN = process.env.GREEN_API_TOKEN_INSTANCE || '';
const GREEN_API_BASE = 'https://api.green-api.com';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!GREEN_API_ID || !GREEN_API_TOKEN) {
    return res.status(200).json({
      connected: false,
      configured: false,
      message: 'Green-API 凭据未配置',
    });
  }

  try {
    // 1. 检查连接状态
    const stateResponse = await fetch(
      `${GREEN_API_BASE}/waInstance${GREEN_API_ID}/getStateInstance/${GREEN_API_TOKEN}`
    );

    if (!stateResponse.ok) {
      return res.status(200).json({
        connected: false,
        configured: true,
        error: `Green-API 状态检查失败: ${stateResponse.status}`,
      });
    }

    const stateData = await stateResponse.json();
    const state = stateData.stateInstance;

    // stateInstance 可能的值:
    // authorized - 已授权（正常连接）
    // notAuthorized - 未授权（需要扫码）
    // blocked - 被封
    // starting - 启动中
    // quect - 等待队列

    const isConnected = state === 'authorized';

    if (isConnected) {
      return res.status(200).json({
        connected: true,
        configured: true,
        state: state,
        message: 'WhatsApp 已连接',
      });
    }

    // 2. 如果未连接，获取二维码
    if (state === 'notAuthorized') {
      const qrResponse = await fetch(
        `${GREEN_API_BASE}/waInstance${GREEN_API_ID}/qr/${GREEN_API_TOKEN}`
      );

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();

        if (qrData.type === 'qrCode') {
          return res.status(200).json({
            connected: false,
            configured: true,
            state: state,
            qrCode: qrData.message, // base64 图片
            message: '请扫描二维码登录 WhatsApp',
          });
        } else if (qrData.type === 'alreadyLogged') {
          return res.status(200).json({
            connected: true,
            configured: true,
            state: 'authorized',
            message: 'WhatsApp 已连接',
          });
        } else {
          return res.status(200).json({
            connected: false,
            configured: true,
            state: state,
            qrError: qrData.message,
            message: '获取二维码失败: ' + qrData.message,
          });
        }
      }
    }

    return res.status(200).json({
      connected: false,
      configured: true,
      state: state,
      message: `状态: ${state}`,
    });
  } catch (error: any) {
    console.error('[QR-Status] 错误:', error);
    return res.status(200).json({
      connected: false,
      configured: true,
      error: error.message || '检查状态失败',
    });
  }
}
