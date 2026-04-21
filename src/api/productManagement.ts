import { fetchClients } from './clients';
import { fetchProductMasters, fetchProducts } from './products';

export async function fetchProductManagementData() {
  const [products, productMasters, clients] = await Promise.all([
    fetchProducts(),
    fetchProductMasters(),
    fetchClients(),
  ]);

  return {
    products,
    productMasters,
    clients: clients.filter((client) => client.active !== false),
  };
}
