import type { ItemSummary, SharedItemRow } from '../../components/ui/DocumentItemTable';
import type { SharedPreviewData, SharedPreviewItem } from '../../types/documentPreview';
import type { DocumentHistory, DocumentHistoryItem, DocumentPayload } from '../../types/document';
import { emptyToNull } from '../../utils/formatters';
import { MANUAL_PRODUCT_ID } from '../../components/ui/DocumentItemTable';

type PreviewBaseFields = {
  issueNo: string;
  clientId?: string | null;
  client: string;
  manager: string;
  managerTel: string;
  receiver: string;
  supplierBizNo: string;
  supplierName: string;
  supplierOwner: string;
  supplierAddress: string;
  supplierBusinessType: string;
  supplierBusinessItem: string;
  orderDate: string;
  arriveDate: string;
  deliveryAddr: string;
  remark: string;
  requestNote: string;
};

export function buildSharedPreviewItems(
  itemSummaries: ItemSummary[],
  items: SharedItemRow[],
): SharedPreviewItem[] {
  return itemSummaries
    .map((summary, index) => {
      if (!summary.name1 || summary.qty === 0) return null;
      const item = items[index];

      return {
        productId:
          item.productId && item.productId !== MANUAL_PRODUCT_ID ? item.productId : null,
        seq: index + 1,
        name1: summary.name1,
        name2: summary.name2,
        gubun: summary.gubun,
        qty: summary.qty,
        unitPrice: summary.unitPrice,
        supply: summary.supply,
        vat: item.vat,
        orderDate: emptyToNull(item.orderDate),
        arriveDate: emptyToNull(item.arriveDate),
        releaseNote: item.releaseNote.trim(),
        invoiceNote: item.invoiceNote.trim(),
        eaPerB: summary.eaPerB,
        boxPerP: summary.boxPerP,
        pallet: summary.pallet,
        box: summary.box,
      };
    })
    .filter((item): item is SharedPreviewItem => item !== null);
}

export function buildSharedPreviewData(
  base: PreviewBaseFields,
  itemSummaries: ItemSummary[],
  items: SharedItemRow[],
  totals: { supply: number; vat: number; total: number },
): SharedPreviewData | null {
  const validItems = buildSharedPreviewItems(itemSummaries, items);
  if (validItems.length === 0) return null;

  return {
    issueNo: base.issueNo.trim(),
    clientId: base.clientId ?? null,
    client: base.client.trim(),
    manager: base.manager.trim(),
    managerTel: base.managerTel.trim(),
    receiver: base.receiver.trim(),
    supplierBizNo: base.supplierBizNo.trim(),
    supplierName: base.supplierName.trim(),
    supplierOwner: base.supplierOwner.trim(),
    supplierAddress: base.supplierAddress.trim(),
    supplierBusinessType: base.supplierBusinessType.trim(),
    supplierBusinessItem: base.supplierBusinessItem.trim(),
    orderDate: emptyToNull(base.orderDate),
    arriveDate: emptyToNull(base.arriveDate),
    deliveryAddr: base.deliveryAddr.trim(),
    remark: base.remark.trim(),
    requestNote: base.requestNote.trim(),
    totalSupply: totals.supply,
    totalVat: totals.vat,
    totalAmount: totals.total,
    items: validItems,
  };
}

export function buildDocumentPayload(
  previewData: SharedPreviewData,
  author: string,
  issueNoEditHistory = '',
): DocumentPayload {
  return {
    issueNo: previewData.issueNo,
    clientId: previewData.clientId ?? null,
    client: previewData.client,
    manager: previewData.manager,
    managerTel: previewData.managerTel,
    receiver: previewData.receiver,
    supplierBizNo: previewData.supplierBizNo,
    supplierName: previewData.supplierName,
    supplierOwner: previewData.supplierOwner,
    supplierAddress: previewData.supplierAddress,
    supplierBusinessType: previewData.supplierBusinessType,
    supplierBusinessItem: previewData.supplierBusinessItem,
    orderDate: previewData.orderDate,
    arriveDate: previewData.arriveDate,
    deliveryAddr: previewData.deliveryAddr,
    issueNoEditHistory,
    remark: previewData.remark,
    requestNote: previewData.requestNote,
    totalSupply: previewData.totalSupply,
    totalVat: previewData.totalVat,
    totalAmount: previewData.totalAmount,
    author,
    status: 'ST00',
    items: previewData.items.map((item) => ({
      productId: item.productId ?? null,
      seq: item.seq,
      name1: item.name1,
      name2: item.name2,
      gubun: item.gubun,
      qty: item.qty,
      unitPrice: item.unitPrice,
      supply: item.supply,
      vat: item.vat,
      orderDate: item.orderDate,
      arriveDate: item.arriveDate,
      releaseNote: item.releaseNote,
      invoiceNote: item.invoiceNote,
      eaPerB: item.eaPerB,
      boxPerP: item.boxPerP,
      customPallet: item.pallet,
      customBox: item.box,
    })),
  };
}

export function buildHistoryDraftItems(
  draft: DocumentHistory | null,
  itemSummaries: ItemSummary[],
  items: SharedItemRow[],
): DocumentHistoryItem[] {
  return itemSummaries
    .map((summary, index) => {
      if (!summary.name1 || summary.qty === 0) return null;

      const item = items[index];
      const existingItem = draft?.items.find((row) => row.id === item.id);

      return {
        id: existingItem?.id ?? item.id,
        productId:
          item.productId && item.productId !== MANUAL_PRODUCT_ID ? item.productId : existingItem?.productId ?? null,
        seq: index + 1,
        name1: summary.name1,
        name2: summary.name2,
        gubun: summary.gubun,
        qty: summary.qty,
        unitPrice: summary.unitPrice,
        supply: summary.supply,
        vat: item.vat,
        orderDate: emptyToNull(item.orderDate),
        arriveDate: emptyToNull(item.arriveDate),
        releaseNote: item.releaseNote.trim(),
        invoiceNote: item.invoiceNote.trim(),
        eaPerB: summary.eaPerB,
        boxPerP: summary.boxPerP,
        customPallet: item.customPallet,
        customBox: item.customBox,
        delYn: existingItem?.delYn ?? 'N',
        updatedAt: existingItem?.updatedAt ?? null,
        updatedBy: existingItem?.updatedBy ?? '',
      };
    })
    .filter((item): item is DocumentHistoryItem => item !== null);
}
