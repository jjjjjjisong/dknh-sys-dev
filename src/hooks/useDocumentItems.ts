import { useState, useMemo } from 'react';
import type { Product } from '../types/product';
import { MANUAL_PRODUCT_ID, DEFAULT_GUBUN_OPTIONS } from '../components/ui/DocumentItemTable';
import type { SharedItemRow, ItemSummary } from '../components/ui/DocumentItemTable';

export function createEmptySharedItem(baseOrderDate: string, baseArriveDate: string): SharedItemRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    productId: '',
    manualName: '',
    manualGubun: DEFAULT_GUBUN_OPTIONS[0],
    orderDate: baseOrderDate,
    arriveDate: baseArriveDate,
    qty: 0,
    customPallet: null,
    customBox: null,
    unitPrice: null,
    customSupply: null,
    vat: true,
    itemNote: '',
  };
}

export function useDocumentItems(initialItems: SharedItemRow[], clientProducts: Product[]) {
  const [items, setItems] = useState<SharedItemRow[]>(initialItems);

  const itemSummaries = useMemo<ItemSummary[]>(
    () =>
      items.map((item) => {
        const product = clientProducts.find((row) => row.id === item.productId) ?? null;
        const manualMode = item.productId === MANUAL_PRODUCT_ID;
        const name1 = manualMode ? item.manualName.trim() : product?.name1 ?? '';
        const name2 = manualMode ? item.manualName.trim() : product?.name2 ?? '';
        const gubun = manualMode ? item.manualGubun : product?.gubun ?? '';
        const eaPerB = manualMode ? null : product?.ea_per_b ?? null;
        const boxPerP = manualMode ? null : product?.box_per_p ?? null;
        const eaPerP = eaPerB && boxPerP ? eaPerB * boxPerP : product?.ea_per_p ?? null;
        const qty = item.qty ?? 0;
        const unitPrice = item.unitPrice ?? product?.sell_price ?? 0;
        const computedSupply = Math.round(unitPrice * qty);
        const supply = item.customSupply ?? computedSupply;
        const vatAmount = item.vat ? Math.round(supply * 0.1) : 0;

        return {
          name1,
          name2,
          gubun,
          qty,
          unitPrice,
          supply,
          vatAmount,
          pallet:
            item.customPallet !== null
              ? item.customPallet
              : eaPerP
                ? Math.ceil(qty / eaPerP)
                : null,
          box:
            item.customBox !== null
              ? item.customBox
              : eaPerB
                ? Math.ceil(qty / eaPerB)
                : null,
          eaPerB,
          boxPerP,
        };
      }),
    [clientProducts, items],
  );

  const totals = useMemo(
    () =>
      itemSummaries.reduce(
        (acc, item) => ({
          supply: acc.supply + item.supply,
          vat: acc.vat + item.vatAmount,
          total: acc.total + item.supply + item.vatAmount,
        }),
        { supply: 0, vat: 0, total: 0 },
      ),
    [itemSummaries],
  );

  function addItem(orderDate: string, arriveDate: string) {
    setItems((current) => [...current, createEmptySharedItem(orderDate, arriveDate)]);
  }

  function removeItem(id: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  function updateItem(id: string, updater: (item: SharedItemRow) => SharedItemRow) {
    setItems((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  return { items, setItems, itemSummaries, totals, addItem, removeItem, updateItem };
}
