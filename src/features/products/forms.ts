import type { Product, ProductInput, ProductMaster, ProductMasterInput } from '../../types/product';
import { DEFAULT_GUBUN } from './constants';

export type ActiveProductTab = 'masters' | 'products';

export function createEmptyMasterForm(): ProductMasterInput {
  return {
    gubun: DEFAULT_GUBUN,
    name1: '',
    name2: '',
    ea_per_b: null,
    box_per_p: null,
    ea_per_p: null,
    pallets_per_truck: null,
  };
}

export function createEmptyProductForm(): ProductInput {
  return {
    productMasterId: '',
    clientId: '',
    receiver: '',
    gubun: DEFAULT_GUBUN,
    client: '',
    name1: '',
    name2: '',
    cost_price: null,
    sell_price: null,
    ea_per_b: null,
    box_per_p: null,
    ea_per_p: null,
    pallets_per_truck: null,
  };
}

export function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatNullableNumber(value: number | null) {
  return value === null ? '' : String(value);
}

export function updateCalculatedNumbers<T extends ProductInput | ProductMasterInput, K extends keyof T>(
  current: T,
  key: K,
  value: T[K],
) {
  const next = { ...current, [key]: value } as T;

  if (key === 'ea_per_b' || key === 'box_per_p') {
    const eaPerB = 'ea_per_b' in next ? next.ea_per_b : null;
    const boxPerP = 'box_per_p' in next ? next.box_per_p : null;
    next.ea_per_p =
      eaPerB !== null && boxPerP !== null ? Number(eaPerB) * Number(boxPerP) : null;
  }

  return next;
}

export function createMasterFormFromRow(master: ProductMaster): ProductMasterInput {
  return {
    gubun: master.gubun || DEFAULT_GUBUN,
    name1: master.name1,
    name2: master.name2,
    ea_per_b: master.ea_per_b,
    box_per_p: master.box_per_p,
    ea_per_p: master.ea_per_p,
    pallets_per_truck: master.pallets_per_truck,
  };
}

export function createProductFormFromRow(product: Product): ProductInput {
  return {
    productMasterId: product.productMasterId ?? '',
    clientId: product.clientId ?? '',
    receiver: product.receiver,
    gubun: product.gubun || product.masterGubun || DEFAULT_GUBUN,
    client: product.client,
    name1: product.name1,
    name2: product.name2,
    cost_price: product.cost_price,
    sell_price: product.sell_price,
    ea_per_b: product.ea_per_b,
    box_per_p: product.box_per_p,
    ea_per_p: product.ea_per_p,
    pallets_per_truck: product.pallets_per_truck,
  };
}

export function applyMasterDefaultsToProductForm(
  productForm: ProductInput,
  master: ProductMaster,
): ProductInput {
  return {
    ...productForm,
    productMasterId: master.id,
    gubun: master.gubun || productForm.gubun || DEFAULT_GUBUN,
    ea_per_b: master.ea_per_b,
    box_per_p: master.box_per_p,
    ea_per_p: master.ea_per_p,
    pallets_per_truck: master.pallets_per_truck,
  };
}

export function buildProductsByMasterId(products: Product[]) {
  const next = new Map<string, Product[]>();

  for (const product of products) {
    const masterId = product.productMasterId ?? '';
    if (!masterId) continue;
    const rows = next.get(masterId) ?? [];
    rows.push(product);
    next.set(masterId, rows);
  }

  for (const rows of next.values()) {
    rows.sort((a, b) => (a.no ?? Number.MAX_SAFE_INTEGER) - (b.no ?? Number.MAX_SAFE_INTEGER));
  }

  return next;
}

export function buildProductExcelRows(
  activeTab: ActiveProductTab,
  masters: ProductMaster[],
  products: Product[],
) {
  if (activeTab === 'masters') {
    return masters.map((master) => ({
      구분: master.gubun || '',
      품목명: master.name1 || '',
      '품목명(거래명세서)': master.name2 || '',
      하위품목수: master.linkedProductCount,
    }));
  }

  return products.map((product) => ({
    구분: product.gubun || '',
    공통품목: product.masterName1 || '',
    납품처: product.client || '',
    수신처: product.receiver || '',
    품목명: product.name1 || '',
    '품목명(거래명세서)': product.name2 || '',
    입고단가: product.cost_price ?? '',
    판매단가: product.sell_price ?? '',
    '1Box(ea)': product.ea_per_b ?? '',
    '1Pallet(Box)': product.box_per_p ?? '',
  }));
}

export function formatFileStamp(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
}
