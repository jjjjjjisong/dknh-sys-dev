export type Supplier = {
  id: string;
  name: string;
  bizNo: string;
  owner: string;
  address: string;
  businessType: string;
  businessItem: string;
  active: boolean;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type SupplierInput = {
  name: string;
  bizNo: string;
  owner: string;
  address: string;
  businessType: string;
  businessItem: string;
  active: boolean;
};
