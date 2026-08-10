// localStorage-based mock Supabase client
// 当 Supabase 未配置时，使用 localStorage 存储数据，保证应用功能正常可用

function getTableData(table: string): any[] {
  try {
    const raw = localStorage.getItem(`wb_${table}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTableData(table: string, data: any[]) {
  localStorage.setItem(`wb_${table}`, JSON.stringify(data));
}

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

interface Filter {
  column: string;
  value: any;
}

class LocalQueryBuilder {
  private table: string;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Filter[] = [];
  private orderColumn?: string;
  private orderAscending = true;
  private limitCount?: number;
  private selectColumns?: string;
  private isHead = false;
  private payload?: any;
  private insertedRows?: any[];

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, opts?: any): this {
    this.selectColumns = columns || '*';
    if (opts?.head) this.isHead = true;
    // insert 后链式调用 select 时不改变操作类型
    if (this.operation !== 'insert') {
      this.operation = 'select';
    }
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }): this {
    this.orderColumn = column;
    this.orderAscending = opts?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  insert(payload: any): this {
    this.operation = 'insert';
    this.payload = payload;
    const data = getTableData(this.table);
    const rows = Array.isArray(payload) ? payload : [payload];
    this.insertedRows = rows.map(row => ({
      ...row,
      id: row.id || genId(),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    }));
    saveTableData(this.table, [...data, ...this.insertedRows]);
    return this;
  }

  update(payload: any): this {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  single(): Promise<{ data: any; error: any; count: any }> {
    return Promise.resolve(this.execute(true));
  }

  maybeSingle(): Promise<{ data: any; error: any; count: any }> {
    return Promise.resolve(this.execute(false, true));
  }

  private resolveJoins(data: any[]): any[] {
    if (!this.selectColumns || this.selectColumns === '*') return data;
    const parts = this.selectColumns.split(',').map(s => s.trim());
    const joins = parts.filter(p => p.includes(':'));
    if (joins.length === 0) return data;

    return data.map(row => {
      const result = { ...row };
      for (const join of joins) {
        const match = join.match(/(\w+):(\w+)\(\*\)/);
        if (match) {
          const [, alias, foreignTable] = match;
          const fkColumn = `${alias}_id`;
          if (row[fkColumn]) {
            const foreignData = getTableData(foreignTable);
            result[alias] = foreignData.find(r => r.id === row[fkColumn]) || null;
          } else {
            result[alias] = null;
          }
        }
      }
      return result;
    });
  }

  private execute(isSingle = false, isMaybeSingle = false): { data: any; error: any; count: any } {
    switch (this.operation) {
      case 'select': {
        let data = getTableData(this.table);
        for (const f of this.filters) {
          data = data.filter(row => row[f.column] === f.value);
        }
        if (this.orderColumn) {
          data = [...data].sort((a, b) => {
            const aVal = a[this.orderColumn!];
            const bVal = b[this.orderColumn!];
            if (this.orderAscending) return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
          });
        }
        if (this.limitCount) data = data.slice(0, this.limitCount);
        data = this.resolveJoins(data);
        const count = data.length;
        if (this.isHead) return { data: null, error: null, count };
        if (isSingle || isMaybeSingle) return { data: data[0] || null, error: null, count: null };
        return { data, error: null, count };
      }
      case 'insert': {
        if (this.selectColumns) {
          if (isSingle || isMaybeSingle) return { data: this.insertedRows?.[0] || null, error: null, count: null };
          return { data: this.insertedRows || [], error: null, count: this.insertedRows?.length || 0 };
        }
        return { data: null, error: null, count: null };
      }
      case 'update': {
        const data = getTableData(this.table);
        const updated = data.map(row => {
          const matches = this.filters.every(f => row[f.column] === f.value);
          return matches ? { ...row, ...this.payload } : row;
        });
        saveTableData(this.table, updated);
        return { data: null, error: null, count: null };
      }
      case 'delete': {
        const data = getTableData(this.table);
        const remaining = data.filter(row => !this.filters.every(f => row[f.column] === f.value));
        saveTableData(this.table, remaining);
        return { data: null, error: null, count: null };
      }
      default:
        return { data: null, error: null, count: null };
    }
  }

  then(resolve: any, reject?: any) {
    return Promise.resolve(this.execute()).then(resolve, reject);
  }
}

export const localClient = {
  from(table: string): LocalQueryBuilder {
    return new LocalQueryBuilder(table);
  },
};
