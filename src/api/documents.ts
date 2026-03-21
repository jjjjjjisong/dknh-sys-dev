import { getSupabaseClient } from './supabase/client';
import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import type { DocumentHistory, DocumentPayload } from '../types/document';

export async function saveDocument(payload: DocumentPayload) {
  const supabase = getSupabaseClient();
  const auditFields = getActiveAuditFields();
  const deletedAuditFields = getDeletedAuditFields();

  const { data: documentRow, error: documentError } = await supabase
    .from('documents')
    .insert({
      issue_no: payload.issueNo,
      client: payload.client,
      manager: payload.manager,
      manager_tel: payload.managerTel,
      receiver: payload.receiver,
      supplier_biz_no: payload.supplierBizNo,
      supplier_name: payload.supplierName,
      supplier_owner: payload.supplierOwner,
      supplier_address: payload.supplierAddress,
      supplier_business_type: payload.supplierBusinessType,
      supplier_business_item: payload.supplierBusinessItem,
      order_date: payload.orderDate,
      arrive_date: payload.arriveDate,
      delivery_addr: payload.deliveryAddr,
      remark: payload.remark,
      request_note: payload.requestNote,
      total_supply: payload.totalSupply,
      total_vat: payload.totalVat,
      total_amount: payload.totalAmount,
      author: payload.author,
      cancelled: false,
      ...auditFields,
    })
    .select('id')
    .single();

  if (documentError) {
    throw documentError;
  }

  if (payload.items.length > 0) {
    const itemRows = payload.items.map((item) => ({
      document_id: documentRow.id,
      seq: item.seq,
      name1: item.name1,
      name2: item.name2,
      gubun: item.gubun,
      qty: item.qty,
      unit_price: item.unitPrice,
      supply: item.supply,
      vat: item.vat,
      order_date: item.orderDate,
      arrive_date: item.arriveDate,
      item_note: item.itemNote,
      ea_per_b: item.eaPerB,
      box_per_p: item.boxPerP,
      custom_pallet: item.customPallet,
      custom_box: item.customBox,
      ...auditFields,
    }));

    const { error: itemError } = await supabase.from('document_items').insert(itemRows);

    if (itemError) {
      throw itemError;
    }

    const { error: orderBookError } = await supabase.from('order_book').insert(
      payload.items.map((item) => ({
        doc_id: documentRow.id,
        issue_no: payload.issueNo,
        date: payload.orderDate,
        deadline: payload.arriveDate,
        client: payload.client,
        product: item.name1,
        qty: item.qty,
        note: item.itemNote,
        receipt: '',
        cancelled: false,
        from_doc: true,
        ...auditFields,
      })),
    );

    if (orderBookError) {
      throw orderBookError;
    }
  }

  return documentRow.id as string;
}

export async function fetchDocuments(): Promise<DocumentHistory[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('id, issue_no, client, manager, manager_tel, receiver, supplier_biz_no, supplier_name, supplier_owner, supplier_address, supplier_business_type, supplier_business_item, order_date, arrive_date, delivery_addr, remark, request_note, total_supply, total_vat, total_amount, author, cancelled, created_at, updated_at, updated_by, del_yn, document_items(id, seq, name1, name2, gubun, qty, unit_price, supply, vat, order_date, arrive_date, item_note, ea_per_b, box_per_p, custom_pallet, custom_box, updated_at, updated_by, del_yn)')
    .eq('del_yn', 'N')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    issueNo: row.issue_no ?? '',
    client: row.client ?? '',
    manager: row.manager ?? '',
    managerTel: row.manager_tel ?? '',
    receiver: row.receiver ?? '',
    supplierBizNo: row.supplier_biz_no ?? '',
    supplierName: row.supplier_name ?? '',
    supplierOwner: row.supplier_owner ?? '',
    supplierAddress: row.supplier_address ?? '',
    supplierBusinessType: row.supplier_business_type ?? '',
    supplierBusinessItem: row.supplier_business_item ?? '',
    orderDate: row.order_date ?? null,
    arriveDate: row.arrive_date ?? null,
    deliveryAddr: row.delivery_addr ?? '',
    remark: row.remark ?? '',
    requestNote: row.request_note ?? '',
    totalSupply: row.total_supply ?? 0,
    totalVat: row.total_vat ?? 0,
    totalAmount: row.total_amount ?? 0,
    author: row.author ?? '',
    cancelled: row.cancelled ?? false,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
    delYn: (row.del_yn ?? 'N') as DocumentHistory['delYn'],
    items: (row.document_items ?? [])
      .filter((item: any) => (item.del_yn ?? 'N') === 'N')
      .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
      .map((item: any) => ({
        id: String(item.id),
        seq: item.seq ?? 0,
        name1: item.name1 ?? '',
        name2: item.name2 ?? '',
        gubun: item.gubun ?? '',
        qty: item.qty ?? 0,
        unitPrice: item.unit_price ?? 0,
        supply: item.supply ?? 0,
        vat: item.vat ?? false,
        orderDate: item.order_date ?? null,
        arriveDate: item.arrive_date ?? null,
        itemNote: item.item_note ?? '',
        eaPerB: item.ea_per_b ?? null,
        boxPerP: item.box_per_p ?? null,
        customPallet: item.custom_pallet ?? null,
        customBox: item.custom_box ?? null,
        updatedAt: item.updated_at ?? null,
        updatedBy: item.updated_by ?? '',
        delYn: (item.del_yn ?? 'N') as DocumentHistory['delYn'],
      })),
  }));
}

export async function updateDocument(document: DocumentHistory) {
  const supabase = getSupabaseClient();
  const auditFields = getActiveAuditFields();
  const deletedAuditFields = getDeletedAuditFields();

  const { error: docError } = await supabase
    .from('documents')
    .update({
      issue_no: document.issueNo,
      client: document.client,
      manager: document.manager,
      manager_tel: document.managerTel,
      receiver: document.receiver,
      supplier_biz_no: document.supplierBizNo,
      supplier_name: document.supplierName,
      supplier_owner: document.supplierOwner,
      supplier_address: document.supplierAddress,
      supplier_business_type: document.supplierBusinessType,
      supplier_business_item: document.supplierBusinessItem,
      order_date: document.orderDate,
      arrive_date: document.arriveDate,
      delivery_addr: document.deliveryAddr,
      remark: document.remark,
      request_note: document.requestNote,
      total_supply: document.totalSupply,
      total_vat: document.totalVat,
      total_amount: document.totalAmount,
      cancelled: document.cancelled,
      ...auditFields,
    })
    .eq('id', document.id);

  if (docError) {
    throw docError;
  }

  const { error: deleteItemError } = await supabase
    .from('document_items')
    .update(deletedAuditFields)
    .eq('document_id', document.id);

  if (deleteItemError) {
    throw deleteItemError;
  }

  if (document.items.length > 0) {
    const { error: insertItemError } = await supabase.from('document_items').insert(
      document.items.map((item, index) => ({
        document_id: document.id,
        seq: index + 1,
        name1: item.name1,
        name2: item.name2,
        gubun: item.gubun,
        qty: item.qty,
        unit_price: item.unitPrice,
        supply: item.supply,
        vat: item.vat,
        order_date: item.orderDate,
        arrive_date: item.arriveDate,
        item_note: item.itemNote,
        ea_per_b: item.eaPerB,
        box_per_p: item.boxPerP,
        custom_pallet: item.customPallet,
        custom_box: item.customBox,
        ...auditFields,
      })),
    );

    if (insertItemError) {
      throw insertItemError;
    }
  }

  const { error: deleteOrderBookError } = await supabase
    .from('order_book')
    .update(deletedAuditFields)
    .eq('doc_id', document.id);

  if (deleteOrderBookError) {
    throw deleteOrderBookError;
  }

  if (document.items.length > 0) {
    const { error: insertOrderBookError } = await supabase.from('order_book').insert(
      document.items.map((item) => ({
        doc_id: document.id,
        issue_no: document.issueNo,
        date: document.orderDate,
        deadline: document.arriveDate,
        client: document.client,
        product: item.name1,
        qty: item.qty,
        note: item.itemNote,
        receipt: '',
        cancelled: document.cancelled,
        from_doc: true,
        ...auditFields,
      })),
    );

    if (insertOrderBookError) {
      throw insertOrderBookError;
    }
  }
}

export async function toggleDocumentCancelled(id: string, cancelled: boolean) {
  const supabase = getSupabaseClient();
  const auditFields = getActiveAuditFields();

  const { error: docError } = await supabase
    .from('documents')
    .update({ cancelled, ...auditFields })
    .eq('id', id);

  if (docError) {
    throw docError;
  }

  const { error: orderBookError } = await supabase
    .from('order_book')
    .update({ cancelled, ...auditFields })
    .eq('doc_id', id)
    .eq('del_yn', 'N');

  if (orderBookError) {
    throw orderBookError;
  }
}
