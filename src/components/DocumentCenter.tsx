import { useState, useRef, useEffect } from 'react';
import {
  FileText, Receipt, Handshake, ClipboardCheck, Package2, Quote,
  Upload, ArrowLeft, Settings, Image as ImageIcon,
} from 'lucide-react';
import { useCompanySettings } from '@/lib/useCompanySettings';
import { supabase } from '@/lib/supabase';
import { classNames } from '@/lib/utils';
import { ProformaInvoices } from '@/components/documents/ProformaInvoices';
import { CommercialInvoices } from '@/components/documents/CommercialInvoices';
import { Contracts } from '@/components/documents/Contracts';
import { CustomsDeclarations } from '@/components/documents/CustomsDeclarations';
import { PackingLists } from '@/components/documents/PackingLists';
import { Quotations } from '@/components/documents/Quotations';

export type DocType = 'pi' | 'ci' | 'contract' | 'customs' | 'packing' | 'quotation';

interface DocumentCenterProps {
  initialDocType?: DocType;
  onConsumed?: () => void;
}

const docTypes: { id: DocType; label: string; englishLabel: string; icon: typeof FileText; color: string; description: string }[] = [
  { id: 'pi', label: '形式发票', englishLabel: 'Proforma Invoice', icon: FileText, color: 'from-[#6B21A8] to-[#4C1D95]', description: '向买方提供的预估发票，用于申请进口许可、外汇审批等' },
  { id: 'ci', label: '商业发票', englishLabel: 'Commercial Invoice', icon: Receipt, color: 'from-[#06B6D4] to-[#0E7490]', description: '正式结算凭证，用于报关、清关和付款' },
  { id: 'contract', label: '合同', englishLabel: 'Sales Contract', icon: Handshake, color: 'from-[#A855F7] to-[#6B21A8]', description: '买卖双方正式签订的销售合同，含交期、检验、仲裁等条款' },
  { id: 'customs', label: '报关信息', englishLabel: 'Customs Declaration', icon: ClipboardCheck, color: 'from-[#D8B4FE] to-[#A855F7]', description: '出口报关申报信息，含HS编码、毛净重、包装方式等' },
  { id: 'packing', label: '装箱单', englishLabel: 'Packing List', icon: Package2, color: 'from-[#F87171] to-[#A855F7]', description: '详细列明每箱货物的数量、重量、尺寸和体积' },
  { id: 'quotation', label: '报价单', englishLabel: 'Quotation', icon: Quote, color: 'from-[#06B6D4] to-[#0E7490]', description: '向客户发送的产品报价，含有效期和付款条件' },
];

export function DocumentCenter({ initialDocType, onConsumed }: DocumentCenterProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(initialDocType ?? null);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, loading, update, reload } = useCompanySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 当外部传入新的初始类型时（如从询盘生成后跳转），同步到内部状态
  useEffect(() => {
    if (initialDocType) {
      setSelectedDoc(initialDocType);
      onConsumed?.();
    }
  }, [initialDocType]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo文件不能超过2MB');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
      alert('请上传 PNG/JPG/SVG/WebP 格式的Logo');
      return;
    }

    // 优先尝试 Supabase Storage（需 bucket 已创建）
    const hasStorage = typeof (supabase as any).storage !== 'undefined';
    if (hasStorage) {
      try {
        const fileName = `logo-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
          await update({ logo_url: urlData.publicUrl });
          reload();
          return;
        }
        // 上传失败（通常是 bucket 不存在或 RLS 拒绝）→ 降级到 base64
        console.warn('Storage 上传失败，降级使用 base64：', uploadError.message);
      } catch (err: any) {
        console.warn('Storage 不可用，降级使用 base64：', err?.message);
      }
    }

    // 降级方案：转 base64 data URL 直接存数据库
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await update({ logo_url: dataUrl });
      reload();
    } catch (err) {
      alert('Logo 上传失败，请稍后重试');
    }
  }

  // If a document type is selected, render that document component
  if (selectedDoc) {
    const docInfo = docTypes.find(d => d.id === selectedDoc)!;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedDoc(null)} className="p-2 text-[#78716C] hover:text-[#B8AEC8] hover:bg-[#221A3A]/50 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#F3EFE6]">{docInfo.label}</h1>
              <p className="text-sm text-[#8879A0]">{docInfo.englishLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1B142C]/90 border border-[#3A2D54] text-[#F3EFE6] rounded-lg hover:bg-[#221A3A]/70 font-medium text-sm"
            >
              <Settings className="w-4 h-4" />公司设置
            </button>
          </div>
        </div>

        {selectedDoc === 'pi' && <ProformaInvoices />}
        {selectedDoc === 'ci' && <CommercialInvoices />}
        {selectedDoc === 'contract' && <Contracts />}
        {selectedDoc === 'customs' && <CustomsDeclarations />}
        {selectedDoc === 'packing' && <PackingLists />}
        {selectedDoc === 'quotation' && <Quotations />}

        {showSettings && (
          <CompanySettingsModal
            settings={settings}
            loading={loading}
            onClose={() => setShowSettings(false)}
            onSave={update}
            onLogoUpload={handleLogoUpload}
            fileInputRef={fileInputRef}
          />
        )}
      </div>
    );
  }

  // Document type selection grid
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F3EFE6]">单据中心</h1>
          <p className="text-[#8879A0] mt-1">选择单据类型，生成专业外贸单据</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1B142C]/90 border border-[#3A2D54] text-[#F3EFE6] rounded-lg hover:bg-[#221A3A]/70 font-medium text-sm"
        >
          <Settings className="w-4 h-4" />公司设置
        </button>
      </div>

      {/* Logo preview */}
      {settings?.logo_url && (
        <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-4 flex items-center gap-4">
          <img src={settings.logo_url} alt="Company Logo" className="h-12 w-auto object-contain" />
          <div>
            <p className="text-sm font-medium text-[#F3EFE6]">{settings.company_name}</p>
            <p className="text-xs text-[#8879A0]">当前Logo已应用到所有单据</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {docTypes.map(doc => {
          const Icon = doc.icon;
          return (
            <button
              key={doc.id}
              onClick={() => setSelectedDoc(doc.id)}
              className="group text-left bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md border border-[#3A2D54] p-6 hover:shadow-xl hover:border-[#3A2D54]/70 transition-all"
            >
              <div className={classNames('w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-105 transition-transform', doc.color)}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-[#F3EFE6] group-hover:text-[#06B6D4] transition-colors">{doc.label}</h3>
              <p className="text-xs text-[#78716C] font-medium mt-0.5">{doc.englishLabel}</p>
              <p className="text-sm text-[#8879A0] mt-2 leading-relaxed">{doc.description}</p>
            </button>
          );
        })}
      </div>

      {showSettings && (
        <CompanySettingsModal
          settings={settings}
          loading={loading}
          onClose={() => setShowSettings(false)}
          onSave={update}
          onLogoUpload={handleLogoUpload}
          fileInputRef={fileInputRef}
        />
      )}
    </div>
  );
}

interface CompanySettingsModalProps {
  settings: ReturnType<typeof useCompanySettings>['settings'];
  loading: boolean;
  onClose: () => void;
  onSave: (updates: Partial<NonNullable<ReturnType<typeof useCompanySettings>['settings']>>) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

function CompanySettingsModal({ settings, loading, onClose, onSave, onLogoUpload, fileInputRef }: CompanySettingsModalProps) {
  const [form, setForm] = useState({
    company_name: settings?.company_name || 'KIKI TECH',
    address: settings?.address || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
    website: settings?.website || '',
    tax_id: settings?.tax_id || '',
    bank_name: settings?.bank_name || '',
    bank_account: settings?.bank_account || '',
    swift_code: settings?.swift_code || '',
  });

  function save() {
    onSave(form);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1B142C]/90 rounded-xl intj-card intj-cut-corner intj-gem backdrop-blur-md max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3A2D54]/50 sticky top-0 bg-[#1B142C]/90">
          <h2 className="text-lg font-semibold text-[#F3EFE6]">公司设置</h2>
          <button onClick={onClose} className="text-[#78716C] hover:text-[#B8AEC8]">✕</button>
        </div>
        <div className="relative z-10 p-6 space-y-5">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-[#F3EFE6] mb-2">公司Logo</label>
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 w-16 object-contain border border-[#3A2D54] rounded-lg p-1" />
              ) : (
                <div className="h-16 w-16 border-2 border-dashed border-[#3A2D54]/70 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-[#78716C]" />
                </div>
              )}
              <div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onLogoUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6B21A8] to-[#4C1D95] text-[#F3EFE6] rounded-lg hover:bg-[#4C1D95] text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />上传Logo
                </button>
                <p className="text-xs text-[#78716C] mt-1.5">PNG/JPG/SVG/WebP, 最大2MB</p>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-[#78716C] py-4">加载中...</p>
          ) : (
            <>
              <Field label="公司名称">
                <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
              </Field>
              <Field label="地址">
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="电话">
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
                </Field>
                <Field label="邮箱">
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
                </Field>
              </div>
              <Field label="网站">
                <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
              </Field>
              <Field label="税号">
                <input value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="开户银行">
                  <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
                </Field>
                <Field label="银行账号">
                  <input value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })}
                    className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
                </Field>
              </div>
              <Field label="SWIFT Code">
                <input value={form.swift_code} onChange={e => setForm({ ...form, swift_code: e.target.value })}
                  className="w-full px-3 py-2 border border-[#3A2D54] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#06B6D4]" />
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#3A2D54] sticky bottom-0 bg-[#1B142C]/90">
          <button onClick={onClose} className="px-4 py-2 text-[#B8AEC8] hover:text-[#F3EFE6] font-medium text-sm">取消</button>
          <button onClick={save} className="px-4 py-2 bg-gradient-to-r from-[#6B21A8] to-[#4C1D95] text-[#F3EFE6] rounded-lg hover:bg-[#4C1D95] font-medium text-sm">保存</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-[#F3EFE6] mb-1.5">{label}</label>{children}</div>;
}
