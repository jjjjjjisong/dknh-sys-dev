import { getSupabaseClient } from './supabase/client';
import { getActiveAuditFields, getDeletedAuditFields } from './audit';
import type { DocumentHistory, DocumentPayload, DocumentStatus } from '../types/document';
import { getStoredUser } from '../lib/session';

let creatingDocument = false;
const updatingDocumentIds = new Set<string>();
const togglingDocumentIds = new Set<string>();

export async function saveDocument(payload: DocumentPayload) {
  if (creatingDocument) {
    throw new Error('문서 저장이 이미 진행 중입니다. 잠시 후 다시 시도해 주세요.');
  }

  creatingDocument = true;
  const supabase = getSupabaseClient();
  const auditFields = getActiveAuditFields();
  const currentUser = getStoredUser();
  const clientId = await resolveClientId(payload.clientId, payload.client);
  const authorId = payload.authorId ?? currentUser?.id ?? null;

  try {
    const { data: documentRow, error: documentError } = await supabase
      .from('documents')
      .insert({
        issue_no: payload.issueNo,
        client_id: clientId,
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
        author_id: authorId,
        author: payload.author,
        status: payload.status,
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
        product_id: item.productId ? Number(item.productId) : null,
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
        item_note: item.releaseNote,
        release_note: item.releaseNote,
        invoice_note: item.invoiceNote,
        ea_per_b: item.eaPerB,
        box_per_p: item.boxPerP,
        custom_pallet: item.customPallet,
        custom_box: item.customBox,
        ...auditFields,
      }));

      const { data: insertedItems, error: itemError } = await supabase
        .from('document_items')
        .insert(itemRows)
        .select('id, product_id, seq, name1, qty, arrive_date');

      if (itemError) {
        throw itemError;
      }

      const sortedInsertedItems = [...(insertedItems ?? [])].sort(
        (a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0) || String(a.id).localeCompare(String(b.id)),
      );

      const { error: orderBookError } = await supabase.from('order_book').insert(
        sortedInsertedItems.map((item: any) => ({
          doc_id: documentRow.id,
          document_item_id: item.id,
          issue_no: payload.issueNo,
          client_id: clientId,
          product_id: item.product_id,
          date: payload.orderDate,
          deadline: item.arrive_date ?? payload.arriveDate,
          client: payload.client,
          product: item.name1,
          qty: item.qty ?? 0,
          note: payload.remark,
          receipt: '',
          status: payload.status,
          shipped_status: '미출고',
          from_doc: true,
          ...auditFields,
        })),
      );

      if (orderBookError) {
        throw orderBookError;
      }
    }

    return documentRow.id as string;
  } finally {
    creatingDocument = false;
  }
}

export async function fetchDocuments(): Promise<DocumentHistory[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select(
      'id, issue_no, client_id, client, manager, manager_tel, receiver, supplier_biz_no, supplier_name, supplier_owner, supplier_address, supplier_business_type, supplier_business_item, order_date, arrive_date, delivery_addr, remark, request_note, total_supply, total_vat, total_amount, author_id, author, status, approval_title, approval_status, approval_requested_at, approval_completed_at, approval_current_step, created_at, updated_at, updated_by, del_yn, document_items(id, product_id, seq, name1, name2, gubun, qty, unit_price, supply, vat, order_date, arrive_date, item_note, release_note, invoice_note, ea_per_b, box_per_p, custom_pallet, custom_box, updated_at, updated_by, del_yn)',
    )
    .eq('del_yn', 'N')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    clientId: row.client_id === null || row.client_id === undefined ? null : String(row.client_id),
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
    authorId: row.author_id === null || row.author_id === undefined ? null : String(row.author_id),
    author: row.author ?? '',
    status: mapDocumentStatus(row.status),
    approvalTitle: row.approval_title ?? '',
    approvalStatus: (row.approval_status ?? 'draft') as DocumentHistory['approvalStatus'],
    approvalRequestedAt: row.approval_requested_at ?? null,
    approvalCompletedAt: row.approval_completed_at ?? null,
    approvalCurrentStep: row.approval_current_step ?? 0,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? '',
    delYn: (row.del_yn ?? 'N') as DocumentHistory['delYn'],
    items: (row.document_items ?? [])
      .filter((item: any) => (item.del_yn ?? 'N') === 'N')
      .sort((a: any, b: any) => (a.seq ?? 0) - (b.seq ?? 0))
      .map((item: any) => ({
        id: String(item.id),
        productId:
          item.product_id === null || item.product_id === undefined ? null : String(item.product_id),
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
        releaseNote: item.release_note ?? item.item_note ?? '',
        invoiceNote: item.invoice_note ?? item.item_note ?? '',
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
  if (updatingDocumentIds.has(document.id)) {
    throw new Error('같은 문서의 수정 저장이 이미 진행 중입니다. 잠시 후 다시 시도해 주세요.');
  }

  updatingDocumentIds.add(document.id);
  const supabase = getSupabaseClient();
  const auditFields = getActiveAuditFields();
  const deletedAuditFields = getDeletedAuditFields();
  const clientId = await resolveClientId(document.clientId, document.client);

  try {
    const { data: updatedDocumentRows, error: docError } = await supabase
      .from('documents')
      .update({
        issue_no: document.issueNo,
        client_id: clientId,
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
        author_id: document.authorId,
        status: document.status,
        ...auditFields,
      })
      .eq('id', document.id)
      .eq('del_yn', 'N')
      .select('id');

    if (docError) {
      throw docError;
    }

    if (!updatedDocumentRows || updatedDocumentRows.length === 0) {
      throw new Error('문서를 수정할 수 없습니다. 삭제되었거나 권한이 없는 상태일 수 있습니다.');
    }

    const nextItems = document.items.map((item, index) => ({
      ...item,
      seq: index + 1,
    }));

    const existingItemIds = nextItems
      .map((item) => (isPersistedId(item.id) ? item.id : null))
      .filter((value): value is string => Boolean(value));

    const { data: activeItemRows, error: activeItemsError } = await supabase
      .from('document_items')
      .select('id')
      .eq('document_id', document.id)
      .eq('del_yn', 'N');

    if (activeItemsError) {
      throw activeItemsError;
    }

    const activeItemIds = (activeItemRows ?? []).map((row: any) => String(row.id));
    const removedItemIds = activeItemIds.filter((id: string) => !existingItemIds.includes(id));

    if (removedItemIds.length > 0) {
      const { error: deleteItemError } = await supabase
        .from('document_items')
        .update(deletedAuditFields)
        .in('id', removedItemIds)
        .eq('document_id', document.id)
        .eq('del_yn', 'N');

      if (deleteItemError) {
        throw deleteItemError;
      }
    }

    for (const item of nextItems) {
      const itemPayload = {
        document_id: document.id,
        product_id: item.productId ? Number(item.productId) : null,
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
        item_note: item.releaseNote,
        release_note: item.releaseNote,
        invoice_note: item.invoiceNote,
        ea_per_b: item.eaPerB,
        box_per_p: item.boxPerP,
        custom_pallet: item.customPallet,
        custom_box: item.customBox,
        ...auditFields,
      };

      if (isPersistedId(item.id)) {
        const { error: updateItemError } = await supabase
          .from('document_items')
          .update(itemPayload)
          .eq('id', item.id)
          .eq('document_id', document.id)
          .eq('del_yn', 'N');

        if (updateItemError) {
          throw updateItemError;
        }
      } else {
        const { error: insertItemError } = await supabase.from('document_items').insert(itemPayload);

        if (insertItemError) {
          throw insertItemError;
        }
      }
    }

    const { data: activeDocumentItemRows, error: activeDocumentItemsError } = await supabase
      .from('document_items')
      .select('id, product_id, seq, name1, qty, arrive_date')
      .eq('document_id', document.id)
      .eq('del_yn', 'N')
      .order('seq', { ascending: true })
      .order('id', { ascending: true });

    if (activeDocumentItemsError) {
      throw activeDocumentItemsError;
    }

    const { data: activeOrderBookRows, error: activeOrderBookError } = await supabase
      .from('order_book')
      .select('id, receipt, shipped_status, document_item_id, product')
      .eq('doc_id', document.id)
      .eq('from_doc', true)
      .eq('del_yn', 'N')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (activeOrderBookError) {
      throw activeOrderBookError;
    }

    const currentOrderBookRows = (activeOrderBookRows ?? []) as Array<{
      id: string;
      receipt: string | null;
      shipped_status: string | null;
      document_item_id: string | null;
      product: string | null;
    }>;
    const legacyOrderBookCount = currentOrderBookRows.filter((row) => !row.document_item_id).length;
    if (legacyOrderBookCount > 0) {
      throw new Error(
        '기존 수주대장 데이터에 품목 연결 정보가 없어 안전하게 수정할 수 없습니다. 먼저 order_book document_item_id 백필 SQL을 실행해 주세요.',
      );
    }

    const activeDocumentItems = (activeDocumentItemRows ?? []) as Array<{
      id: string;
      product_id: number | string | null;
      seq: number | null;
      name1: string | null;
      qty: number | null;
      arrive_date: string | null;
    }>;

    const orderBookByDocumentItemId = new Map<string, (typeof currentOrderBookRows)[number]>();
    const keptOrderBookIds = new Set<string>();

    for (const row of currentOrderBookRows) {
      if (row.document_item_id) {
        orderBookByDocumentItemId.set(row.document_item_id, row);
      }
    }

    for (let index = 0; index < activeDocumentItems.length; index += 1) {
      const item = activeDocumentItems[index];
      const existingOrderBook = orderBookByDocumentItemId.get(item.id);

      const orderBookPayload = {
        doc_id: document.id,
        document_item_id: item.id,
        issue_no: document.issueNo,
        client_id: clientId,
        product_id: item.product_id,
        date: document.orderDate,
        deadline: item.arrive_date ?? document.arriveDate,
        client: document.client,
        product: item.name1 ?? '',
        qty: item.qty ?? 0,
        note: document.remark,
        receipt: existingOrderBook?.receipt ?? '',
        status: document.status,
        shipped_status: normalizeShippedStatus(existingOrderBook?.shipped_status),
        from_doc: true,
        ...auditFields,
      };

      if (existingOrderBook) {
        keptOrderBookIds.add(existingOrderBook.id);
        const { error: updateOrderBookError } = await supabase
          .from('order_book')
          .update(orderBookPayload)
          .eq('id', existingOrderBook.id)
          .eq('doc_id', document.id)
          .eq('del_yn', 'N');

        if (updateOrderBookError) {
          throw updateOrderBookError;
        }
      } else {
        const { error: insertOrderBookError } = await supabase.from('order_book').insert(orderBookPayload);

        if (insertOrderBookError) {
          throw insertOrderBookError;
        }
      }
    }

    const removedOrderBookIds = currentOrderBookRows
      .filter((row) => !keptOrderBookIds.has(row.id))
      .map((row) => row.id);

    if (removedOrderBookIds.length > 0) {
      const { error: deleteOrderBookError } = await supabase
        .from('order_book')
        .update(deletedAuditFields)
        .in('id', removedOrderBookIds)
        .eq('doc_id', document.id)
        .eq('del_yn', 'N');

      if (deleteOrderBookError) {
        throw deleteOrderBookError;
      }
    }
  } finally {
    updatingDocumentIds.delete(document.id);
  }
}

export async function toggleDocumentCancelled(id: string, cancelled: boolean) {
  if (togglingDocumentIds.has(id)) {
    throw new Error('문서 상태 변경이 이미 진행 중입니다. 잠시 후 다시 시도해 주세요.');
  }

  togglingDocumentIds.add(id);
  const supabase = getSupabaseClient();
  const auditFields = getActiveAuditFields();
  const status: DocumentStatus = cancelled ? 'ST01' : 'ST00';

  try {
    const { data: updatedDocumentRows, error: docError } = await supabase
      .from('documents')
      .update({ status, ...auditFields })
      .eq('id', id)
      .eq('del_yn', 'N')
      .select('id');

    if (docError) {
      throw docError;
    }

    if (!updatedDocumentRows || updatedDocumentRows.length === 0) {
      throw new Error('문서 상태를 변경할 수 없습니다. 삭제되었거나 권한이 없는 상태일 수 있습니다.');
    }

    const { error: orderBookError } = await supabase
      .from('order_book')
      .update({ status, ...auditFields })
      .eq('doc_id', id)
      .eq('del_yn', 'N');

    if (orderBookError) {
      throw orderBookError;
    }
  } finally {
    togglingDocumentIds.delete(id);
  }
}

async function resolveClientId(clientId: string | null | undefined, clientName: string) {
  const normalizedId = String(clientId ?? '').trim();
  if (normalizedId) return normalizedId;

  const normalizedName = clientName.trim();
  if (!normalizedName) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('name', normalizedName)
    .eq('del_yn', 'N')
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function fetchNextIssueNo() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('issue_no, created_at')
    .eq('del_yn', 'N')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const latestIssueNo = String(data?.issue_no ?? '').trim();
  const parsed = parseInt(latestIssueNo, 10);
  if (Number.isNaN(parsed)) {
    return '26001';
  }

  return String(parsed + 1);
}

function mapDocumentStatus(status: string | null | undefined): DocumentStatus {
  if (status === 'ST01') return 'ST01';
  if (status === 'ST00') return 'ST00';
  return 'ST00';
}

function isPersistedId(value: string | null | undefined) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return false;
  if (/^\d+$/.test(normalized)) return true;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
}

function normalizeShippedStatus(value: string | null | undefined) {
  return value === '출고' ? '출고' : '미출고';
}
