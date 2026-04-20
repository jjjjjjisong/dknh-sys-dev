import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { fetchClients } from '../api/clients';
import {
  createProduct,
  createProductMaster,
  fetchProductMasters,
  fetchProducts,
  removeProduct,
  removeProductMaster,
  updateProduct,
  updateProductMaster,
} from '../api/products';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import {
  ProductItemModal,
  ProductMasterModal,
} from '../components/products/ProductManagementModals';
import {
  MasterProductsTable,
  ProductsTable,
} from '../components/products/ProductManagementTables';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import type { Client } from '../types/client';
import type {
  Product,
  ProductInput,
  ProductMaster,
  ProductMasterInput,
} from '../types/product';

const DEFAULT_GUBUN = '기타';
const GUBUN_CHOICES = ['커피', '커피부속', '비닐', '스트로우', '기타'];
const PAGE_SIZE = 15;

const emptyMasterForm: ProductMasterInput = {
  gubun: DEFAULT_GUBUN,
  name1: '',
  name2: '',
  ea_per_b: null,
  box_per_p: null,
  ea_per_p: null,
  pallets_per_truck: null,
};

const emptyProductForm: ProductInput = {
  productMasterId: '',
  clientId: '',
  receiver: '',
  gubun: DEFAULT_GUBUN,
  client: '',
  supplier: '',
  name1: '',
  name2: '',
  cost_price: null,
  sell_price: null,
  ea_per_b: null,
  box_per_p: null,
  ea_per_p: null,
  pallets_per_truck: null,
};

type ActiveTab = 'masters' | 'products';

function parseNullableNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNullableNumber(value: number | null) {
  return value === null ? '' : String(value);
}

export default function MasterProductPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('masters');
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
  const [masterForm, setMasterForm] = useState<ProductMasterInput>(emptyMasterForm);
  const [productForm, setProductForm] = useState<ProductInput>(emptyProductForm);
  const [masterFormError, setMasterFormError] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [expandedMasterIds, setExpandedMasterIds] = useState<string[]>([]);
  const clientSearchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadPageData();
  }, []);

  async function loadPageData() {
    try {
      setLoading(true);
      setError(null);
      const [productRows, masterRows, clientRows] = await Promise.all([
        fetchProducts(),
        fetchProductMasters(),
        fetchClients(),
      ]);
      setProducts(productRows);
      setProductMasters(masterRows);
      setClients(clientRows.filter((client) => client.active !== false));
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
        product.supplier,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [clientFilter, products, query]);

  const productsByMasterId = useMemo(() => {
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
  }, [products]);

  const activeRows = activeTab === 'masters' ? filteredMasters : filteredProducts;
  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return activeRows.slice(start, start + PAGE_SIZE);
  }, [activeRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, clientFilter, query]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [activeRows.length, currentPage]);

  // 거래처 드롭다운 외부 클릭 닫기
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
    setMasterForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'ea_per_b' || key === 'box_per_p') {
        next.ea_per_p =
          next.ea_per_b !== null && next.box_per_p !== null
            ? next.ea_per_b * next.box_per_p
            : null;
      }
      return next;
    });
  }

  function updateProductForm<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setProductForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'ea_per_b' || key === 'box_per_p') {
        next.ea_per_p =
          next.ea_per_b !== null && next.box_per_p !== null
            ? next.ea_per_b * next.box_per_p
            : null;
      }
      return next;
    });
  }

  function openCreateMasterModal() {
    setEditingMaster(null);
    setMasterForm(emptyMasterForm);
    setMasterFormError(null);
    setMasterModalOpen(true);
  }

  function openEditMasterModal(master: ProductMaster) {
    setEditingMaster(master);
    setMasterForm({
      gubun: master.gubun || DEFAULT_GUBUN,
      name1: master.name1,
      name2: master.name2,
      ea_per_b: master.ea_per_b,
      box_per_p: master.box_per_p,
      ea_per_p: master.ea_per_p,
      pallets_per_truck: master.pallets_per_truck,
    });
    setMasterFormError(null);
    setMasterModalOpen(true);
  }

  function openCreateProductModal(masterId?: string) {
    setEditingProduct(null);
    setProductForm(
      masterId
        ? {
            ...emptyProductForm,
            productMasterId: masterId,
          }
        : emptyProductForm,
    );
    setProductFormError(null);
    setClientDropdownOpen(false);
    setProductModalOpen(true);
    if (masterId) {
      applyProductMasterDefaults(masterId);
    }
  }

  function openEditProductModal(product: Product) {
    setEditingProduct(product);
    setProductForm({
      productMasterId: product.productMasterId ?? '',
      clientId: product.clientId ?? '',
      receiver: product.receiver,
      gubun: product.gubun || product.masterGubun || DEFAULT_GUBUN,
      client: product.client,
      supplier: product.supplier,
      name1: product.name1,
      name2: product.name2,
      cost_price: product.cost_price,
      sell_price: product.sell_price,
      ea_per_b: product.ea_per_b,
      box_per_p: product.box_per_p,
      ea_per_p: product.ea_per_p,
      pallets_per_truck: product.pallets_per_truck,
    });
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
    const selectedMaster = productMasters.find((master) => master.id === productMasterId) ?? null;
    if (!selectedMaster) return;

    setProductForm((current) => ({
      ...current,
      productMasterId: selectedMaster.id,
      gubun: selectedMaster.gubun || current.gubun || DEFAULT_GUBUN,
      ea_per_b: selectedMaster.ea_per_b,
      box_per_p: selectedMaster.box_per_p,
      ea_per_p: selectedMaster.ea_per_p,
      pallets_per_truck: selectedMaster.pallets_per_truck,
    }));
  }

  function toggleMasterAccordion(masterId: string) {
    setExpandedMasterIds((current) =>
      current.includes(masterId)
        ? current.filter((id) => id !== masterId)
        : [...current, masterId],
    );
  }

  async function handleMasterSubmit(event: FormEvent) {
    event.preventDefault();

    if (!masterForm.name1.trim()) {
      setMasterFormError('공통 품목명을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      setMasterFormError(null);

      const payload: ProductMasterInput = {
        gubun: masterForm.gubun.trim() || DEFAULT_GUBUN,
        name1: masterForm.name1.trim(),
        name2: masterForm.name2.trim() || masterForm.name1.trim(),
        ea_per_b: masterForm.ea_per_b,
        box_per_p: masterForm.box_per_p,
        ea_per_p:
          masterForm.ea_per_b !== null && masterForm.box_per_p !== null
            ? masterForm.ea_per_b * masterForm.box_per_p
            : masterForm.ea_per_p,
        pallets_per_truck: masterForm.pallets_per_truck,
      };

      if (editingMaster) {
        await updateProductMaster(editingMaster.id, payload);
      } else {
        await createProductMaster(payload);
      }

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

    if (!productForm.productMasterId) {
      setProductFormError('공통 품목을 선택해 주세요.');
      return;
    }

    if (!productForm.client.trim() || !productForm.clientId) {
      setProductFormError('거래처를 선택해 주세요.');
      return;
    }

    if (!productForm.name1.trim()) {
      setProductFormError('거래처별 품목명을 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      setProductFormError(null);

      const payload: ProductInput = {
        productMasterId: productForm.productMasterId,
        clientId: productForm.clientId,
        receiver: productForm.receiver.trim(),
        gubun: productForm.gubun.trim() || DEFAULT_GUBUN,
        client: productForm.client.trim(),
        supplier: productForm.supplier.trim(),
        name1: productForm.name1.trim(),
        name2: productForm.name2.trim() || productForm.name1.trim(),
        cost_price: productForm.cost_price,
        sell_price: productForm.sell_price,
        ea_per_b: productForm.ea_per_b,
        box_per_p: productForm.box_per_p,
        ea_per_p:
          productForm.ea_per_b !== null && productForm.box_per_p !== null
            ? productForm.ea_per_b * productForm.box_per_p
            : null,
        pallets_per_truck: productForm.pallets_per_truck,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, editingProduct.no, payload);
      } else {
        await createProduct(payload);
      }

      await loadPageData();
      setProductModalOpen(false);
    } catch (err) {
      setProductFormError(err instanceof Error ? err.message : '거래처별 품목 저장에 실패했습니다.');
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
    const confirmed = window.confirm(`"${product.name1}" 거래처별 품목을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await removeProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '거래처별 품목 삭제에 실패했습니다.');
    }
  }

  const linkedProductsForEditingMaster = useMemo(() => {
    if (!editingMaster) return [];
    return products.filter((product) => product.productMasterId === editingMaster.id);
  }, [editingMaster, products]);

  function handleDownloadExcel() {
    const rows =
      activeTab === 'masters'
        ? filteredMasters.map((master) => ({
            구분: master.gubun || '',
            공통품목명: master.name1 || '',
            거래명세서명: master.name2 || '',
            연결개수: master.linkedProductCount,
          }))
        : filteredProducts.map((product) => ({
            구분: product.gubun || '',
            공통품목명: product.masterName1 || '',
            거래처: product.client || '',
            거래처별품목명: product.name1 || '',
            거래명세서명: product.name2 || '',
            공급처: product.supplier || '',
            입고단가: product.cost_price ?? '',
            판매단가: product.sell_price ?? '',
            '1B=ea': product.ea_per_b ?? '',
            '1P=BOX': product.box_per_p ?? '',
          }));

    if (rows.length === 0) {
      window.alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'masters' ? '공통품목' : '거래처별품목');
    XLSX.writeFile(workbook, `품목관리_${activeTab}_${formatFileStamp(new Date())}.xlsx`);
  }

  return (
    <div className="page-content">
      <PageHeader title="품목 관리" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="product-tab-list">
          <button
            type="button"
            className={`product-tab-btn${activeTab === 'masters' ? ' active' : ''}`}
            onClick={() => setActiveTab('masters')}
          >
            공통 품목
          </button>
          <button
            type="button"
            className={`product-tab-btn${activeTab === 'products' ? ' active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            거래처별 품목
          </button>
        </div>

        <div className="client-toolbar-stacked">
          <div className="toolbar toolbar-grid product-toolbar">
            {activeTab === 'products' ? (
              <select
                className="search-input"
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
              >
                <option value="">전체 거래처</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}

            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                activeTab === 'masters'
                  ? '공통 품목명, 거래명세서명, 구분으로 검색하세요.'
                  : '공통 품목, 거래처, 거래처별 품목명으로 검색하세요.'
              }
            />
          </div>

          <div className="client-toolbar-actions product-toolbar-actions">
            <div className="toolbar-meta">검색 결과 {activeRows.length}건</div>
            <div className="button-row">
              <Button type="button" variant="secondary" className="excel-download-button" onClick={handleDownloadExcel}>
                엑셀다운
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={
                  activeTab === 'masters' ? openCreateMasterModal : () => openCreateProductModal()
                }
              >
                {activeTab === 'masters' ? '공통 품목 추가' : '거래처별 품목 추가'}
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">품목 목록을 불러오는 중입니다...</div>
        ) : activeTab === 'masters' ? (
          <MasterProductsTable
            filteredMasters={filteredMasters}
            pagedMasters={pagedRows as ProductMaster[]}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            expandedMasterIds={expandedMasterIds}
            productsByMasterId={productsByMasterId}
            onToggleMaster={toggleMasterAccordion}
            onCreateChild={openCreateProductModal}
            onEditMaster={openEditMasterModal}
            onDeleteMaster={(master) => void handleDeleteMaster(master)}
            onEditChild={openEditProductModal}
            onDeleteChild={(product) => void handleDeleteProduct(product)}
          />
        ) : (
          <ProductsTable
            filteredProducts={filteredProducts}
            pagedProducts={pagedRows as Product[]}
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            onEditProduct={openEditProductModal}
            onDeleteProduct={(product) => void handleDeleteProduct(product)}
          />
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={activeRows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </section>

      <ProductMasterModal
        open={masterModalOpen}
        editingMaster={editingMaster}
        masterForm={masterForm}
        masterFormError={masterFormError}
        saving={saving}
        linkedProductsCount={linkedProductsForEditingMaster.length}
        gubunChoices={GUBUN_CHOICES}
        onClose={closeMasterModal}
        onSubmit={handleMasterSubmit}
        onUpdateForm={updateMasterForm}
        formatNullableNumber={formatNullableNumber}
        parseNullableNumber={parseNullableNumber}
      />

      <ProductItemModal
        open={productModalOpen}
        editingProduct={editingProduct}
        productForm={productForm}
        productFormError={productFormError}
        saving={saving}
        productMasters={productMasters}
        clients={clients}
        filteredFormClientOptions={filteredFormClientOptions}
        clientDropdownOpen={clientDropdownOpen}
        clientSearchBoxRef={clientSearchBoxRef}
        onClose={closeProductModal}
        onSubmit={handleProductSubmit}
        onUpdateForm={updateProductForm}
        onApplyMasterDefaults={applyProductMasterDefaults}
        onHandleClientSelect={handleClientSelect}
        onSetClientDropdownOpen={setClientDropdownOpen}
        formatNullableNumber={formatNullableNumber}
      />
    </div>
  );
}

function formatFileStamp(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
}
