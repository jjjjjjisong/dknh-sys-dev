import { getSupabaseClient } from './supabase/client';
import type { Product, ProductInput } from '../types/product';

export async function fetchProducts(): Promise<Product[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, no, gubun, client, name1, name2, supplier, cost_price, sell_price, ea_per_b, box_per_p, ea_per_p, pallets_per_truck',
    )
    .order('no');

  if (error) {
    throw error;
  }

  return (data ?? []).map((product: {
    id: number | string;
    no: number | null;
    gubun: string | null;
    client: string | null;
    name1: string | null;
    name2: string | null;
    supplier: string | null;
    cost_price: number | null;
    sell_price: number | null;
    ea_per_b: number | null;
    box_per_p: number | null;
    ea_per_p: number | null;
    pallets_per_truck: number | null;
  }) => mapProductRow(product));
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const supabase = getSupabaseClient();
  const { data: maxRows, error: maxError } = await supabase
    .from('products')
    .select('no')
    .order('no', { ascending: false })
    .limit(1);

  if (maxError) {
    throw maxError;
  }

  const nextNo = (maxRows?.[0]?.no ?? 0) + 1;

  const { data, error } = await supabase
    .from('products')
    .insert({
      no: nextNo,
      ...input,
    })
    .select(
      'id, no, gubun, client, name1, name2, supplier, cost_price, sell_price, ea_per_b, box_per_p, ea_per_p, pallets_per_truck',
    )
    .single();

  if (error) {
    throw error;
  }

  return mapProductRow(data);
}

export async function updateProduct(id: string, currentNo: number | null, input: ProductInput): Promise<Product> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('products')
    .update({
      no: currentNo,
      ...input,
    })
    .eq('id', id)
    .select(
      'id, no, gubun, client, name1, name2, supplier, cost_price, sell_price, ea_per_b, box_per_p, ea_per_p, pallets_per_truck',
    )
    .single();

  if (error) {
    throw error;
  }

  return mapProductRow(data);
}

export async function removeProduct(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

function mapProductRow(product: {
  id: number | string;
  no: number | null;
  gubun: string | null;
  client: string | null;
  name1: string | null;
  name2: string | null;
  supplier: string | null;
  cost_price: number | null;
  sell_price: number | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
}): Product {
  return {
    id: String(product.id),
    no: product.no ?? null,
    gubun: product.gubun ?? '',
    client: product.client ?? '',
    name1: product.name1 ?? '',
    name2: product.name2 ?? '',
    supplier: product.supplier ?? '',
    cost_price: product.cost_price ?? null,
    sell_price: product.sell_price ?? null,
    ea_per_b: product.ea_per_b ?? null,
    box_per_p: product.box_per_p ?? null,
    ea_per_p: product.ea_per_p ?? null,
    pallets_per_truck: product.pallets_per_truck ?? null,
  };
}
