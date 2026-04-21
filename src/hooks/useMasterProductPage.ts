import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { fetchProductManagementData } from '../api/productManagement';
import { removeProduct, removeProductMaster, saveProduct, saveProductMaster } from '../api/products';
import type { Client } from '../types/client';
import type { Product, ProductInput, ProductMaster, ProductMasterInput } from '../types/product';
import {
  applyMasterDefaultsToProductForm,
  buildProductExcelRows,
  buildProductsByMasterId,
  createEmptyMasterForm,
  createEmptyProductForm,
  createMasterFormFromRow,
  createProductFormFromRow,
  formatFileStamp,
  formatNullableNumber,
  parseNullableNumber,
  updateCalculatedNumbers,
  type ActiveProductTab,
} from '../features/products/forms';
import { PRODUCT_PAGE_SIZE } from '../features/products/constants';

type ProductPriceDraft = {
  cost_price: string;
  sell_price: string;
};

export function useMasterProductPage() {
  const [activeTab, setActiveTab] = useState<ActiveProductTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [productMasters, setProductMasters] = useState<ProductMaster[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingMaster, setEditingMaster] = useState<ProductMaster | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [masterForm, setMasterForm] = useState<ProductMasterInput>(createEmptyMasterForm());
  const [productForm, setProductForm] = useState<ProductInput>(createEmptyProductForm());
  const [masterFormError, setMasterFormError] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPriceProductId, setSavingPriceProductId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [expandedMasterIds, setExpandedMasterIds] = useState<string[]>([]);
  const [productPriceDrafts, setProductPriceDrafts] = useState<Record<string, ProductPriceDraft>>({});
  const clientSearchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadPageData();
  }, []);

  async function loadPageData() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProductManagementData();
      setProducts(data.products);
      setProductMasters(data.productMasters);
      setClients(data.clients);
      setProductPriceDrafts(createProductPriceDraftMap(data.products));
    } catch (err) {
      setError(err instanceof Error ? err.message : '품목 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const clientOptions = useMemo(() => clients.filter((client) => client.name.trim()), [clients]);

  const filteredFormClientOptions = useMemo(() => {
    const keyword = productForm.client.trim().toLowerCase();
    if (!keyword) return clientOptions;
    return clientOptions.filter((client) => client.name.toLowerCase().includes(keyword));
  }, [clientOptions, productForm.client]);

  const filteredMasters = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return productMasters;

    return productMasters.filter((master) =>
      [master.name1, master.name2, master.gubun]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [productMasters, query]);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return products.filter((product) => {
      if (clientFilter && product.client !== clientFilter) return false;
      if (!keyword) return true;

      return [
        product.masterName1,
        product.masterName2,
        product.name1,
        product.name2,
        product.client,
        product.gubun,
        product.receiver,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [clientFilter, products, query]);

  const productsByMasterId = useMemo(() => buildProductsByMasterId(products), [products]);
  const activeRows = activeTab === 'masters' ? filteredMasters : filteredProducts;

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PRODUCT_PAGE_SIZE;
    return activeRows.slice(start, start + PRODUCT_PAGE_SIZE);
  }, [activeRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, clientFilter, query]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(activeRows.length / PRODUCT_PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [activeRows.length, currentPage]);

  useEffect(() => {
    if (!clientDropdownOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (clientSearchBoxRef.current && !clientSearchBoxRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [clientDropdownOpen]);

  function updateMasterForm<K extends keyof ProductMasterInput>(key: K, value: ProductMasterInput[K]) {
    setMasterForm((current) => updateCalculatedNumbers(current, key, value));
  }

  function updateProductForm<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setProductForm((current) => updateCalculatedNumbers(current, key, value));
  }

  function openCreateMasterModal() {
    setEditingMaster(null);
    setMasterForm(createEmptyMasterForm());
    setMasterFormError(null);
    setMasterModalOpen(true);
  }

  function openEditMasterModal(master: ProductMaster) {
    setEditingMaster(master);
    setMasterForm(createMasterFormFromRow(master));
    setMasterFormError(null);
    setMasterModalOpen(true);
  }

  function openCreateProductModal(masterId?: string) {
    setEditingProduct(null);
    setProductForm(masterId ? { ...createEmptyProductForm(), productMasterId: masterId } : createEmptyProductForm());
    setProductFormError(null);
    setClientDropdownOpen(false);
    setProductModalOpen(true);
    if (masterId) {
      applyProductMasterDefaults(masterId);
    }
  }

  function openEditProductModal(product: Product) {
    setEditingProduct(product);
    setProductForm(createProductFormFromRow(product));
    setProductFormError(null);
    setClientDropdownOpen(false);
    setProductModalOpen(true);
  }

  function closeMasterModal() {
    if (saving) return;
    setMasterModalOpen(false);
    setMasterFormError(null);
  }

  function closeProductModal() {
    if (saving) return;
    setProductModalOpen(false);
    setProductFormError(null);
    setClientDropdownOpen(false);
  }

  function handleClientSelect(clientName: string) {
    const selectedClient = clients.find((client) => client.name === clientName);
    updateProductForm('client', clientName);
    updateProductForm('clientId', selectedClient?.id ?? '');
    setClientDropdownOpen(false);
  }

  function applyProductMasterDefaults(productMasterId: string) {
    const selectedMaster = productMasters.find((master) => master.id === productMasterId);
    if (!selectedMaster) return;
    setProductForm((current) => applyMasterDefaultsToProductForm(current, selectedMaster));
  }

  function toggleMasterAccordion(masterId: string) {
    setExpandedMasterIds((current) =>
      current.includes(masterId) ? current.filter((id) => id !== masterId) : [...current, masterId],
    );
  }

  async function handleMasterSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setMasterFormError(null);
      await saveProductMaster(editingMaster?.id ?? null, masterForm);
      await loadPageData();
      setMasterModalOpen(false);
    } catch (err) {
      setMasterFormError(err instanceof Error ? err.message : '공통 품목 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleProductSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setProductFormError(null);
      await saveProduct(
        editingProduct ? { id: editingProduct.id, currentNo: editingProduct.no } : null,
        productForm,
      );
      await loadPageData();
      setProductModalOpen(false);
    } catch (err) {
      setProductFormError(err instanceof Error ? err.message : '납품처별 품목 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMaster(master: ProductMaster) {
    const confirmed = window.confirm(`"${master.name1}" 공통 품목을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await removeProductMaster(master.id);
      setProductMasters((current) => current.filter((item) => item.id !== master.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '공통 품목 삭제에 실패했습니다.');
    }
  }

  async function handleDeleteProduct(product: Product) {
    const confirmed = window.confirm(`"${product.name1}" 납품처별 품목을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await removeProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '납품처별 품목 삭제에 실패했습니다.');
    }
  }

  function updateProductPriceDraft(
    productId: string,
    field: keyof ProductPriceDraft,
    value: string,
  ) {
    setProductPriceDrafts((current) => ({
      ...current,
      [productId]: {
        ...(current[productId] ?? { cost_price: '', sell_price: '' }),
        [field]: value,
      },
    }));
  }

  async function handleSaveProductPrices(product: Product) {
    const draft = productPriceDrafts[product.id] ?? {
      cost_price: formatNullableNumber(product.cost_price),
      sell_price: formatNullableNumber(product.sell_price),
    };

    try {
      setSavingPriceProductId(product.id);
      const updated = await saveProduct(
        { id: product.id, currentNo: product.no },
        {
          productMasterId: product.productMasterId ?? '',
          clientId: product.clientId ?? '',
          receiver: product.receiver,
          gubun: product.gubun,
          client: product.client,
          name1: product.name1,
          name2: product.name2,
          cost_price: parseNullableNumber(draft.cost_price),
          sell_price: parseNullableNumber(draft.sell_price),
          ea_per_b: product.ea_per_b,
          box_per_p: product.box_per_p,
          ea_per_p: product.ea_per_p,
          pallets_per_truck: product.pallets_per_truck,
        },
      );

      setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setProductPriceDrafts((current) => ({
        ...current,
        [updated.id]: {
          cost_price: formatNullableNumber(updated.cost_price),
          sell_price: formatNullableNumber(updated.sell_price),
        },
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '단가 저장에 실패했습니다.');
    } finally {
      setSavingPriceProductId(null);
    }
  }

  const linkedProductsForEditingMaster = useMemo(() => {
    if (!editingMaster) return [];
    return products.filter((product) => product.productMasterId === editingMaster.id);
  }, [editingMaster, products]);

  function handleDownloadExcel() {
    const rows = buildProductExcelRows(activeTab, filteredMasters, filteredProducts);
    if (rows.length === 0) {
      window.alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      activeTab === 'masters' ? '공통품목' : '납품처별품목',
    );
    XLSX.writeFile(workbook, `품목관리_${activeTab}_${formatFileStamp(new Date())}.xlsx`);
  }

  return {
    activeRows,
    activeTab,
    clientDropdownOpen,
    clientFilter,
    clientOptions,
    clientSearchBoxRef,
    clients,
    currentPage,
    editingMaster,
    editingProduct,
    error,
    expandedMasterIds,
    filteredFormClientOptions,
    filteredMasters,
    filteredProducts,
    handleClientSelect,
    handleDeleteMaster,
    handleDeleteProduct,
    handleDownloadExcel,
    handleMasterSubmit,
    handleProductSubmit,
    handleSaveProductPrices,
    updateProductPriceDraft,
    linkedProductsForEditingMaster,
    loading,
    masterForm,
    masterFormError,
    masterModalOpen,
    pagedRows,
    productForm,
    productFormError,
    productMasters,
    productModalOpen,
    productPriceDrafts,
    productsByMasterId,
    query,
    saving,
    savingPriceProductId,
    setActiveTab,
    setClientDropdownOpen,
    setClientFilter,
    setCurrentPage,
    setQuery,
    applyProductMasterDefaults,
    closeMasterModal,
    closeProductModal,
    openCreateMasterModal,
    openCreateProductModal,
    openEditMasterModal,
    openEditProductModal,
    toggleMasterAccordion,
    updateMasterForm,
    updateProductForm,
  };
}

function createProductPriceDraftMap(products: Product[]) {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      {
        cost_price: formatNullableNumber(product.cost_price),
        sell_price: formatNullableNumber(product.sell_price),
      },
    ]),
  );
}
