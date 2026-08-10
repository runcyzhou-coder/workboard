import { useCompanySettings } from '@/lib/useCompanySettings';
import { formatDate } from '@/lib/utils';

interface DocHeaderProps {
  title: string;
  subtitle?: string;
  docNumber: string;
}

export function DocHeader({ title, subtitle, docNumber }: DocHeaderProps) {
  const { settings } = useCompanySettings();

  return (
    <div className="flex items-start justify-between mb-8">
      <div className="flex items-center gap-3">
        {settings?.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="h-14 w-auto object-contain" />
        ) : (
          <div className="h-12 px-4 bg-slate-900 text-white rounded-lg flex items-center font-bold text-lg">
            {settings?.company_name || 'KIKI TECH'}
          </div>
        )}
        {(settings?.address || settings?.phone || settings?.email) && (
          <div className="text-xs text-slate-500 leading-relaxed">
            {settings?.address && <p>{settings.address}</p>}
            {settings?.phone && <p>Tel: {settings.phone}</p>}
            {settings?.email && <p>Email: {settings.email}</p>}
          </div>
        )}
      </div>
      <div className="text-right">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        <p className="text-sm font-medium text-slate-700 mt-1">{docNumber}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatDate(new Date().toISOString())}</p>
      </div>
    </div>
  );
}
