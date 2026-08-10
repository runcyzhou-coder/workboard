import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CompanySettings } from '@/lib/supabase';

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
    if (data) {
      setSettings(data as CompanySettings);
    } else {
      const { data: created } = await supabase.from('company_settings').insert({
        company_name: 'KIKI TECH',
      }).select('*').single();
      setSettings(created as CompanySettings);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (updates: Partial<CompanySettings>) => {
    if (!settings) return;
    const { data } = await supabase.from('company_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', settings.id).select('*').single();
    if (data) setSettings(data as CompanySettings);
  }, [settings]);

  return { settings, loading, update, reload: load };
}
