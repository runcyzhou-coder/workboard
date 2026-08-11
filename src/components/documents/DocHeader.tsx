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

  return (
    <div className="mb-8">
      {/* 顶部 Logo 区（可选，保持左对齐，弱化显示） */}
      {settings?.logo_url && (
        <div className="flex items-start mb-4">
          <img src={settings.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
        </div>
      )}

      {/* 居中标题区 */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-wide text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        <p className="text-sm font-semibold text-slate-700 mt-1">{docNumber}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatDate(new Date().toISOString())}</p>
      </div>

      {/* 加粗横线（主题深蓝灰色） */}
      <div className="mt-4 border-t-[3px] border-slate-900" />

      {/* 公司信息：横线下方，深蓝灰色主题 */}
      {(settings?.company_name || settings?.address || settings?.phone || settings?.email) && (
        <div className="mt-3 text-center">
          {settings?.company_name && (
            <p className="text-sm font-bold text-slate-800 tracking-wide">{settings.company_name}</p>
          )}
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600">
            {settings?.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" />
                {settings.address}
              </span>
            )}
            {settings?.email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3 text-slate-500" />
                {settings.email}
              </span>
            )}
            {settings?.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-500" />
                {settings.phone}
              </span>
            )}
          </div>
          {settings?.website && (
            <p className="text-xs text-slate-500 mt-0.5">{settings.website}</p>
          )}
        </div>
      )}

      {/* 与正文之间的分隔 */}
      <div className="mt-4 border-t border-slate-200" />
    </div>
  );
}
