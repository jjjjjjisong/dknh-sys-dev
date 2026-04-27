import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { fetchProductManagementData } from '../api/productManagement';
import {
  applyPriceChange,
  fetchPriceChangeLogs,
  MANUAL_PRICE_CHANGE_PRODUCT_ID,
  previewPriceChange,
  type PriceChangeLog,
  type PriceChangePreviewRow,
} from '../api/priceChanges';
import { removeProduct, removeProductMaster, saveProduct, saveProductMaster } from '../api/products';
import type { PriceChangeForm } from '../components/products/PriceChangePanel';
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

const today = new Date();
const defaultDateTo = today.toISOString().slice(0, 10);
const defaultDateFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

function createDefaultPriceChangeForm(): PriceChangeForm {
  return {
    dateFrom: defaultDateFrom,
    dateTo: defaultDateTo,
    clientId: '',
    receiver: '',
    productId: '',
    productName: '',
    newCostPrice: '',
    newUnitPrice: '',
  };
}

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
  const [priceChangeForm, setPriceChangeForm] = useState<PriceChangeForm>(createDefaultPriceChangeForm);
  const [priceChangePreviewRows, setPriceChangePreviewRows] = useState<PriceChangePreviewRow[]>([]);
  const [selectedPriceChangeItemIds, setSelectedPriceChangeItemIds] = useState<string[]>([]);
  const [priceChangeSearched, setPriceChangeSearched] = useState(false);
  const [priceChangeLogs, setPriceChangeLogs] = useState<PriceChangeLog[]>([]);
  const [priceChangeLoadingPreview, setPriceChangeLoadingPreview] = useState(false);
  const [priceChangeApplying, setPriceChangeApplying] = useState(false);
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
      setError(err instanceof Error ? err.message : '?덈ぉ 紐⑸줉 議고쉶???ㅽ뙣?덉뒿?덈떎.');
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
  const activeRows =
    activeTab === 'masters' ? filteredMasters : activeTab === 'products' ? filteredProducts : [];
  const priceChangeReceiverOptions = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.receiver).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'ko'),
      ),
    [products],
  );

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PRODUCT_PAGE_SIZE;
    return activeRows.slice(start, start + PRODUCT_PAGE_SIZE);
  }, [activeRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, clientFilter, query]);

  useEffect(() => {
    if (activeTab === 'price-change') {
      void loadPriceChangeLogs();
    }
  }, [activeTab]);

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
      setMasterFormError(err instanceof Error ? err.message : '怨듯넻 ?덈ぉ ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setSaving(false);
    }
  }

  async function handleProductSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setProductFormError(null);
      const savedProduct = await saveProduct(
        editingProduct ? { id: editingProduct.id, currentNo: editingProduct.no } : null,
        productForm,
      );
      setProducts((current) => {
        const existingIndex = current.findIndex((item) => item.id === savedProduct.id);
        if (existingIndex >= 0) {
          return current.map((item) => (item.id === savedProduct.id ? savedProduct : item));
        }

        return [...current, savedProduct].sort(
          (a, b) => (a.no ?? Number.MAX_SAFE_INTEGER) - (b.no ?? Number.MAX_SAFE_INTEGER),
        );
      });
      setProductPriceDrafts((current) => ({
        ...current,
        [savedProduct.id]: {
          cost_price: formatNullableNumber(savedProduct.cost_price),
          sell_price: formatNullableNumber(savedProduct.sell_price),
        },
      }));
      await loadPageData();
      setProductModalOpen(false);
    } catch (err) {
      setProductFormError(err instanceof Error ? err.message : '?⑺뭹泥섎퀎 ?덈ぉ ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMaster(master: ProductMaster) {
    const confirmed = window.confirm(`"${master.name1}" 怨듯넻 ?덈ぉ????젣?섏떆寃좎뒿?덇퉴?`);
    if (!confirmed) return;

    try {
      await removeProductMaster(master.id);
      setProductMasters((current) => current.filter((item) => item.id !== master.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '怨듯넻 ?덈ぉ ??젣???ㅽ뙣?덉뒿?덈떎.');
    }
  }

  async function handleDeleteProduct(product: Product) {
    const confirmed = window.confirm(`"${product.name1}" ?⑺뭹泥섎퀎 ?덈ぉ????젣?섏떆寃좎뒿?덇퉴?`);
    if (!confirmed) return;

    try {
      await removeProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '?⑺뭹泥섎퀎 ?덈ぉ ??젣???ㅽ뙣?덉뒿?덈떎.');
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

  function updatePriceChangeForm<K extends keyof PriceChangeForm>(key: K, value: PriceChangeForm[K]) {
    setPriceChangeForm((current) => {
      const next = { ...current, [key]: value };

      if (key === 'productName') {
        next.productName = String(value);
        if (current.productId !== MANUAL_PRICE_CHANGE_PRODUCT_ID) {
          next.productId = '';
        }
      }

      if (key === 'productId') {
        const selectedProduct = products.find((product) => product.id === value);
        next.productId = String(value);
        if (value === MANUAL_PRICE_CHANGE_PRODUCT_ID) {
          next.productName = '';
        } else if (selectedProduct) {
          next.productName = selectedProduct.name1;
        } else if (!value) {
          next.productName = '';
        }
      }

      return next;
    });
    if (key !== 'newCostPrice' && key !== 'newUnitPrice') {
      setPriceChangePreviewRows([]);
      setSelectedPriceChangeItemIds([]);
      setPriceChangeSearched(false);
    }
  }

  async function loadPriceChangeLogs() {
    try {
      const logs = await fetchPriceChangeLogs();
      setPriceChangeLogs(logs);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('price_change_logs') || message.includes('schema cache')) {
        setPriceChangeLogs([]);
        return;
      }
      setError(err instanceof Error ? err.message : '?④? 蹂寃??대젰 議고쉶???ㅽ뙣?덉뒿?덈떎.');
    }
  }

  function buildPriceChangeCriteria() {
    return {
      dateFrom: priceChangeForm.dateFrom,
      dateTo: priceChangeForm.dateTo,
      clientId: '',
      clientName: '',
      receiver: '',
      productId: priceChangeForm.productId,
      productName: priceChangeForm.productName,
    };
  }

  function validatePriceChangeSearch() {
    if (!priceChangeForm.dateFrom || !priceChangeForm.dateTo) {
      return '시작일과 종료일을 입력해 주세요.';
    }
    if (priceChangeForm.dateFrom > priceChangeForm.dateTo) {
      return '시작일은 종료일보다 늦을 수 없습니다.';
    }
    if (!priceChangeForm.productId && !priceChangeForm.productName.trim()) {
      return '품목명을 입력하거나 검색 결과에서 품목을 선택해 주세요.';
    }
    return null;
  }
  async function handlePreviewPriceChange() {
    const validationMessage = validatePriceChangeSearch();
    if (validationMessage) {
      window.alert(validationMessage);
      return;
    }

    try {
      setPriceChangeLoadingPreview(true);
      setError(null);
      const rows = await previewPriceChange(buildPriceChangeCriteria());
      setPriceChangePreviewRows(rows);
      setSelectedPriceChangeItemIds([]);
      setPriceChangeSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '?④? ?섏젙 誘몃━蹂닿린 議고쉶???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setPriceChangeLoadingPreview(false);
    }
  }

  function togglePriceChangePreviewRow(itemId: string) {
    setSelectedPriceChangeItemIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  }

  function toggleAllPriceChangePreviewRows() {
    setSelectedPriceChangeItemIds((current) => {
      if (priceChangePreviewRows.length === 0) return current;
      const allSelected = priceChangePreviewRows.every((row) => current.includes(row.itemId));
      return allSelected ? [] : priceChangePreviewRows.map((row) => row.itemId);
    });
  }

  function removeSelectedPriceChangeRow(itemId: string) {
    setSelectedPriceChangeItemIds((current) => current.filter((id) => id !== itemId));
  }

  async function handleApplyPriceChange() {
    const newCostPrice = parseNullableNumber(priceChangeForm.newCostPrice);
    const newUnitPrice = parseNullableNumber(priceChangeForm.newUnitPrice);
    if (newCostPrice === null && newUnitPrice === null) {
      window.alert('변경할 입고단가 또는 판매단가를 입력해 주세요.');
      return;
    }

    const selectedRows = priceChangePreviewRows.filter((row) => selectedPriceChangeItemIds.includes(row.itemId));
    if (selectedRows.length === 0) {
      window.alert('검색 결과에서 변경할 항목을 체크해 주세요.');
      return;
    }

    const affectedDocumentCount = new Set(selectedRows.map((row) => row.documentId)).size;
    const confirmed = window.confirm(
      `선택한 ${selectedRows.length.toLocaleString('ko-KR')}개 품목, ${affectedDocumentCount.toLocaleString('ko-KR')}개 문서의 단가를 변경합니다.\nproducts 테이블은 변경하지 않습니다.\n계속할까요?`,
    );
    if (!confirmed) return;

    try {
      setPriceChangeApplying(true);
      setError(null);
      const result = await applyPriceChange({
        criteria: buildPriceChangeCriteria(),
        itemIds: selectedRows.map((row) => row.itemId),
        newCostPrice,
        newUnitPrice,
      });

      window.alert(
        `변경되었습니다.\n변경 품목: ${result.changedItemCount.toLocaleString('ko-KR')}개\n영향 문서: ${result.changedDocumentCount.toLocaleString('ko-KR')}개`,
      );
      setPriceChangePreviewRows([]);
      setSelectedPriceChangeItemIds([]);
      setPriceChangeSearched(false);
      setPriceChangeForm((current) => ({ ...current, newCostPrice: '', newUnitPrice: '' }));
      await loadPriceChangeLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : '단가 변경 적용에 실패했습니다.');
    } finally {
      setPriceChangeApplying(false);
    }
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
      setError(err instanceof Error ? err.message : '?④? ??μ뿉 ?ㅽ뙣?덉뒿?덈떎.');
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
      window.alert('?ㅼ슫濡쒕뱶???곗씠?곌? ?놁뒿?덈떎.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      activeTab === 'masters' ? '怨듯넻?덈ぉ' : '?⑺뭹泥섎퀎?덈ぉ',
    );
    XLSX.writeFile(workbook, `?덈ぉ愿由?${activeTab}_${formatFileStamp(new Date())}.xlsx`);
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
    handleApplyPriceChange,
    handlePreviewPriceChange,
    removeSelectedPriceChangeRow,
    toggleAllPriceChangePreviewRows,
    togglePriceChangePreviewRow,
    updateProductPriceDraft,
    updatePriceChangeForm,
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
    priceChangeApplying,
    priceChangeForm,
    priceChangeLoadingPreview,
    priceChangeLogs,
    priceChangePreviewRows,
    priceChangeReceiverOptions,
    priceChangeSearched,
    selectedPriceChangeItemIds,
    products,
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


