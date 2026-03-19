import { useEffect, useMemo, useState, type FormEvent } from 'react';
import PageHeader from '../components/PageHeader';
import { fetchClients } from '../api/clients';
import {
  createProduct,
  fetchProducts,
  removeProduct,
  updateProduct,
} from '../api/products';
import type { Client } from '../types/client';
import type { Product, ProductInput } from '../types/product';

const defaultGubun = '컵';

const emptyForm: ProductInput = {
  gubun: defaultGubun,
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

export default function MasterProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [gubunFilter, setGubunFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
    () => [...new Set(products.map((product) => product.client).filter(Boolean))].sort(),
    [products],
  );

  const gubunOptions = useMemo(
    () => [...new Set(products.map((product) => product.gubun).filter(Boolean))].sort(),
    [products],
  );

  const formClientOptions = useMemo(
    () => [...new Set(clients.map((client) => client.name).filter(Boolean))].sort(),
    [clients],
  );

  const filteredProducts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return products.filter((product) => {
      if (clientFilter && product.client !== clientFilter) return false;
      if (gubunFilter && product.gubun !== gubunFilter) return false;
      if (!keyword) return true;

      return [product.client, product.gubun, product.name1, product.name2, product.supplier]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [clientFilter, gubunFilter, products, query]);

  function openCreateModal() {
    setEditingProduct(null);
    setForm({
      ...emptyForm,
      client: formClientOptions[0] ?? '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      gubun: product.gubun || defaultGubun,
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
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(null);
  }

  function updateForm<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      const eaPerB = next.ea_per_b;
      const boxPerP = next.box_per_p;
      next.ea_per_p = eaPerB && boxPerP ? eaPerB * boxPerP : null;
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.client.trim()) {
      setFormError('납품처를 선택해주세요.');
      return;
    }

    if (!form.name1.trim()) {
      setFormError('품목명 - 출고의뢰서를 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: ProductInput = {
        gubun: form.gubun.trim() || defaultGubun,
        client: form.client.trim(),
        supplier: form.supplier.trim(),
        name1: form.name1.trim(),
        name2: form.name2.trim() || form.name1.trim(),
        cost_price: form.cost_price,
        sell_price: form.sell_price,
        ea_per_b: form.ea_per_b,
        box_per_p: form.box_per_p,
        ea_per_p: form.ea_per_b && form.box_per_p ? form.ea_per_b * form.box_per_p : null,
        pallets_per_truck: form.pallets_per_truck,
      };

      if (editingProduct) {
        const saved = await updateProduct(editingProduct.id, editingProduct.no, payload);
        setProducts((current) =>
          current.map((product) => (product.id === editingProduct.id ? saved : product)),
        );
      } else {
        const saved = await createProduct(payload);
        setProducts((current) => [...current, saved]);
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '품목 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `"${product.name1}" 품목을 삭제하시겠습니까?\n이 작업은 dev DB에 반영됩니다.`,
    );

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
      <PageHeader
        title="품목 관리"
        description="품목 규격, 단가, 포장 단위를 관리합니다."
        action={
          <div className="button-row">
            <button className="btn btn-secondary" onClick={() => void loadPageData()}>
              새로고침
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + 품목 추가
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="card">
        <div className="toolbar toolbar-grid product-toolbar">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="품목명, 거래처, 구분 검색.."
          />
          <select
            className="search-input"
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
          >
            <option value="">전체 거래처</option>
            {clientOptions.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
          <select
            className="search-input"
            value={gubunFilter}
            onChange={(event) => setGubunFilter(event.target.value)}
          >
            <option value="">전체 구분</option>
            {gubunOptions.map((gubun) => (
              <option key={gubun} value={gubun}>
                {gubun}
              </option>
            ))}
          </select>
          <div className="toolbar-meta">검색 결과 {filteredProducts.length}건</div>
        </div>

        {loading ? (
          <div className="empty-state">품목 목록을 불러오는 중입니다...</div>
        ) : (
          <div className="table-wrap">
            <table className="table product-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 88 }}>구분</th>
                  <th>납품처</th>
                  <th>품목명(출고의뢰서)</th>
                  <th>품목명(거래명세서)</th>
                  <th style={{ width: 96 }}>출고처</th>
                  <th style={{ width: 96 }}>외주단가</th>
                  <th style={{ width: 96 }}>판매단가</th>
                  <th style={{ width: 88 }}>1B=ea</th>
                  <th style={{ width: 88 }}>1P=BOX</th>
                  <th style={{ width: 120 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="table-empty">
                      표시할 품목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.no ?? '-'}</td>
                      <td>
                        <span className="badge badge-muted-blue">{product.gubun || '-'}</span>
                      </td>
                      <td>{product.client || '-'}</td>
                      <td>
                        <div className="table-primary">{product.name1 || '-'}</div>
                      </td>
                      <td>{product.name2 || product.name1 || '-'}</td>
                      <td>{product.supplier || '-'}</td>
                      <td>{formatNumber(product.cost_price)}</td>
                      <td>{formatNumber(product.sell_price)}</td>
                      <td>{formatNumber(product.ea_per_b)}</td>
                      <td>{formatNumber(product.box_per_p)}</td>
                      <td>
                        <div className="button-row">
                          <button
                            className="btn btn-secondary"
                            onClick={() => openEditModal(product)}
                          >
                            수정
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => void handleDelete(product)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{editingProduct ? '품목 수정' : '품목 추가'}</h2>
                <p>이번 단계에서는 dev DB의 `products` 테이블에 바로 반영됩니다.</p>
              </div>
              <button className="btn btn-secondary" onClick={closeModal}>
                닫기
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>구분 *</span>
                  <select
                    className="search-input"
                    value={form.gubun}
                    onChange={(event) => updateForm('gubun', event.target.value)}
                  >
                    {['컵', '실링', '스트로우', '기타', '컵뚜껑'].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>납품처 *</span>
                  <select
                    className="search-input"
                    value={form.client}
                    onChange={(event) => updateForm('client', event.target.value)}
                  >
                    <option value="">납품처 선택</option>
                    {formClientOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>출고처</span>
                  <input
                    value={form.supplier}
                    onChange={(event) => updateForm('supplier', event.target.value)}
                    placeholder="예: 성동, 파주"
                  />
                </label>

                <label className="field">
                  <span>외주 단가 (원/ea)</span>
                  <input
                    type="number"
                    value={form.cost_price ?? ''}
                    onChange={(event) => updateForm('cost_price', parseNullableNumber(event.target.value))}
                    placeholder="0"
                  />
                </label>

                <label className="field field-span-2">
                  <span>품목명(출고의뢰서) *</span>
                  <input
                    value={form.name1}
                    onChange={(event) => updateForm('name1', event.target.value)}
                    placeholder="출고의뢰서에 표시될 품목명"
                  />
                </label>

                <label className="field field-span-2">
                  <span>품목명(거래명세서)</span>
                  <input
                    value={form.name2}
                    onChange={(event) => updateForm('name2', event.target.value)}
                    placeholder="비워두면 출고의뢰서 품목명을 사용합니다."
                  />
                </label>

                <label className="field">
                  <span>판매 단가 (원/ea)</span>
                  <input
                    type="number"
                    value={form.sell_price ?? ''}
                    onChange={(event) => updateForm('sell_price', parseNullableNumber(event.target.value))}
                    placeholder="0"
                  />
                </label>

                <label className="field">
                  <span>1 BOX = ea</span>
                  <input
                    type="number"
                    value={form.ea_per_b ?? ''}
                    onChange={(event) => updateForm('ea_per_b', parseNullableInteger(event.target.value))}
                    placeholder="예: 1800"
                  />
                </label>

                <label className="field">
                  <span>1 P = BOX</span>
                  <input
                    type="number"
                    value={form.box_per_p ?? ''}
                    onChange={(event) => updateForm('box_per_p', parseNullableInteger(event.target.value))}
                    placeholder="예: 24"
                  />
                </label>

                <label className="field">
                  <span>1차당 파렛트</span>
                  <input
                    type="number"
                    value={form.pallets_per_truck ?? ''}
                    onChange={(event) =>
                      updateForm('pallets_per_truck', parseNullableInteger(event.target.value))
                    }
                    placeholder="예: 12"
                  />
                </label>
              </div>

              {formError ? <div className="alert alert-error">{formError}</div> : null}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '저장 중..' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR');
}

function parseNullableNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseNullableInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
