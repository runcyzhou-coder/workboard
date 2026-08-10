import { useState, useRef } from 'react';
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
}

const docTypes: { id: DocType; label: string; englishLabel: string; icon: typeof FileText; color: string; description: string }[] = [
  { id: 'pi', label: '形式发票', englishLabel: 'Proforma Invoice', icon: FileText, color: 'from-violet-500 to-violet-600', description: '向买方提供的预估发票，用于申请进口许可、外汇审批等' },
  { id: 'ci', label: '商业发票', englishLabel: 'Commercial Invoice', icon: Receipt, color: 'from-blue-500 to-blue-600', description: '正式结算凭证，用于报关、清关和付款' },
  { id: 'contract', label: '合同', englishLabel: 'Sales Contract', icon: Handshake, color: 'from-emerald-500 to-emerald-600', description: '买卖双方正式签订的销售合同，含交期、检验、仲裁等条款' },
  { id: 'customs', label: '报关信息', englishLabel: 'Customs Declaration', icon: ClipboardCheck, color: 'from-amber-500 to-amber-600', description: '出口报关申报信息，含HS编码、毛净重、包装方式等' },
  { id: 'packing', label: '装箱单', englishLabel: 'Packing List', icon: Package2, color: 'from-rose-500 to-rose-600', description: '详细列明每箱货物的数量、重量、尺寸和体积' },
  { id: 'quotation', label: '报价单', englishLabel: 'Quotation', icon: Quote, color: 'from-cyan-500 to-cyan-600', description: '向客户发送的产品报价，含有效期和付款条件' },
];

export function DocumentCenter({ initialDocType }: DocumentCenterProps) {
  const [selectedDoc, setSelectedDoc] = useState<DocType | null>(initialDocType ?? null);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, loading, update, reload } = useCompanySettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const fileName = `logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
    if (uploadError) {
      // If bucket doesn't exist, try to create it
      const { error: bucketError } = await supabase.storage.createBucket('logos', { public: true });
      if (!bucketError) {
        await supabase.storage.from('logos').upload(fileName, file, { upsert: true });
      } else {
        alert('上传失败，请稍后重试');
        return;
      }
    }
    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
    await update({ logo_url: urlData.publicUrl });
    reload();
  }

  // If a document type is selected, render that document component
  if (selectedDoc) {
    const docInfo = docTypes.find(d => d.id === selectedDoc)!;
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedDoc(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{docInfo.label}</h1>
              <p className="text-sm text-slate-500">{docInfo.englishLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="h-10 w-auto object-contain" />
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
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
          <h1 className="text-2xl font-bold text-slate-900">单据中心</h1>
          <p className="text-slate-500 mt-1">选择单据类型，生成专业外贸单据</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
        >
          <Settings className="w-4 h-4" />公司设置
        </button>
      </div>

      {/* Logo preview */}
      {settings?.logo_url && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <img src={settings.logo_url} alt="Company Logo" className="h-12 w-auto object-contain" />
          <div>
            <p className="text-sm font-medium text-slate-900">{settings.company_name}</p>
            <p className="text-xs text-slate-500">当前Logo已应用到所有单据</p>
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
              className="group text-left bg-white rounded-xl border border-slate-200 p-6 hover:shadow-xl hover:border-slate-300 transition-all"
            >
              <div className={classNames('w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-105 transition-transform', doc.color)}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{doc.label}</h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{doc.englishLabel}</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{doc.description}</p>
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
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">公司设置</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">公司Logo</label>
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 w-16 object-contain border border-slate-200 rounded-lg p-1" />
              ) : (
                <div className="h-16 w-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={onLogoUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />上传Logo
                </button>
                <p className="text-xs text-slate-400 mt-1.5">PNG/JPG/SVG/WebP, 最大2MB</p>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-center text-slate-400 py-4">加载中...</p>
          ) : (
            <>
              <Field label="公司名称">
                <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="地址">
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="电话">
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="邮箱">
                  <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
              </div>
              <Field label="网站">
                <input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <Field label="税号">
                <input value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="开户银行">
                  <input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
                <Field label="银行账号">
                  <input value={form.bank_account} onChange={e => setForm({ ...form, bank_account: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </Field>
              </div>
              <Field label="SWIFT Code">
                <input value={form.swift_code} onChange={e => setForm({ ...form, swift_code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium text-sm">取消</button>
          <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">保存</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{children}</div>;
}
