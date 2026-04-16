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
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import TableActionButton from '../components/ui/TableActionButton';
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
};

const emptyProductForm: ProductInput = {
  productMasterId: '',
  clientId: '',
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
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
    setMasterForm((current) => ({ ...current, [key]: value }));
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
    });
    setMasterFormError(null);
    setMasterModalOpen(true);
  }

  function openCreateProductModal() {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductFormError(null);
    setClientDropdownOpen(false);
    setProductModalOpen(true);
  }

  function openEditProductModal(product: Product) {
    setEditingProduct(product);
    setProductForm({
      productMasterId: product.productMasterId ?? '',
      clientId: product.clientId ?? '',
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
      name1: selectedMaster.name1,
      name2: selectedMaster.name2 || selectedMaster.name1,
    }));
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
                onClick={activeTab === 'masters' ? openCreateMasterModal : openCreateProductModal}
              >
                {activeTab === 'masters' ? '공통 품목 추가' : '거래처별 품목 추가'}
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">품목 목록을 불러오는 중입니다...</div>
        ) : activeTab === 'masters' ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 100 }}>구분</th>
                  <th style={{ minWidth: 260 }}>공통 품목명</th>
                  <th style={{ minWidth: 260 }}>거래명세서 기본명</th>
                  <th style={{ width: 110 }}>연결 개수</th>
                  <th style={{ width: 96 }}>상태</th>
                  <th style={{ width: 72 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredMasters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  (pagedRows as ProductMaster[]).map((master, index) => (
                    <tr
                      key={master.id}
                      className="history-clickable-row"
                      onClick={() => openEditMasterModal(master)}
                    >
                      <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td><div className="table-clamp-2" title={master.gubun || '-'}>{master.gubun || '-'}</div></td>
                      <td><div className="table-clamp-2" title={master.name1 || '-'}>{master.name1 || '-'}</div></td>
                      <td><div className="table-clamp-2" title={master.name2 || '-'}>{master.name2 || '-'}</div></td>
                      <td>{master.linkedProductCount}</td>
                      <td>
                        <span className={master.delYn === 'Y' ? 'badge badge-muted' : 'badge'}>
                          {master.delYn === 'Y' ? '비활성' : '사용중'}
                        </span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="button-row">
                          <TableActionButton variant="danger" onClick={() => void handleDeleteMaster(master)}>
                            삭제
                          </TableActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 46 }}>No</th>
                  <th style={{ width: 80 }}>구분</th>
                  <th style={{ minWidth: 180 }}>공통 품목</th>
                  <th style={{ width: 150 }}>거래처</th>
                  <th style={{ minWidth: 200 }}>거래처별 품목명</th>
                  <th style={{ width: 120 }}>공급처</th>
                  <th style={{ width: 100, textAlign: 'right' }}>입고 단가</th>
                  <th style={{ width: 100, textAlign: 'right' }}>판매 단가</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 60 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-empty">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  (pagedRows as Product[]).map((product, index) => (
                    <tr
                      key={product.id}
                      className="history-clickable-row"
                      onClick={() => openEditProductModal(product)}
                    >
                      <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td><div className="table-clamp-2" title={product.gubun || '-'}>{product.gubun || '-'}</div></td>
                      <td><div className="table-clamp-2" title={product.masterName1 || '-'}>{product.masterName1 || '-'}</div></td>
                      <td><div className="table-clamp-2" title={product.client || '-'}>{product.client || '-'}</div></td>
                      <td><div className="table-clamp-2" title={product.name1 || '-'}>{product.name1 || '-'}</div></td>
                      <td><div className="table-clamp-2" title={product.supplier || '-'}>{product.supplier || '-'}</div></td>
                      <td style={{ textAlign: 'right' }}>{product.cost_price ?? '-'}</td>
                      <td style={{ textAlign: 'right' }}>{product.sell_price ?? '-'}</td>
                      <td>
                        <span className={product.delYn === 'Y' ? 'badge badge-muted' : 'badge'}>
                          {product.delYn === 'Y' ? '비활성' : '사용중'}
                        </span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="button-row">
                          <TableActionButton variant="danger" onClick={() => void handleDeleteProduct(product)}>
                            삭제
                          </TableActionButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={activeRows.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </section>

      <Modal
        open={masterModalOpen}
        title={editingMaster ? '공통 품목 수정' : '공통 품목 추가'}
        onClose={closeMasterModal}
        closeOnOverlayClick={false}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeMasterModal}>
              취소
            </Button>
            <Button type="submit" variant="primary" form="product-master-form" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <form id="product-master-form" className="form-grid" onSubmit={handleMasterSubmit}>
          <FormField label="구분 *">
            <select
              value={masterForm.gubun}
              onChange={(event) => updateMasterForm('gubun', event.target.value)}
            >
              {GUBUN_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="공통 품목명 *">
            <input
              value={masterForm.name1}
              onChange={(event) => updateMasterForm('name1', event.target.value)}
              placeholder="공통 품목명 입력"
            />
          </FormField>

          <FormField label="거래명세서 기본명">
            <input
              value={masterForm.name2}
              onChange={(event) => updateMasterForm('name2', event.target.value)}
              placeholder="비워두면 공통 품목명과 동일하게 저장"
            />
          </FormField>

          {editingMaster ? (
            <div className="field">
              <span>연결된 거래처별 품목</span>
              <div>
                {linkedProductsForEditingMaster.length === 0 ? (
                  <span style={{ color: 'var(--text-3)', fontSize: 13 }}>연결된 거래처별 품목이 없습니다.</span>
                ) : (
                  <span className="badge">{linkedProductsForEditingMaster.length}개 연결됨</span>
                )}
              </div>
            </div>
          ) : null}

          {masterFormError ? <Alert>{masterFormError}</Alert> : null}
        </form>
      </Modal>

      <Modal
        open={productModalOpen}
        title={editingProduct ? '거래처별 품목 수정' : '거래처별 품목 추가'}
        onClose={closeProductModal}
        closeOnOverlayClick={false}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeProductModal}>
              취소
            </Button>
            <Button type="submit" variant="primary" form="product-form" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <form id="product-form" className="form-grid" onSubmit={handleProductSubmit}>

          {/* ── 기본 정보 ── */}
          <FormField label="공통 품목 *">
            <select
              value={productForm.productMasterId}
              onChange={(event) => {
                const nextId = event.target.value;
                updateProductForm('productMasterId', nextId);
                applyProductMasterDefaults(nextId);
              }}
            >
              <option value="">공통 품목 선택</option>
              {productMasters.map((master) => (
                <option key={master.id} value={master.id}>
                  {master.name1}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="거래처 *">
            <div className="client-search-box" ref={clientSearchBoxRef}>
              <input
                className="search-input"
                value={productForm.client}
                onChange={(event) => {
                  const nextClientName = event.target.value;
                  const matchedClient = clients.find((client) => client.name === nextClientName);
                  updateProductForm('client', nextClientName);
                  updateProductForm('clientId', matchedClient?.id ?? '');
                  setClientDropdownOpen(true);
                }}
                onFocus={() => setClientDropdownOpen(true)}
                placeholder="거래처를 선택하세요."
              />
              <span className="client-search-caret" aria-hidden="true" />
              {clientDropdownOpen ? (
                <div className="client-search-dropdown">
                  {filteredFormClientOptions.length > 0 ? (
                    filteredFormClientOptions.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        className="client-search-option"
                        onClick={() => handleClientSelect(client.name)}
                      >
                        {client.name}
                      </button>
                    ))
                  ) : (
                    <div className="client-search-option disabled">검색 결과가 없습니다.</div>
                  )}
                </div>
              ) : null}
            </div>
          </FormField>

          {/* ── 공통품목 선택 시 자동완성되는 필드 ── */}
          <div className="product-form-section field-span-2">
            <p className="product-form-section-label">품목명</p>
          </div>

          <FormField label="거래처별 품목명 *">
            <input
              value={productForm.name1}
              onChange={(event) => updateProductForm('name1', event.target.value)}
              placeholder="거래처별 품목명 입력"
            />
          </FormField>

          <FormField label="거래명세서명">
            <input
              value={productForm.name2}
              onChange={(event) => updateProductForm('name2', event.target.value)}
              placeholder="비워두면 거래처별 품목명과 동일하게 저장"
            />
          </FormField>

          <FormField label="구분 *">
            <select
              value={productForm.gubun}
              onChange={(event) => updateProductForm('gubun', event.target.value)}
            >
              {GUBUN_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="공급처">
            <input
              value={productForm.supplier}
              onChange={(event) => updateProductForm('supplier', event.target.value)}
              placeholder="공급처 입력"
            />
          </FormField>

          <div className="product-form-section field-span-2">
            <p className="product-form-section-label">단가 / 수량</p>
          </div>

          <FormField label="입고 단가">
            <input
              value={formatNullableNumber(productForm.cost_price)}
              onChange={(event) => updateProductForm('cost_price', parseNullableNumber(event.target.value))}
              inputMode="decimal"
              placeholder="입고 단가"
            />
          </FormField>

          <FormField label="판매 단가">
            <input
              value={formatNullableNumber(productForm.sell_price)}
              onChange={(event) => updateProductForm('sell_price', parseNullableNumber(event.target.value))}
              inputMode="decimal"
              placeholder="판매 단가"
            />
          </FormField>

          <FormField label="1B=ea">
            <input
              value={formatNullableNumber(productForm.ea_per_b)}
              onChange={(event) => updateProductForm('ea_per_b', parseNullableNumber(event.target.value))}
              inputMode="numeric"
              placeholder="1B ea"
            />
          </FormField>

          <FormField label="1P=BOX">
            <input
              value={formatNullableNumber(productForm.box_per_p)}
              onChange={(event) => updateProductForm('box_per_p', parseNullableNumber(event.target.value))}
              inputMode="numeric"
              placeholder="1P BOX"
            />
          </FormField>

          <FormField label="1P=ea">
            <input value={formatNullableNumber(productForm.ea_per_p)} readOnly placeholder="자동 계산" />
          </FormField>

          <FormField label="1대당 팔레트">
            <input
              value={formatNullableNumber(productForm.pallets_per_truck)}
              onChange={(event) =>
                updateProductForm('pallets_per_truck', parseNullableNumber(event.target.value))
              }
              inputMode="numeric"
              placeholder="팔레트 수"
            />
          </FormField>

          {productFormError ? <Alert>{productFormError}</Alert> : null}
        </form>
      </Modal>
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
