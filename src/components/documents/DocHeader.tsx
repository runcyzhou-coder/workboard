import { useCompanySettings } from '@/lib/useCompanySettings';
import { formatDate } from '@/lib/utils';
import { MapPin, Phone, Mail } from 'lucide-react';

interface DocHeaderProps {
  title: string;
  subtitle?: string;
  docNumber: string;
}

export function DocHeader({ title, subtitle, docNumber }: DocHeaderProps) {
  const { settings } = useCompanySettings();

  // 标题转大写（以 CONTRACT / QUOTATION / PROFORMA INVOICE 风格展示）
  const titleUpper = title?.toUpperCase() || '';

  return (
    <div className="mb-8">
      {/* 顶部：Logo + 公司名（居中，公司名字体较大） */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="h-16 w-auto object-contain shrink-0" />
        ) : (
          <div className="h-14 px-5 bg-slate-900 text-white rounded-lg flex items-center font-bold text-xl shrink-0">
            {settings?.company_name ? settings.company_name.charAt(0) : 'K'}
          </div>
        )}
        {settings?.company_name && (
          <span className="text-2xl font-bold text-slate-900 tracking-wide leading-tight">
            {settings.company_name}
          </span>
        )}
      </div>

      {/* 联系信息行：电话 / 地址 / Email */}
      {(settings?.address || settings?.phone || settings?.email) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600 mb-3">
          {settings?.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {settings.address}
            </span>
          )}
          {settings?.email && (
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {settings.email}
            </span>
          )}
          {settings?.phone && (
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {settings.phone}
            </span>
          )}
        </div>
      )}

      {/* 长横线（深蓝灰主题） */}
      <div className="border-t-[3px] border-slate-900 mb-5" />

      {/* 单据名称（大写）+ 编号日期 */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-widest text-slate-900">
          {titleUpper}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
        <div className="flex justify-center items-center gap-6 mt-2">
          <span className="text-sm font-semibold text-slate-700">{docNumber}</span>
          <span className="text-xs text-slate-400">{formatDate(new Date().toISOString())}</span>
        </div>
      </div>
    </div>
  );
}
