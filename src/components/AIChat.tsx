import { useState, useRef, useEffect } from 'react';
import {
  Send, Sparkles, Phone, MoreVertical, Search,
  Paperclip, Smile, Mic, CheckCheck, Copy,
  RefreshCw, ExternalLink,
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

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    phone: '16505558385',
    lastMessage: 'Great! When can you ship?',
    lastTime: new Date().toISOString(),
    sender: 'customer',
    customer: {
      id: 'demo1', company_name: 'Saudi Renewable Energy Co.',
      contact_name: 'Ahmed Al-Rashid', phone: '+1 (650) 555-8385',
      country: 'Saudi Arabia', status: 'active', notes: '风电设备询盘'
    },
  },
  {
    phone: '5215512345678',
    lastMessage: 'Hola, ¿pueden enviar catálogo?',
    lastTime: new Date().toISOString(),
    sender: 'customer',
    customer: {
      id: 'demo2', company_name: 'SolarTech LATAM',
      contact_name: 'Carlos Mendoza', phone: '+52 55 1234 5678',
      country: 'Mexico', status: 'active', notes: '光伏储能'
    },
  },
];

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
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载会话列表
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/whatsapp-fetch');
      const data = await res.json();

      if (data.conversations && data.conversations.length > 0) {
        setConversations(data.conversations);
        setConnected(true);
      } else {
        setConversations(DEMO_CONVERSATIONS);
        setConnected(false);
      }
    } catch {
      setConversations(DEMO_CONVERSATIONS);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
    // 每 15 秒轮询一次
    const interval = setInterval(loadConversations, 15000);
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
        setMessages(getDemoMessages(phone));
      }
    } catch {
      setMessages(getDemoMessages(phone));
    }
  };

  useEffect(() => {
    if (selectedPhone) {
      setMessages([]);
      setAiReplies([]);
      loadMessages(selectedPhone);
    }
  }, [selectedPhone]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversation = conversations.find(c => c.phone === selectedPhone);

  // 发送消息
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

    // 通过真实 WhatsApp API 发送
    try {
      const res = await fetch('/api/whatsapp-send', {
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
            WhatsApp 智能客服
          </h2>
          <p className="text-sm text-[#78716C] mt-0.5">
            {connected ? '已连接 WhatsApp Cloud API · 实时收发消息' : '演示模式 · API 未连接'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {connected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
              WhatsApp 已连接
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF3E0] text-[#E65100] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9800]" />
              演示模式
            </span>
          )}
          <button
            onClick={loadConversations}
            className="p-1.5 rounded-lg hover:bg-[#F2EBDC] text-[#78716C] transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 主聊天区域 */}
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
              <div className="p-4 text-center text-sm text-[#78716C]">暂无会话</div>
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
                    {connected ? 'WhatsApp 实时消息' : '演示消息'}
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
                              title="发送到 WhatsApp"
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
                      placeholder={connected ? '输入消息... 将通过 WhatsApp 发送' : '输入消息...（演示模式）'}
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
                  <MessageCircleIcon className="w-8 h-8 text-[#78716C]" />
                </div>
                <p className="text-sm">选择一个会话开始对话</p>
                {!connected && (
                  <p className="text-xs mt-2 text-[#78716C]/70">
                    连接 WhatsApp 后可接收真实客户消息
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Demo 消息（API 未连接时使用）
function getDemoMessages(phone: string): ChatMessage[] {
  if (phone.includes('6505558385')) {
    return [
      { id: '1', role: 'customer', text: 'Hi, I am interested in your 100kW wind turbine. Can you send me the specifications and price?', time: '10:30' },
      { id: '2', role: 'me', text: 'Hello! Thank you for your interest. Let me prepare the detailed spec sheet and quotation.', time: '10:32' },
      { id: '3', role: 'customer', text: 'Great! Also, what is the MOQ and delivery time to Saudi Arabia?', time: '10:35' },
    ];
  }
  return [
    { id: '1', role: 'customer', text: 'Hola, vi su catálogo. ¿Tienen disponibilidad para 500 paneles solares?', time: '09:15' },
    { id: '2', role: 'me', text: 'Hola! Sí, tenemos stock disponible. ¿Podría confirmarme el modelo exacto?', time: '09:20' },
  ];
}

function MessageCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" style={{ width: '1em', height: '1em' }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}
