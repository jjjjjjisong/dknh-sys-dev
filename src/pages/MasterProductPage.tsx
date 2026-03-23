import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchClients } from '../api/clients';
import { createProduct, fetchProducts, removeProduct, updateProduct } from '../api/products';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import TableActionButton from '../components/ui/TableActionButton';
import type { Client } from '../types/client';
import type { Product, ProductInput } from '../types/product';

const DEFAULT_GUBUN = '컵';
const GUBUN_CHOICES = ['컵', '컵뚜껑', '실링', '스트로우', '기타'];
const PAGE_SIZE = 15;

const emptyForm: ProductInput = {
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
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  useEffect(() => {
    void loadPageData();
  }, []);

  async function loadPageData() {
    try {
      setLoading(true);
      setError(null);
      const [productRows, clientRows] = await Promise.all([fetchProducts(), fetchClients()]);
      setProducts(productRows);
      setClients(clientRows.filter((client) => client.active !== false));
    } catch (err) {
      setError(err instanceof Error ? err.message : '품목 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const clientOptions = useMemo(
    () => clients.filter((client) => client.name.trim()),
    [clients],
  );

  const filteredFormClientOptions = useMemo(() => {
    const keyword = form.client.trim().toLowerCase();
    if (!keyword) return clientOptions;
    return clientOptions.filter((client) => client.name.toLowerCase().includes(keyword));
  }, [clientOptions, form.client]);

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return products.filter((product) => {
      if (clientFilter && product.client !== clientFilter) return false;
      if (!keyword) return true;

      return [product.name1, product.name2, product.client, product.gubun, product.supplier]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [clientFilter, products, query]);

  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clientFilter, query]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredProducts.length]);

  function openCreateModal() {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormError(null);
    setClientDropdownOpen(false);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      clientId: product.clientId ?? '',
      gubun: product.gubun || DEFAULT_GUBUN,
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
    setFormError(null);
    setClientDropdownOpen(false);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(null);
    setClientDropdownOpen(false);
  }

  function updateForm<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((current) => {
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

  function handleClientSelect(clientName: string) {
    const selectedClient = clients.find((client) => client.name === clientName);
    updateForm('client', clientName);
    updateForm('clientId', selectedClient?.id ?? '');
    setClientDropdownOpen(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.client.trim() || !form.clientId) {
      setFormError('거래처를 선택해주세요.');
      return;
    }

    if (!form.name1.trim()) {
      setFormError('품목명을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: ProductInput = {
        clientId: form.clientId,
        gubun: form.gubun.trim() || DEFAULT_GUBUN,
        client: form.client.trim(),
        supplier: form.supplier.trim(),
        name1: form.name1.trim(),
        name2: form.name2.trim() || form.name1.trim(),
        cost_price: form.cost_price,
        sell_price: form.sell_price,
        ea_per_b: form.ea_per_b,
        box_per_p: form.box_per_p,
        ea_per_p:
          form.ea_per_b !== null && form.box_per_p !== null
            ? form.ea_per_b * form.box_per_p
            : null,
        pallets_per_truck: form.pallets_per_truck,
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, editingProduct.no, payload);
      } else {
        await createProduct(payload);
      }

      await loadPageData();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '품목 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(`"${product.name1}" 품목을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await removeProduct(product.id);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '품목 삭제에 실패했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="품목 관리" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="client-toolbar-stacked">
          <div className="toolbar toolbar-grid product-toolbar">
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
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="품목명, 거래처, 구분 검색 등 검색어를 입력하세요"
            />
          </div>

          <div className="client-toolbar-actions product-toolbar-actions">
            <div className="toolbar-meta">검색 결과 {filteredProducts.length}건</div>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              품목 추가
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">품목 목록을 불러오는 중입니다...</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 90 }}>구분</th>
                  <th style={{ width: 150 }}>거래처</th>
                  <th style={{ width: 340 }}>품목명</th>
                  <th style={{ width: 340 }}>품목명(거래명세서)</th>
                  <th style={{ width: 110 }}>출고처</th>
                  <th style={{ width: 110 }}>입고 단가</th>
                  <th style={{ width: 110 }}>판매 단가</th>
                  <th style={{ width: 90 }}>1B=ea</th>
                  <th style={{ width: 90 }}>1P=BOX</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 72 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="table-empty">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className="history-clickable-row"
                      onClick={() => openEditModal(product)}
                    >
                      <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td>{product.gubun || '-'}</td>
                      <td>{product.client || '-'}</td>
                      <td>
                        <div className="table-primary">{product.name1}</div>
                      </td>
                      <td>{product.name2 || '-'}</td>
                      <td>{product.supplier || '-'}</td>
                      <td>{product.cost_price ?? '-'}</td>
                      <td>{product.sell_price ?? '-'}</td>
                      <td>{product.ea_per_b ?? '-'}</td>
                      <td>{product.box_per_p ?? '-'}</td>
                      <td>
                        <span className="badge">사용중</span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="button-row">
                          <TableActionButton
                            variant="danger"
                            onClick={() => void handleDelete(product)}
                          >
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
          totalItems={filteredProducts.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </section>

      <Modal
        open={modalOpen}
        title={editingProduct ? '품목 수정' : '품목 추가'}
        onClose={closeModal}
        closeOnOverlayClick={false}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              취소
            </Button>
            <Button type="submit" variant="primary" form="product-form" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <form id="product-form" className="form-grid" onSubmit={handleSubmit}>
          <FormField label="구분 *">
            <select
              value={form.gubun}
              onChange={(event) => updateForm('gubun', event.target.value)}
            >
              {GUBUN_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="거래처 *">
            <div className="client-search-box">
              <input
                className="search-input"
                value={form.client}
                onChange={(event) => {
                  const nextClientName = event.target.value;
                  const matchedClient = clients.find((client) => client.name === nextClientName);
                  updateForm('client', nextClientName);
                  updateForm('clientId', matchedClient?.id ?? '');
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

          <FormField label="출고처">
            <input
              value={form.supplier}
              onChange={(event) => updateForm('supplier', event.target.value)}
              placeholder="출고처 입력"
            />
          </FormField>

          <FormField label="품목명 *">
            <input
              value={form.name1}
              onChange={(event) => updateForm('name1', event.target.value)}
              placeholder="품목명 입력"
            />
          </FormField>

          <FormField label="품목명(거래명세서)">
            <input
              value={form.name2}
              onChange={(event) => updateForm('name2', event.target.value)}
              placeholder="거래명세서용 품목명 입력"
            />
          </FormField>

          <FormField label="입고 단가">
            <input
              value={formatNullableNumber(form.cost_price)}
              onChange={(event) => updateForm('cost_price', parseNullableNumber(event.target.value))}
              inputMode="decimal"
              placeholder="입고 단가"
            />
          </FormField>

          <FormField label="판매 단가">
            <input
              value={formatNullableNumber(form.sell_price)}
              onChange={(event) => updateForm('sell_price', parseNullableNumber(event.target.value))}
              inputMode="decimal"
              placeholder="판매 단가"
            />
          </FormField>

          <FormField label="1B=ea">
            <input
              value={formatNullableNumber(form.ea_per_b)}
              onChange={(event) => updateForm('ea_per_b', parseNullableNumber(event.target.value))}
              inputMode="numeric"
              placeholder="1B ea"
            />
          </FormField>

          <FormField label="1P=BOX">
            <input
              value={formatNullableNumber(form.box_per_p)}
              onChange={(event) => updateForm('box_per_p', parseNullableNumber(event.target.value))}
              inputMode="numeric"
              placeholder="1P BOX"
            />
          </FormField>

          <FormField label="1P=ea">
            <input value={formatNullableNumber(form.ea_per_p)} readOnly placeholder="자동 계산" />
          </FormField>

          <FormField label="1대당 파렛트">
            <input
              value={formatNullableNumber(form.pallets_per_truck)}
              onChange={(event) =>
                updateForm('pallets_per_truck', parseNullableNumber(event.target.value))
              }
              inputMode="numeric"
              placeholder="파렛트 수"
            />
          </FormField>

          {formError ? <Alert>{formError}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
