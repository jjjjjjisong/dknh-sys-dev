import { useEffect, useMemo, useState, type FormEvent } from 'react';
import * as XLSX from 'xlsx';
import {
  createOrderBookEntry,
  fetchOrderBook,
  removeOrderBookEntry,
  updateManyOrderBookShippedStatus,
  updateOrderBookEntry,
  updateOrderBookShippedStatus,
} from '../api/order-book';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import type { OrderBookEntry, OrderBookInput, OrderBookShippingStatus } from '../types/order-book';

const today = new Date();

const emptyForm: OrderBookInput = {
  issueNo: '',
  date: today.toISOString().slice(0, 10),
  deadline: null,
  client: '',
  product: '',
  qty: 0,
  note: '',
  receipt: '',
  status: 'ST00',
  shippedStatus: '미출고',
};

type FilterType = 'all' | 'client' | 'product' | 'issueNo' | 'receipt';

function getDefaultDateRange() {
  const toDate = new Date();
  toDate.setFullYear(toDate.getFullYear() + 1);
  const fromDate = new Date();
  fromDate.setFullYear(fromDate.getFullYear() - 1);
  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
  };
}

export default function OrderBookPage() {
  const defaults = getDefaultDateRange();
  const [entries, setEntries] = useState<OrderBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [keyword, setKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OrderBookEntry | null>(null);
  const [form, setForm] = useState<OrderBookInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchUpdating, setBatchUpdating] = useState(false);

  useEffect(() => {
    void loadEntries();
  }, []);

  async function loadEntries() {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchOrderBook();
      setEntries(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수주대장 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const filteredEntries = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    return entries.filter((entry) => {
      const arriveDate = entry.deadline || '';
      if (dateFrom && arriveDate && arriveDate < dateFrom) return false;
      if (dateTo && arriveDate && arriveDate > dateTo) return false;
      if (!search) return true;

      if (filterType === 'client') return entry.client.toLowerCase().includes(search);
      if (filterType === 'product') return entry.product.toLowerCase().includes(search);
      if (filterType === 'issueNo') return entry.issueNo.toLowerCase().includes(search);
      if (filterType === 'receipt') return entry.receipt.toLowerCase().includes(search);

      return [entry.issueNo, entry.client, entry.receiver, entry.product, entry.receipt, entry.author]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [dateFrom, dateTo, entries, filterType, keyword]);

  const allChecked = filteredEntries.length > 0 && filteredEntries.every((entry) => selectedIds.includes(entry.id));

  function openEditModal(entry: OrderBookEntry) {
    setEditingEntry(entry);
    setForm({
      issueNo: entry.issueNo,
      date: entry.date,
      deadline: entry.deadline,
      client: entry.client,
      product: entry.product,
      qty: entry.qty,
      note: entry.note,
      receipt: entry.receipt,
      status: entry.status,
      shippedStatus: entry.shippedStatus,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(null);
  }

  function updateForm<K extends keyof OrderBookInput>(key: K, value: OrderBookInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(filteredEntries.map((entry) => entry.id));
      return;
    }
    setSelectedIds([]);
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, id]));
      return current.filter((item) => item !== id);
    });
  }

  async function handleBatchShip() {
    if (selectedIds.length === 0) return;

    try {
      setBatchUpdating(true);
      await updateManyOrderBookShippedStatus(selectedIds, '출고');
      setEntries((current) =>
        current.map((entry) =>
          selectedIds.includes(entry.id) ? { ...entry, shippedStatus: '출고' } : entry,
        ),
      );
      setSelectedIds([]);
      window.alert('선택한 품목들이 출고상태로 변경되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '일괄 출고처리에 실패했습니다.');
    } finally {
      setBatchUpdating(false);
    }
  }

  function handleDownloadExcel() {
    if (filteredEntries.length === 0) {
      window.alert('다운로드할 데이터가 없습니다.');
      return;
    }

    const rows = filteredEntries.map((entry) => ({
      발급번호: entry.issueNo || '',
      발주일자: formatDateForExport(entry.date),
      입고일자: formatDateForExport(entry.deadline),
      납품처: entry.client || '',
      수신처: entry.receiver || '',
      품목명: entry.product || '',
      수량: entry.qty ?? '',
      파렛트: entry.pallet ?? '',
      박스: entry.box ?? '',
      상태: entry.status === 'ST01' ? '거래취소' : '',
      출고상태: entry.shippedStatus,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '수주대장');

    const stamp = formatFileStamp(new Date());
    XLSX.writeFile(workbook, `수주대장_${stamp}.xlsx`);
  }

  async function handleShippedStatusChange(entry: OrderBookEntry, shippedStatus: OrderBookShippingStatus) {
    try {
      const updated = await updateOrderBookShippedStatus(entry.id, shippedStatus);
      setEntries((current) => current.map((item) => (item.id === entry.id ? { ...item, ...updated } : item)));
      window.alert(
        shippedStatus === '출고'
          ? '출고상태로 변경되었습니다.'
          : '미출고상태로 변경되었습니다.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '출고상태 변경에 실패했습니다.');
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!editingEntry && !form.client.trim()) {
      setFormError('납품처를 입력해주세요.');
      return;
    }

    if (!editingEntry && !form.product.trim()) {
      setFormError('품목명을 입력해주세요.');
      return;
    }

    if (!editingEntry && form.qty <= 0) {
      setFormError('수량은 1 이상이어야 합니다.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: OrderBookInput = {
        issueNo: form.issueNo.trim(),
        date: emptyToNull(form.date),
        deadline: emptyToNull(form.deadline),
        client: form.client.trim(),
        product: form.product.trim(),
        qty: form.qty,
        note: form.note.trim(),
        receipt: form.receipt.trim(),
        status: form.status,
        shippedStatus: form.shippedStatus,
      };

      if (editingEntry) {
        const saved = await updateOrderBookEntry(editingEntry.id, payload);
        setEntries((current) => current.map((entry) => (entry.id === editingEntry.id ? saved : entry)));
      } else {
        const saved = await createOrderBookEntry(payload);
        setEntries((current) => [saved, ...current]);
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '수주대장 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: OrderBookEntry) {
    const confirmed = window.confirm(`"${entry.client} / ${entry.product}" 항목을 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await removeOrderBookEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setSelectedIds((current) => current.filter((item) => item !== entry.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '수주대장 삭제에 실패했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="수주대장" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="history-filter-grid">
          <label className="field history-date-field">
            <span>입고일(시작)</span>
            <input
              className="history-date-input"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
          </label>

          <label className="field history-date-field">
            <span>입고일(종료)</span>
            <input
              className="history-date-input"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
          </label>

          <label className="field">
            <span>검색 필터</span>
            <select
              className="history-filter-select"
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as FilterType)}
            >
              <option value="all">전체</option>
              <option value="client">납품처</option>
              <option value="product">품목명</option>
              <option value="issueNo">발급번호</option>
              <option value="receipt">상태</option>
            </select>
          </label>

          <label className="field">
            <span>키워드</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="검색어를 입력해주세요."
            />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="history-toolbar">
          <Button type="button" variant="secondary" className="excel-download-button" onClick={handleDownloadExcel}>
            엑셀다운
          </Button>
          <Button type="button" variant="primary" onClick={() => void handleBatchShip()} disabled={selectedIds.length === 0 || batchUpdating}>
            {batchUpdating ? '처리 중...' : '일괄 출고처리'}
          </Button>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 42, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                    aria-label="전체 선택"
                  />
                </th>
                <th style={{ width: 100 }}>발급번호</th>
                <th style={{ width: 110, textAlign: 'center' }}>발주일자</th>
                <th style={{ width: 110, textAlign: 'center' }}>입고일자</th>
                <th style={{ minWidth: 140 }}>납품처</th>
                <th style={{ minWidth: 120 }}>수신처</th>
                <th style={{ minWidth: 180 }}>품목명</th>
                <th style={{ width: 90, textAlign: 'right' }}>수량</th>
                <th style={{ width: 90, textAlign: 'right' }}>파렛트</th>
                <th style={{ width: 80, textAlign: 'right' }}>박스</th>
                <th style={{ width: 80, textAlign: 'center' }}>상태</th>
                <th style={{ width: 110, textAlign: 'center' }}>출고상태</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="history-empty-cell">
                    수주대장 목록을 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={12} className="history-empty-cell">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={entry.status === 'ST01' ? 'history-row-cancelled history-clickable-row' : 'history-clickable-row'}
                    onClick={() => openEditModal(entry)}
                    title={entry.fromDoc ? '문서 연동 품목입니다.' : '클릭해서 수정할 수 있습니다.'}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(entry.id)}
                        onChange={(event) => toggleSelectOne(entry.id, event.target.checked)}
                        aria-label={`${entry.issueNo} 선택`}
                      />
                    </td>
                    <td>{entry.issueNo || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{formatDate(entry.date)}</td>
                    <td style={{ textAlign: 'center' }}>{formatDate(entry.deadline)}</td>
                    <td>{entry.client || '-'}</td>
                    <td>{entry.receiver || '-'}</td>
                    <td>{entry.product || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(entry.qty)}</td>
                    <td style={{ textAlign: 'right' }}>{formatNullableNumber(entry.pallet)}</td>
                    <td style={{ textAlign: 'right' }}>{formatNullableNumber(entry.box)}</td>
                    <td style={{ textAlign: 'center' }}>{entry.status === 'ST01' ? '거래취소' : ''}</td>
                    <td style={{ textAlign: 'center' }} onClick={(event) => event.stopPropagation()}>
                      <select
                        className="history-filter-select"
                        value={entry.shippedStatus}
                        onChange={(event) =>
                          void handleShippedStatusChange(entry, event.target.value as OrderBookShippingStatus)
                        }
                      >
                        <option value="미출고">미출고</option>
                        <option value="출고">출고</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={modalOpen}
        title="수주 항목 수정"
        description={editingEntry?.fromDoc ? '문서 연동 품목은 삭제할 수 없지만 상태와 비고는 수정할 수 있습니다.' : undefined}
        onClose={closeModal}
        footer={
          <>
            {editingEntry && !editingEntry.fromDoc ? (
              <Button type="button" variant="danger" onClick={() => void handleDelete(editingEntry)} disabled={saving}>
                삭제
              </Button>
            ) : <span />}
            <div className="button-row">
              <Button type="button" variant="secondary" onClick={closeModal}>
                취소
              </Button>
              <Button type="submit" form="order-book-form" variant="primary" disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </>
        }
      >
        <form id="order-book-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="발급번호">
              <input value={form.issueNo} onChange={(event) => updateForm('issueNo', event.target.value)} />
            </FormField>

            <FormField label="수량">
              <input
                type="number"
                min={0}
                value={form.qty}
                onChange={(event) => updateForm('qty', parseNonNegativeInteger(event.target.value))}
              />
            </FormField>

            <FormField label="발주일자">
              <input
                type="date"
                value={form.date ?? ''}
                onChange={(event) => updateForm('date', emptyToNull(event.target.value))}
              />
            </FormField>

            <FormField label="입고일자">
              <input
                type="date"
                value={form.deadline ?? ''}
                onChange={(event) => updateForm('deadline', emptyToNull(event.target.value))}
              />
            </FormField>

            <FormField label="납품처" className="field-span-2">
              <input value={form.client} onChange={(event) => updateForm('client', event.target.value)} />
            </FormField>

            <FormField label="품목명" className="field-span-2">
              <input value={form.product} onChange={(event) => updateForm('product', event.target.value)} />
            </FormField>

            <FormField label="상태">
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value as OrderBookInput['status'])}>
                <option value="ST00">정상</option>
                <option value="ST01">거래취소</option>
              </select>
            </FormField>

            <FormField label="출고상태">
              <select
                value={form.shippedStatus}
                onChange={(event) => updateForm('shippedStatus', event.target.value as OrderBookShippingStatus)}
              >
                <option value="미출고">미출고</option>
                <option value="출고">출고</option>
              </select>
            </FormField>

            <FormField label="수령상태">
              <input value={form.receipt} onChange={(event) => updateForm('receipt', event.target.value)} />
            </FormField>

            <FormField label="비고" className="field-span-2">
              <textarea value={form.note} onChange={(event) => updateForm('note', event.target.value)} />
            </FormField>
          </div>

          {formError ? <Alert>{formError}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}

function formatDate(value: string | null) {
  return value || '-';
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatNullableNumber(value: number | null) {
  if (value === null || value === undefined) return '-';
  return Number(value).toLocaleString('ko-KR');
}

function emptyToNull(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseNonNegativeInteger(value: string) {
  const parsed = parseInt(value || '0', 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

function formatDateForExport(value: string | null) {
  return value || '';
}

function formatFileStamp(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hour}${minute}`;
}
