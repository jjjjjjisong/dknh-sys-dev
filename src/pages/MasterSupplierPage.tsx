import { useEffect, useMemo, useState, type FormEvent } from 'react';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import TableActionButton from '../components/ui/TableActionButton';
import {
  createSupplier,
  fetchSuppliers,
  removeSupplier,
  updateSupplier,
} from '../api/suppliers';
import type { Supplier, SupplierInput } from '../types/supplier';

const PAGE_SIZE = 15;

const emptyForm: SupplierInput = {
  name: '',
  bizNo: '',
  owner: '',
  address: '',
  businessType: '',
  businessItem: '',
  active: true,
};

export default function MasterSupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [form, setForm] = useState<SupplierInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    void loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      if (!keyword) return true;

      return [
        supplier.name,
        supplier.bizNo,
        supplier.owner,
        supplier.address,
        supplier.businessType,
        supplier.businessItem,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [query, suppliers]);

  const pagedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredSuppliers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredSuppliers.length]);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchSuppliers();
      setSuppliers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공급자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingSupplierId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplierId(supplier.id);
    setForm({
      name: supplier.name,
      bizNo: supplier.bizNo,
      owner: supplier.owner,
      address: supplier.address,
      businessType: supplier.businessType,
      businessItem: supplier.businessItem,
      active: supplier.active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(null);
  }

  function updateForm<K extends keyof SupplierInput>(key: K, value: SupplierInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('상호를 입력해 주세요.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: SupplierInput = {
        name: form.name.trim(),
        bizNo: form.bizNo.trim(),
        owner: form.owner.trim(),
        address: form.address.trim(),
        businessType: form.businessType.trim(),
        businessItem: form.businessItem.trim(),
        active: form.active,
      };

      if (editingSupplierId) {
        await updateSupplier(editingSupplierId, payload);
      } else {
        await createSupplier(payload);
      }

      await loadSuppliers();
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '공급자를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = window.confirm(`"${supplier.name}" 공급자를 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await removeSupplier(supplier.id);
      setSuppliers((current) => current.filter((item) => item.id !== supplier.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '공급자를 삭제하지 못했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="공급자 관리" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="toolbar client-toolbar client-toolbar-stacked">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="상호, 등록번호, 성명, 주소, 업태, 종목으로 검색"
          />
          <div className="client-toolbar-actions">
            <div className="toolbar-meta">검색 결과 {filteredSuppliers.length}건</div>
            <div className="button-row">
              <Button type="button" variant="primary" onClick={openCreateModal}>
                공급자 추가
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">공급자 목록을 불러오는 중...</div>
        ) : (
          <div className="table-wrap">
            <table className="table client-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 150 }}>상호</th>
                  <th style={{ width: 130 }}>등록번호</th>
                  <th style={{ width: 96 }}>성명</th>
                  <th style={{ width: 400 }}>사업장주소</th>
                  <th style={{ width: 180 }}>업태</th>
                  <th style={{ width: 160 }}>종목</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 72 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-empty">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  pagedSuppliers.map((supplier, index) => (
                    <tr
                      key={supplier.id}
                      className="history-clickable-row"
                      onClick={() => openEditModal(supplier)}
                    >
                      <td>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                      <td>
                        <div className="table-primary table-clamp-2" title={supplier.name}>
                          {supplier.name}
                        </div>
                      </td>
                      <td>
                        <div className="table-clamp-2" title={supplier.bizNo || '-'}>
                          {supplier.bizNo || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="table-clamp-2" title={supplier.owner || '-'}>
                          {supplier.owner || '-'}
                        </div>
                      </td>
                      <td className="table-address">
                        <div className="table-clamp-2" title={supplier.address || '-'}>
                          {supplier.address || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="table-clamp-2" title={supplier.businessType || '-'}>
                          {supplier.businessType || '-'}
                        </div>
                      </td>
                      <td>
                        <div className="table-clamp-2" title={supplier.businessItem || '-'}>
                          {supplier.businessItem || '-'}
                        </div>
                      </td>
                      <td>
                        <span className={supplier.active === false ? 'badge badge-muted' : 'badge'}>
                          {supplier.active === false ? '비활성' : '사용중'}
                        </span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="button-row">
                          <TableActionButton variant="danger" onClick={() => void handleDelete(supplier)}>
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
          totalItems={filteredSuppliers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </section>

      <Modal
        open={modalOpen}
        title={editingSupplierId ? '공급자 수정' : '공급자 추가'}
        onClose={closeModal}
        closeOnOverlayClick={false}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              취소
            </Button>
            <Button type="submit" form="supplier-form" variant="primary" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <div className="modal-head-actions">
          <Button type="button" variant="secondary" onClick={closeModal}>
            닫기
          </Button>
        </div>

        <form id="supplier-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="상호 *">
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
            </FormField>

            <FormField label="등록번호">
              <input value={form.bizNo} onChange={(event) => updateForm('bizNo', event.target.value)} />
            </FormField>

            <FormField label="성명">
              <input value={form.owner} onChange={(event) => updateForm('owner', event.target.value)} />
            </FormField>

            <FormField label="업태">
              <input
                value={form.businessType}
                onChange={(event) => updateForm('businessType', event.target.value)}
              />
            </FormField>

            <FormField label="종목">
              <input
                value={form.businessItem}
                onChange={(event) => updateForm('businessItem', event.target.value)}
              />
            </FormField>

            <FormField label="상태" className="field-check">
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateForm('active', event.target.checked)}
                />
                사용중
              </label>
            </FormField>

            <FormField label="사업장주소" className="field-span-2">
              <textarea value={form.address} onChange={(event) => updateForm('address', event.target.value)} />
            </FormField>
          </div>

          {formError ? <Alert>{formError}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
