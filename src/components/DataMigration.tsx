import { useState, useEffect } from 'react';
import { ArrowRight, Database, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';

// 需要迁移的业务表清单
const TABLES_TO_MIGRATE = [
  'customers',
  'dev_customers',
  'followup_records',
  'daily_dev_logs',
  'inquiries',
  'shipments',
  'proforma_invoices',
  'products',
  'quotations',
  'calendar_events',
  'after_sales',
  'profit_calculations',
  'company_settings',
  'commercial_invoices',
  'packing_lists',
  'contracts',
  'customs_declarations',
  'ci_items',
  'pl_items',
  'cd_items',
  'selected_industry',
];

// 游客命名空间标识
const ANON_NAMESPACE = '__anonymous__';

interface TableStatus {
  table: string;
  count: number;
  migrated: boolean;
}

export function DataMigration() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // 获取存储键
  const getStorageKey = (table: string, userId: string): string => {
    return `wb_${table}__${userId}`;
  };

  // 检测游客数据
  useEffect(() => {
    checkGuestData();
  }, []);

  const checkGuestData = () => {
    setLoading(true);
    const status: TableStatus[] = [];
    for (const table of TABLES_TO_MIGRATE) {
      const guestKey = getStorageKey(table, ANON_NAMESPACE);
      // 也检查旧的无命名空间格式（升级前的数据）
      const legacyKey = `wb_${table}`;
      try {
        let data: any[] = [];
        const guestRaw = localStorage.getItem(guestKey);
        if (guestRaw) data = JSON.parse(guestRaw);
        if (data.length === 0) {
          const legacyRaw = localStorage.getItem(legacyKey);
          if (legacyRaw) data = JSON.parse(legacyRaw);
        }
        status.push({ table, count: data.length, migrated: false });
      } catch {
        status.push({ table, count: 0, migrated: false });
      }
    }
    setTables(status);
    setLoading(false);
    setResult(null);
  };

  const totalRecords = tables.reduce((sum, t) => sum + t.count, 0);
  const hasGuestData = totalRecords > 0;

  // 执行迁移
  const handleMigrate = async () => {
    if (!user) {
      setResult({ success: false, message: '请先登录目标账号' });
      return;
    }
    if (!confirm(`确定将游客账号的数据迁移到 ${user.email} 吗？\n\n这将把 ${totalRecords} 条记录复制到当前账号，游客数据会被保留。`)) {
      return;
    }

    setMigrating(true);
    setResult(null);
    let migratedCount = 0;
    let migratedTables = 0;
    const updatedTables: TableStatus[] = [...tables];

    try {
      for (let i = 0; i < TABLES_TO_MIGRATE.length; i++) {
        const table = TABLES_TO_MIGRATE[i];
        const guestKey = getStorageKey(table, ANON_NAMESPACE);
        const legacyKey = `wb_${table}`;
        const targetKey = getStorageKey(table, user.id);

        // 读取游客数据
        let guestData: any[] = [];
        try {
          const guestRaw = localStorage.getItem(guestKey);
          if (guestRaw) guestData = JSON.parse(guestRaw);
        } catch {}
        // 如果命名空间下没有，尝试旧格式
        if (guestData.length === 0) {
          try {
            const legacyRaw = localStorage.getItem(legacyKey);
            if (legacyRaw) guestData = JSON.parse(legacyRaw);
          } catch {}
        }

        if (guestData.length === 0) continue;

        // 读取目标账号现有数据
        let targetData: any[] = [];
        try {
          const targetRaw = localStorage.getItem(targetKey);
          if (targetRaw) targetData = JSON.parse(targetRaw);
        } catch {}

        // 合并数据（去重：按 id 去重）
        const existingIds = new Set(targetData.map((r: any) => r.id).filter(Boolean));
        const toAdd = guestData.filter((r: any) => r.id && !existingIds.has(r.id));
        const merged = [...targetData, ...toAdd];

        // 写入目标账号命名空间
        localStorage.setItem(targetKey, JSON.stringify(merged));

        migratedCount += toAdd.length;
        migratedTables++;
        updatedTables[i] = { ...updatedTables[i], migrated: true };
        setTables([...updatedTables]);

        // 短暂延迟让 UI 更新
        await new Promise(r => setTimeout(r, 30));
      }

      setResult({
        success: true,
        message: `迁移完成！共迁移 ${migratedCount} 条记录（来自 ${migratedTables} 张表）到 ${user.email}。请刷新页面查看数据。`,
      });
    } catch (e: any) {
      setResult({
        success: false,
        message: `迁移失败: ${e?.message || '未知错误'}`,
      });
    } finally {
      setMigrating(false);
    }
  };

  // 清空游客数据（迁移后可选）
  const handleClearGuestData = () => {
    if (!confirm('确定清空游客账号的所有数据吗？此操作不可恢复！建议先确认迁移成功。')) return;
    for (const table of TABLES_TO_MIGRATE) {
      localStorage.removeItem(getStorageKey(table, ANON_NAMESPACE));
      localStorage.removeItem(`wb_${table}`);
    }
    setResult({ success: true, message: '游客数据已清空' });
    checkGuestData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#7BA369] animate-spin" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E8E2D5]">
        <Database className="w-6 h-6 text-[#7BA369]" strokeWidth={1.75} />
        <div>
          <h2 className="font-serif text-xl font-bold text-[#2D2A26]">数据迁移工具</h2>
          <p className="text-xs text-[#78716C]">将游客账号的数据迁移到当前登录账号</p>
        </div>
      </div>

      {/* 当前账号信息 */}
      <div className="bg-[#F2EBDC] rounded-lg p-4 border border-[#E8E2D5]">
        <div className="text-xs text-[#78716C] mb-1">当前登录账号（目标）</div>
        <div className="font-serif text-[#2D2A26]">{user?.email || '未登录'}</div>
        <div className="text-xs text-[#78716C] mt-1">用户ID: {user?.id || '—'}</div>
      </div>

      {/* 游客数据概览 */}
      <div className="bg-white rounded-lg p-5 border border-[#E8E2D5]">
        <h3 className="font-serif font-bold text-[#2D2A26] mb-3">游客账号数据概览</h3>
        {hasGuestData ? (
          <>
            <div className="flex items-center gap-2 mb-4 text-sm text-[#78716C]">
              <AlertCircle className="w-4 h-4 text-amber-500" strokeWidth={2} />
              <span>检测到 <strong className="text-[#2D2A26]">{totalRecords}</strong> 条游客数据，可以迁移</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
              {tables.filter(t => t.count > 0).map(t => (
                <div key={t.table} className="flex items-center justify-between px-3 py-2 bg-[#FAF7F2] rounded text-xs">
                  <span className="text-[#78716C]">{t.table}</span>
                  <span className={`font-bold ${t.migrated ? 'text-emerald-600' : 'text-[#2D2A26]'}`}>
                    {t.migrated && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[#78716C] py-4">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
            <span>没有检测到游客数据，无需迁移</span>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {hasGuestData && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleMigrate}
            disabled={migrating || !user}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-[#7BA369] hover:bg-[#6B9359] disabled:bg-[#C8C0AE] text-white rounded-lg font-medium text-sm transition-colors"
          >
            {migrating ? (
              <><Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> 迁移中...</>
            ) : (
              <><ArrowRight className="w-4 h-4" strokeWidth={2} /> 迁移到当前账号</>
            )}
          </button>
          <button
            onClick={checkGuestData}
            disabled={migrating}
            className="px-4 py-3 bg-white hover:bg-[#F2EBDC] border border-[#E8E2D5] text-[#78716C] rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* 结果提示 */}
      {result && (
        <div className={`p-4 rounded-lg border ${
          result.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start gap-2">
            {result.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2} />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
            )}
            <div className="text-sm">{result.message}</div>
          </div>
          {result.success && hasGuestData && (
            <button
              onClick={handleClearGuestData}
              className="mt-3 text-xs text-[#78716C] underline hover:text-[#2D2A26]"
            >
              清空游客账号数据（迁移成功后清理）
            </button>
          )}
        </div>
      )}

      {/* 操作说明 */}
      <div className="text-xs text-[#78716C] space-y-1 pt-4 border-t border-[#E8E2D5]">
        <p>· 迁移会复制游客账号下的所有业务数据到当前登录账号</p>
        <p>· 同 ID 的记录会自动跳过，不会重复插入</p>
        <p>· 迁移成功后，请刷新页面查看数据</p>
        <p>· 游客账号的原始数据会保留，可稍后手动清理</p>
      </div>
    </div>
  );
}
