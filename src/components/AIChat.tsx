import { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, Phone, MoreVertical, Search,
  Paperclip, Smile, CheckCheck, Copy,
  RefreshCw, ExternalLink, Zap, QrCode, Loader2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'customer' | 'me';
  text: string;
  time: string;
}

interface Conversation {
  phone: string;
  lastMessage: string;
  lastTime: string;
  sender: 'customer' | 'me';
  customer: {
    id: string;
    company_name: string;
    contact_name: string;
    phone: string;
    country: string;
    status: string;
    notes: string;
  };
}

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatPhoneDisplay(phone: string) {
  if (!phone) return '';
  const clean = phone.replace(/[+\s-]/g, '');
  if (clean.length === 11 && clean.startsWith('86')) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 8)} ${clean.slice(8)}`;
  }
  return phone;
}

export function AIChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoReply, setAutoReply] = useState(true);

  // 网关连接状态
  const [connected, setConnected] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<string>('');
  const [checkingStatus, setCheckingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检查网关连接状态 + 获取二维码
  const checkGatewayStatus = async () => {
    setCheckingStatus(true);
    try {
      const res = await fetch('/api/whatsapp/qr-status');
      const data = await res.json();

      if (data.connected) {
        setConnected(true);
        setQrCode(null);
        setGatewayStatus('已连接');
      } else {
        setConnected(false);
        if (data.qrCode) {
          setQrCode(data.qrCode);
          setGatewayStatus('请扫码登录');
        } else {
          setQrCode(null);
          setGatewayStatus(data.message || data.state || '未连接');
        }
      }
    } catch {
      setConnected(false);
      setGatewayStatus('检查失败');
    } finally {
      setCheckingStatus(false);
    }
  };

  // 加载会话列表
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/whatsapp-fetch');
      const data = await res.json();

      if (data.conversations && data.conversations.length > 0) {
        setConversations(data.conversations);
      } else {
        setConversations([]);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkGatewayStatus();
    loadConversations();
    const interval = setInterval(() => {
      checkGatewayStatus();
      loadConversations();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // 加载选中会话的历史消息
  const loadMessages = async (phone: string) => {
    try {
      const formattedPhone = phone.replace(/[+\s-]/g, '');
      const res = await fetch(`/api/whatsapp-fetch?phone=${encodeURIComponent(formattedPhone)}`);
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        const chatMsgs: ChatMessage[] = data.messages.map((m: any) => ({
          id: m.id || `${m.wam_id || ''}_${Date.now()}`,
          role: m.sender === 'customer' ? 'customer' : 'me',
          text: m.text,
          time: formatTime(m.received_at),
        }));
        setMessages(chatMsgs);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (selectedPhone) {
      setMessages([]);
      setAiReplies([]);
      loadMessages(selectedPhone);
      const interval = setInterval(() => loadMessages(selectedPhone), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversation = conversations.find(c => c.phone === selectedPhone);

  // 发送消息（通过 Green-API）
  const sendMessage = async (text: string) => {
    if (!text.trim() || !selectedPhone) return;

    setSending(true);
    const now = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'me',
      text: text.trim(),
      time: now,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setAiReplies([]);

    try {
      const res = await fetch('/api/whatsapp/qr-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: selectedPhone, text: text.trim() }),
      });
      const data = await res.json();

      if (!data.ok && !data.simulated) {
        alert('发送失败：' + (data.error || '未知错误'));
      }
    } catch {
      alert('网络错误，发送失败');
    } finally {
      setSending(false);
    }
  };

  // AI 生成回复建议
  const generateAiReplies = async () => {
    if (messages.length === 0) return;
    setGenerating(true);
    setAiReplies([]);

    const customerName = selectedConversation?.customer.contact_name ||
      selectedConversation?.customer.company_name || 'Customer';
    const customerCompany = selectedConversation?.customer.company_name;
    const customerCountry = selectedConversation?.customer.country;

    try {
      const res = await fetch('/api/whatsapp-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_company: customerCompany,
          customer_country: customerCountry,
          messages: messages.map(m => ({ role: m.role, text: m.text, time: m.time })),
        }),
      });
      const data = await res.json();
      if (data.replies) setAiReplies(data.replies);
    } catch {
      setAiReplies(['AI 生成失败，请手动输入回复。']);
    } finally {
      setGenerating(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openWhatsApp = (phone: string, text?: string) => {
    const cleanPhone = phone.replace(/[+\s-]/g, '');
    const url = text
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank');
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.customer.company_name?.toLowerCase().includes(q) ||
           c.customer.contact_name?.toLowerCase().includes(q) ||
           c.customer.country?.toLowerCase().includes(q) ||
           c.phone.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#2D2A26] flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#7BA369]" />
            WhatsApp 智能客服
          </h2>
          <p className="text-sm text-[#78716C] mt-0.5">
            {connected ? '已连接 WhatsApp · 实时收发消息 · AI 自动回复' : '扫码连接 WhatsApp · Green-API 网关'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoReply(!autoReply)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              autoReply ? 'bg-[#E8F5E9] text-[#2E7D32]' : 'bg-[#F2EBDC] text-[#78716C]'
            }`}
            title="AI 自动回复开关"
          >
            <Zap className={`w-3.5 h-3.5 ${autoReply ? 'text-[#7BA369]' : ''}`} />
            自动回复 {autoReply ? 'ON' : 'OFF'}
          </button>

          {connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
              WhatsApp 已连接
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF3E0] text-[#E65100] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9800]" />
              未连接
            </span>
          )}
          <button
            onClick={checkGatewayStatus}
            className="p-1.5 rounded-lg hover:bg-[#F2EBDC] text-[#78716C] transition-colors"
            title="刷新状态"
          >
            <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 二维码登录区域（未连接时显示） */}
      {!connected && qrCode && (
        <div className="rounded-2xl border border-[#E8E2D5] bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-serif font-bold text-[#2D2A26]">扫码连接 WhatsApp</h3>
            <p className="text-sm text-[#78716C] text-center max-w-md">
              打开手机 WhatsApp → 设置 → 关联设备 → 扫描下方二维码
            </p>
            <div className="p-4 bg-white rounded-xl border-2 border-[#7BA369]/30 shadow-lg">
              <img
                src={`data:image/png;base64, ${qrCode}`}
                alt="WhatsApp QR Code"
                className="w-64 h-64"
              />
            </div>
            <p className="text-xs text-[#78716C]">
              二维码每 20 秒刷新，扫码后自动连接
            </p>
            <button
              onClick={checkGatewayStatus}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7BA369] hover:bg-[#5C8A4A] text-white text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
              刷新二维码
            </button>
          </div>
        </div>
      )}

      {/* 未配置提示 */}
      {!connected && !qrCode && (
        <div className="rounded-2xl border border-[#E8E2D5] bg-[#FAF7F2] p-6 text-center">
          <Loader2 className="w-6 h-6 mx-auto mb-2 text-[#78716C] animate-spin" />
          <p className="text-sm text-[#78716C]">{gatewayStatus || '正在检查连接状态...'}</p>
          <p className="text-xs text-[#78716C]/70 mt-2">
            需要在 Vercel 配置 GREEN_API_ID_INSTANCE 和 GREEN_API_TOKEN_INSTANCE 环境变量
          </p>
        </div>
      )}

      {/* 主聊天区域（已连接时显示） */}
      {connected && (
        <div className="flex rounded-2xl overflow-hidden border border-[#E8E2D5] bg-white shadow-sm" style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
          {/* 左侧：会话列表 */}
          <div className="w-64 shrink-0 border-r border-[#E8E2D5] flex flex-col bg-[#FAF7F2]">
            <div className="p-3 border-b border-[#E8E2D5]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#78716C]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索客户..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E8E2D5] rounded-lg focus:outline-none focus:border-[#7BA369] transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-[#78716C]">加载中...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <QrCode className="w-10 h-10 mx-auto mb-2 text-[#E8E2D5]" />
                  <p className="text-sm text-[#78716C]">暂无会话</p>
                  <p className="text-xs text-[#78716C]/70 mt-1">
                    客户给您发 WhatsApp 消息后将自动显示
                  </p>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const isSelected = conv.phone === selectedPhone;
                  const initial = conv.customer.contact_name?.charAt(0) ||
                    conv.customer.company_name?.charAt(0) || '?';
                  const timeStr = conv.lastTime ? formatTime(conv.lastTime) : '';
                  const isCustomerMsg = conv.sender === 'customer';

                  return (
                    <button
                      key={conv.phone}
                      onClick={() => setSelectedPhone(conv.phone)}
                      className={`w-full flex items-start gap-3 px-3 py-3 border-b border-[#E8E2D5]/50 transition-colors text-left ${
                        isSelected ? 'bg-[#7BA369]/10 border-l-2 border-l-[#7BA369]' : 'hover:bg-[#F2EBDC]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-medium ${
                        isSelected ? 'bg-[#7BA369] text-white' : 'bg-[#E8E2D5] text-[#5C5246]'
                      }`}>
                        {initial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-medium text-[#2D2A26] truncate">
                            {conv.customer.contact_name || conv.customer.company_name}
                          </span>
                          <span className="text-[10px] text-[#78716C] shrink-0">{timeStr}</span>
                        </div>
                        <p className="text-xs text-[#78716C] truncate mt-0.5">{conv.customer.company_name}</p>
                        <p className={`text-xs truncate mt-0.5 ${isCustomerMsg ? 'text-[#5C5246]' : 'text-[#7BA369]'}`}>
                          {conv.lastMessage}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 中央：聊天窗口 */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedConversation ? (
              <>
                {/* 顶部栏 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E2D5] bg-white">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#7BA369] text-white flex items-center justify-center text-sm font-medium shrink-0">
                      {selectedConversation.customer.contact_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#2D2A26] truncate">
                        {selectedConversation.customer.contact_name || selectedConversation.customer.company_name}
                      </p>
                      <p className="text-xs text-[#78716C] truncate">
                        {formatPhoneDisplay(selectedConversation.phone)} · {selectedConversation.customer.country}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openWhatsApp(selectedConversation.phone)}
                      title="在 WhatsApp 中打开"
                      className="p-2 rounded-lg hover:bg-[#F2EBDC] text-[#78716C] hover:text-[#25D366] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-[#F2EBDC] text-[#78716C] transition-colors">
                      <Phone className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-[#F2EBDC] text-[#78716C] transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 消息区 */}
                <div
                  className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                  style={{
                    backgroundColor: '#E5DDD5',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                >
                  <div className="flex justify-center">
                    <span className="px-3 py-1 rounded-full bg-white/80 text-xs text-[#78716C] shadow-sm">
                      WhatsApp 实时消息 · Green-API
                    </span>
                  </div>

                  {messages.length === 0 && (
                    <div className="text-center py-8 text-sm text-[#78716C]">暂无消息记录</div>
                  )}

                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg shadow-sm ${
                        msg.role === 'me' ? 'bg-[#DCF8C6] rounded-tr-none' : 'bg-white rounded-tl-none'
                      }`}>
                        <div className="px-3 py-2">
                          <p className="text-sm text-[#2D2A26] whitespace-pre-wrap break-words">{msg.text}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="text-[10px] text-[#78716C]">{msg.time}</span>
                            {msg.role === 'me' && <CheckCheck className="w-3 h-3 text-[#4FC3F7]" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* AI 回复建议面板 */}
                {(aiReplies.length > 0 || generating) && (
                  <div className="border-t border-[#E8E2D5] bg-[#F7F3EB] px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#5C5246]">
                        <Sparkles className="w-3.5 h-3.5 text-[#7BA369]" />
                        AI 智能回复建议
                      </span>
                      <button onClick={() => setAiReplies([])} className="text-xs text-[#78716C] hover:text-[#2D2A26]">
                        收起
                      </button>
                    </div>
                    {generating ? (
                      <div className="flex items-center gap-2 py-2 text-sm text-[#78716C]">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#7BA369]" />
                        AI 分析中...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {aiReplies.map((reply, i) => (
                          <div key={i} className="group flex items-start gap-2 p-2.5 rounded-lg bg-white border border-[#E8E2D5] hover:border-[#7BA369] transition-colors">
                            <span className="text-[10px] font-mono text-[#78716C] mt-0.5 shrink-0">#{i + 1}</span>
                            <p className="flex-1 text-sm text-[#2D2A26] whitespace-pre-wrap">{reply}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => copyText(reply)} title="复制" className="p-1 rounded hover:bg-[#F2EBDC] text-[#78716C]">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => sendMessage(reply)}
                                title="通过 Green-API 发送"
                                className="p-1 rounded hover:bg-[#E8F5E9] text-[#7BA369]"
                                disabled={sending}
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openWhatsApp(selectedConversation.phone, reply)}
                                title="在 WhatsApp 中打开"
                                className="p-1 rounded hover:bg-[#F2EBDC] text-[#25D366]"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 输入栏 */}
                <div className="border-t border-[#E8E2D5] bg-white px-4 py-3">
                  <div className="flex items-end gap-2">
                    <button className="p-2 rounded-full hover:bg-[#F2EBDC] text-[#78716C] shrink-0">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      onClick={generateAiReplies}
                      disabled={generating || messages.length === 0}
                      title="AI 生成回复建议"
                      className={`p-2 rounded-full shrink-0 transition-colors ${
                        generating ? 'bg-[#7BA369]/20 text-[#7BA369] animate-pulse' : 'hover:bg-[#E8F5E9] text-[#7BA369]'
                      } disabled:opacity-40`}
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputText); } }}
                        placeholder="输入消息... 通过 Green-API 发送"
                        className="w-full px-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#E8E2D5] rounded-full focus:outline-none focus:border-[#7BA369] transition-colors pr-10"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#E8E2D5] text-[#78716C]">
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={() => sendMessage(inputText)}
                      disabled={sending || !inputText.trim()}
                      className={`p-2.5 rounded-full transition-colors shrink-0 ${
                        sending ? 'bg-[#78716C]' : 'bg-[#7BA369] hover:bg-[#5C8A4A]'
                      } text-white disabled:opacity-50`}
                    >
                      {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#78716C]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#E8E2D5] flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-[#78716C]" />
                  </div>
                  <p className="text-sm">选择一个会话开始对话</p>
                  {autoReply && (
                    <p className="text-xs mt-2 text-[#7BA369]">
                      AI 自动回复已开启 · 客户消息将自动回复
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
