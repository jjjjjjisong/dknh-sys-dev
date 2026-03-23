export type Product = {
  id: string;
  no: number | null;
  clientId: string | null;
  gubun: string;
  client: string;
  name1: string;
  name2: string;
  supplier: string;
  cost_price: number | null;
  sell_price: number | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type ProductInput = {
  clientId: string;
  gubun: string;
  client: string;
  supplier: string;
  name1: string;
  name2: string;
  cost_price: number | null;
  sell_price: number | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
};
