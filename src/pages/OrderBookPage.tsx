import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  createOrderBookEntry,
  fetchOrderBook,
  removeOrderBookEntry,
  updateOrderBookEntry,
} from '../api/order-book';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import TableActionButton from '../components/ui/TableActionButton';
import TopActionButton from '../components/ui/TopActionButton';
import type { OrderBookEntry, OrderBookInput } from '../types/order-book';

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
};

function getDefaultDateRange() {
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

export default function OrderBookPage() {
  const defaults = getDefaultDateRange();
  const [entries, setEntries] = useState<OrderBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'client' | 'product' | 'issueNo' | 'receipt'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<OrderBookEntry | null>(null);
  const [form, setForm] = useState<OrderBookInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      setError(err instanceof Error ? err.message : '수주대장을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  const filteredEntries = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return entries.filter((entry) => {
      const baseDate = entry.date || entry.createdAt?.slice(0, 10) || '';
      if (dateFrom && baseDate && baseDate < dateFrom) return false;
      if (dateTo && baseDate && baseDate > dateTo) return false;
      if (!search) return true;
      if (filterType === 'client') return entry.client.toLowerCase().includes(search);
      if (filterType === 'product') return entry.product.toLowerCase().includes(search);
      if (filterType === 'issueNo') return entry.issueNo.toLowerCase().includes(search);
      if (filterType === 'receipt') return entry.receipt.toLowerCase().includes(search);
      return [entry.client, entry.product, entry.issueNo, entry.note, entry.receipt].join(' ').toLowerCase().includes(search);
    });
  }, [dateFrom, dateTo, entries, filterType, keyword]);

  function resetSearch() {
    const next = getDefaultDateRange();
    setDateFrom(next.from);
    setDateTo(next.to);
    setFilterType('all');
    setKeyword('');
  }

  function openCreateModal() {
    setEditingEntry(null);
    setForm({
      ...emptyForm,
      date: today.toISOString().slice(0, 10),
    });
    setFormError(null);
    setModalOpen(true);
  }

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
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.client.trim()) {
      setFormError('거래처를 입력해주세요.');
      return;
    }

    if (!form.product.trim()) {
      setFormError('품목명을 입력해주세요.');
      return;
    }

    if (form.qty <= 0) {
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
      };

      if (editingEntry) {
        const saved = await updateOrderBookEntry(editingEntry.id, payload);
        setEntries((current) =>
          current.map((entry) => (entry.id === editingEntry.id ? saved : entry)),
        );
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
    const confirmed = window.confirm(
      `"${entry.client} / ${entry.product}" 수주 항목을 삭제하시겠습니까?\n이 작업은 dev DB에 반영됩니다.`,
    );

    if (!confirmed) return;

    try {
      await removeOrderBookEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '수주대장 삭제에 실패했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="수주대장"
        description="날짜별 거래 내역을 관리합니다"
          action={
            <div className="button-row order-book-top-actions">
              <TopActionButton variant="secondary" onClick={() => void loadEntries()}>
                새로고침
              </TopActionButton>
              <TopActionButton variant="primary" onClick={openCreateModal}>
                + 수주 추가
              </TopActionButton>
            </div>
          }
      />
      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="history-filter-grid">
          <FormField label="날짜 (시작)">
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </FormField>
          <FormField label="날짜 (종료)">
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </FormField>
          <FormField label="거래처 / 품목 / 발급번호 / 수령상태" className="field-span-2">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="거래처, 품목명, 발급번호, 수령상태 검색..."
            />
          </FormField>
        </div>
        <div className="button-row">
          <Button variant="primary" type="button">
            검색
          </Button>
          <Button variant="secondary" onClick={resetSearch}>
            초기화
          </Button>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <div>
            <h2>수주대장 목록</h2>
            <p>문서 연동 건은 유지하고, 수기 등록 건은 직접 추가/수정/삭제할 수 있습니다.</p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">수주대장을 불러오는 중입니다...</div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">수주 내역이 없습니다</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>No</th>
                  <th style={{ width: 120, textAlign: 'center' }}>날짜</th>
                  <th style={{ width: 120, textAlign: 'center' }}>납기일</th>
                  <th style={{ minWidth: 140 }}>거래처</th>
                  <th>품목명</th>
                  <th style={{ width: 90, textAlign: 'right' }}>수량</th>
                  <th style={{ width: 100 }}>발급번호</th>
                  <th style={{ width: 120 }}>비고</th>
                  <th style={{ width: 100, textAlign: 'center' }}>명세서수령</th>
                  <th style={{ width: 70, textAlign: 'center' }}>상태</th>
                  <th style={{ width: 132, textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry, index) => (
                  <tr key={entry.id}>
                    <td style={{ textAlign: 'center', color: '#6b7280' }}>{index + 1}</td>
                    <td style={{ textAlign: 'center' }}>{entry.date || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{entry.deadline || '-'}</td>
                    <td style={{ fontWeight: 700 }}>{entry.client}</td>
                    <td>{entry.product}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(entry.qty)}</td>
                    <td>{entry.issueNo || '-'}</td>
                    <td>{entry.note || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {entry.receipt ? (
                        <Badge variant="muted-blue">{entry.receipt}</Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Badge variant={entry.status === 'ST01' ? 'cancel' : 'muted-blue'}>
                        {entry.status === 'ST01' ? '취소' : '정상'}
                      </Badge>
                    </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="button-row order-book-actions">
                          <TableActionButton variant="secondary" onClick={() => openEditModal(entry)}>
                            수정
                          </TableActionButton>
                          <TableActionButton
                            variant={entry.fromDoc ? 'disabled' : 'danger'}
                            disabled={entry.fromDoc}
                            onClick={() => void handleDelete(entry)}
                            title={entry.fromDoc ? '문서 연동 항목은 문서에서 관리합니다.' : undefined}
                          >
                            {entry.fromDoc ? '연동' : '삭제'}
                          </TableActionButton>
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        title={editingEntry ? '수주 항목 수정' : '수주 항목 추가'}
        description={
          editingEntry?.fromDoc
            ? '문서 연동 항목은 삭제할 수 없지만, 수령 상태와 메모는 여기서 보정할 수 있습니다.'
            : '이번 단계에서는 dev DB의 `order_book` 테이블에 바로 반영됩니다.'
        }
        onClose={closeModal}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              취소
            </Button>
            <Button type="submit" form="order-book-form" variant="primary" disabled={saving}>
              {saving ? '저장 중..' : '저장'}
            </Button>
          </>
        }
      >
        <form id="order-book-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="발급번호">
                  <input
                    value={form.issueNo}
                    onChange={(event) => updateForm('issueNo', event.target.value)}
                    placeholder="예: 26001"
                  />
            </FormField>

            <FormField label="수량 (ea) *">
                  <input
                    type="number"
                    min={0}
                    value={form.qty}
                    onChange={(event) => updateForm('qty', parseNonNegativeInteger(event.target.value))}
                    placeholder="0"
                  />
            </FormField>

            <FormField label="날짜">
                  <input
                    type="date"
                    value={form.date ?? ''}
                    onChange={(event) => updateForm('date', emptyToNull(event.target.value))}
                  />
            </FormField>

            <FormField label="납기일">
                  <input
                    type="date"
                    value={form.deadline ?? ''}
                    onChange={(event) => updateForm('deadline', emptyToNull(event.target.value))}
                  />
            </FormField>

            <FormField label="거래처 *" className="field-span-2">
                  <input
                    value={form.client}
                    onChange={(event) => updateForm('client', event.target.value)}
                    placeholder="예: 샘플 거래처"
                  />
            </FormField>

            <FormField label="품목명 *" className="field-span-2">
                  <input
                    value={form.product}
                    onChange={(event) => updateForm('product', event.target.value)}
                    placeholder="예: PET 92파이 16온스"
                  />
            </FormField>

            <FormField label="명세서 수령상태">
                  <input
                    value={form.receipt}
                    onChange={(event) => updateForm('receipt', event.target.value)}
                    placeholder="예: 수령완료, 전달예정"
                  />
            </FormField>

            <FormField label="상태" className="field-check">
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={form.status === 'ST00'}
                      onChange={(event) => updateForm('status', event.target.checked ? 'ST00' : 'ST01')}
                    />
                    정상
                  </label>
            </FormField>

            <FormField label="비고" className="field-span-2">
                  <textarea
                    value={form.note}
                    onChange={(event) => updateForm('note', event.target.value)}
                    placeholder="요청사항이나 메모를 적어주세요."
                  />
            </FormField>
          </div>

          {formError ? <Alert>{formError}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
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
