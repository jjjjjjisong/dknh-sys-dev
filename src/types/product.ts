export type Product = {
  id: string;
  no: number | null;
  productMasterId: string | null;
  masterName1: string;
  masterName2: string;
  masterGubun: string;
  clientId: string | null;
  receiver: string;
  gubun: string;
  client: string;
  name1: string;
  name2: string;
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

export type ProductMaster = {
  id: string;
  name1: string;
  name2: string;
  gubun: string;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
  linkedProductCount: number;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type ProductInput = {
  productMasterId: string;
  clientId: string;
  receiver: string;
  gubun: string;
  client: string;
  name1: string;
  name2: string;
  cost_price: number | null;
  sell_price: number | null;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
};

export type ProductMasterInput = {
  gubun: string;
  name1: string;
  name2: string;
  ea_per_b: number | null;
  box_per_p: number | null;
  ea_per_p: number | null;
  pallets_per_truck: number | null;
};
