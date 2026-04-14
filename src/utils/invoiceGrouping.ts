type InvoiceLikeItem = {
  qty: number;
  supply: number;
  vat: boolean;
  orderDate?: string | null;
  arriveDate?: string | null;
};

type InvoiceLikeData<TItem extends InvoiceLikeItem> = {
  orderDate: string | null;
  arriveDate: string | null;
  totalSupply: number;
  totalVat: number;
  totalAmount: number;
  items: TItem[];
};

export function splitInvoiceDataByArriveDate<TItem extends InvoiceLikeItem, TData extends InvoiceLikeData<TItem>>(
  data: TData,
): TData[] {
  const groups = new Map<string, TItem[]>();

  data.items.forEach((item) => {
    const key = item.arriveDate || data.arriveDate || item.orderDate || data.orderDate || '';
    const existing = groups.get(key);
    if (existing) {
      existing.push(item);
      return;
    }
    groups.set(key, [item]);
  });

  return Array.from(groups.entries()).map(([arriveDate, items]) => {
    const totalSupply = items.reduce((sum, item) => sum + Number(item.supply || 0), 0);
    const totalVat = items.reduce(
      (sum, item) => sum + (item.vat ? Math.round(Number(item.supply || 0) * 0.1) : 0),
      0,
    );

    return {
      ...data,
      arriveDate: arriveDate || data.arriveDate,
      totalSupply,
      totalVat,
      totalAmount: totalSupply + totalVat,
      items,
    };
  });
}
