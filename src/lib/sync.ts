// 订单履约同步工具
// 处理询盘管理与订单履约之间的数据同步

import { supabase, hasValidSupabaseConfig } from './supabase';

/**
 * 为所有已成交但尚无履约记录的询盘创建订单履约
 * 同时支持 Supabase 和 localStorage 两种存储模式
 */
export async function syncWonInquiriesToShipments(): Promise<{
  created: number;
  mode: string;
  message: string;
}> {
  let createdCount = 0;
  const mode = hasValidSupabaseConfig ? 'Supabase' : 'localStorage';

  try {
    if (hasValidSupabaseConfig) {
      // ====== Supabase 模式 ======
      // 1. 获取所有已成交的询盘
      const { data: wonInquiries, error: e1 } = await supabase
        .from('inquiries')
        .select('*')
        .eq('status', 'won');
      
      if (e1) throw new Error('查询询盘失败: ' + e1.message);
      
      const wonList = wonInquiries || [];
      console.log(`[同步-${mode}] 查询到 ${wonList.length} 条已成交询盘`);

      if (wonList.length === 0) {
        return { created: 0, mode, message: '没有已成交的询盘' };
      }

      // 2. 获取已有履约记录
      const { data: existingShipments, error: e2 } = await supabase
        .from('shipments')
        .select('inquiry_id');
      
      if (e2) throw new Error('查询履约单失败: ' + e2.message);
      
      const existingIds = new Set(((existingShipments as any[]) || []).map((s: any) => s.inquiry_id).filter(Boolean));

      // 3. 找出需要创建的履约单
      const toCreate = wonList.filter((inq: any) => !existingIds.has(inq.id));
      console.log(`[同步-${mode}] 需要创建 ${toCreate.length} 条履约单`);

      if (toCreate.length === 0) {
        return { created: 0, mode, message: '所有已成交询盘都已同步' };
      }

      // 4. 批量创建履约单 - 先使用基础字段（确保兼容性）
      for (const inq of toCreate) {
        const itemTotal = (inq.items || []).reduce((s: any, i: any) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0);
        
        // 先只使用确定存在的字段
        const baseShipmentData: any = {
          shipment_number: `SHP-${Date.now().toString().slice(-6)}-${inq.inquiry_number}`,
          inquiry_id: inq.id,
          customer_id: inq.customer_id,
          status: 'pending_booking',
          shipping_method: 'Sea Freight',
          notes: `自动同步于询盘成交\n询盘编号: ${inq.inquiry_number}\n询盘主题: ${inq.subject}`,
        };

        // 尝试插入扩展字段（如果字段不存在，Supabase 会忽略它们）
        const extendedFields: any = {
          shipping_scenario: 'our_forwarder',
          payment_type: (inq.payment_terms || '').includes('L/C') ? 'L/C' : 'T/T',
          payment_status: 'unpaid',
          total_amount: itemTotal || 0,
          paid_amount: 0,
          balance_amount: itemTotal || 0,
          po_date: null,
          factory_eta: null,
          client_deadline: null,
          domestic_shipped_date: null,
          forwarder_received_date: null,
          booking_date: null,
          container_number: null,
          bl_number: null,
          carrier: null,
          vessel_voyage: null,
          etd: null,
          atd: null,
          eta: null,
          ata: null,
          port_of_loading: null,
          port_of_discharge: null,
          forwarder_name: null,
          forwarder_contact: null,
          balance_received_date: null,
          bl_released_date: null,
        };

        // 合并所有字段
        const allFields = { ...baseShipmentData, ...extendedFields };

        const { error } = await supabase.from('shipments').insert(allFields);
        if (error) {
          console.error(`[同步-${mode}] 创建履约单失败:`, error);
          // 如果扩展字段导致错误，尝试只插入基础字段
          if (error.message?.includes('column') || error.message?.includes('does not exist')) {
            console.log(`[同步-${mode}] 尝试使用基础字段重试...`);
            const { error: error2 } = await supabase.from('shipments').insert(baseShipmentData);
            if (error2) {
              console.error(`[同步-${mode}] 基础字段插入也失败:`, error2);
            } else {
              createdCount++;
            }
          }
        } else {
          createdCount++;
        }
      }
    } else {
      // ====== localStorage 模式 ======
      const rawInquiries = localStorage.getItem('wb_inquiries');
      const rawShipments = localStorage.getItem('wb_shipments');
      const inquiriesList = rawInquiries ? JSON.parse(rawInquiries) : [];
      const shipmentsList = rawShipments ? JSON.parse(rawShipments) : [];

      console.log(`[同步-${mode}] 询盘总数: ${inquiriesList.length}`);

      const wonInquiries = inquiriesList.filter((inq: any) => inq.status === 'won');
      console.log(`[同步-${mode}] 已成交询盘数: ${wonInquiries.length}`);

      if (wonInquiries.length === 0) {
        return { created: 0, mode, message: '没有已成交的询盘' };
      }

      const existingIds = new Set(shipmentsList.map((s: any) => s.inquiry_id).filter(Boolean));
      const toCreate = wonInquiries.filter((inq: any) => !existingIds.has(inq.id));
      console.log(`[同步-${mode}] 需要创建: ${toCreate.length} 条`);

      if (toCreate.length === 0) {
        return { created: 0, mode, message: '所有已成交询盘都已同步' };
      }

      for (const inq of toCreate) {
        const itemTotal = (inq.items || []).reduce((s: any, i: any) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0);
        shipmentsList.push({
          id: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          shipment_number: `SHP-${Date.now().toString().slice(-6)}-${inq.inquiry_number}`,
          inquiry_id: inq.id,
          customer_id: inq.customer_id,
          status: 'pending_booking',
          shipping_scenario: 'our_forwarder',
          shipping_method: 'Sea Freight',
          payment_type: (inq.payment_terms || '').includes('L/C') ? 'L/C' : 'T/T',
          payment_status: 'unpaid',
          total_amount: itemTotal || 0,
          paid_amount: 0,
          balance_amount: itemTotal || 0,
          notes: `自动同步于询盘成交\n询盘编号: ${inq.inquiry_number}\n询盘主题: ${inq.subject}`,
          po_date: null,
          factory_eta: null,
          client_deadline: null,
          domestic_shipped_date: null,
          forwarder_received_date: null,
          booking_date: null,
          container_number: null,
          bl_number: null,
          carrier: null,
          vessel_voyage: null,
          etd: null,
          atd: null,
          eta: null,
          ata: null,
          port_of_loading: null,
          port_of_discharge: null,
          forwarder_name: null,
          forwarder_contact: null,
          balance_received_date: null,
          bl_released_date: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        createdCount++;
      }
      localStorage.setItem('wb_shipments', JSON.stringify(shipmentsList));
    }

    const message = createdCount > 0
      ? `成功同步 ${createdCount} 条询盘到订单履约`
      : '所有已成交询盘都已同步';
    
    console.log(`[同步-${mode}] ${message}`);
    return { created: createdCount, mode, message };

  } catch (e: any) {
    console.error(`[同步-${mode}] 失败:`, e);
    return { created: 0, mode, message: '同步失败: ' + (e?.message || '未知错误') };
  }
}

/**
 * 获取数据状态（用于调试面板）
 */
export async function getDataStatus(): Promise<any> {
  if (hasValidSupabaseConfig) {
    try {
      const { data: inquiries } = await supabase.from('inquiries').select('*');
      const { data: shipments } = await supabase.from('shipments').select('*');
      const wonInquiries = (inquiries || []).filter((inq: any) => inq.status === 'won');
      const existingIds = new Set(((shipments as any[]) || []).map((s: any) => s.inquiry_id).filter(Boolean));
      
      return {
        mode: 'Supabase',
        inquiriesTotal: inquiries?.length || 0,
        wonTotal: wonInquiries.length,
        shipmentsTotal: shipments?.length || 0,
        toCreate: wonInquiries.filter((inq: any) => !existingIds.has(inq.id)).length,
        wonInquiries: wonInquiries.map((inq: any) => ({
          id: inq.id,
          inquiry_number: inq.inquiry_number,
          subject: inq.subject,
          hasShipment: existingIds.has(inq.id),
        })),
      };
    } catch (e) {
      return { mode: 'Supabase', error: String(e) };
    }
  } else {
    const rawInquiries = localStorage.getItem('wb_inquiries');
    const rawShipments = localStorage.getItem('wb_shipments');
    const inquiriesList = rawInquiries ? JSON.parse(rawInquiries) : [];
    const shipmentsList = rawShipments ? JSON.parse(rawShipments) : [];
    
    const wonInquiries = inquiriesList.filter((inq: any) => inq.status === 'won');
    const existingIds = new Set(shipmentsList.map((s: any) => s.inquiry_id).filter(Boolean));
    
    return {
      mode: 'localStorage',
      inquiriesTotal: inquiriesList.length,
      wonTotal: wonInquiries.length,
      shipmentsTotal: shipmentsList.length,
      toCreate: wonInquiries.filter((inq: any) => !existingIds.has(inq.id)).length,
      wonInquiries: wonInquiries.map((inq: any) => ({
        id: inq.id,
        inquiry_number: inq.inquiry_number,
        subject: inq.subject,
        hasShipment: existingIds.has(inq.id),
      })),
    };
  }
}
