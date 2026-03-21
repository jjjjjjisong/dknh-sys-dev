import { useEffect, useMemo, useState, type FormEvent } from 'react';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import TableActionButton from '../components/ui/TableActionButton';
import { createClient, fetchClients, removeClient, updateClient } from '../api/clients';
import type { Client, ClientInput } from '../types/client';

const emptyForm: ClientInput = {
  name: '',
  manager: '',
  tel: '',
  addr: '',
  time: '',
  lunch: '',
  note: '',
  active: true,
};

export default function MasterClientPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return clients.filter((client) => {
      if (!keyword) return true;
      return [client.name, client.addr, client.manager, client.tel, client.note]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [clients, query]);

  async function loadClients() {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchClients();
      setClients(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '납품처 목록 조회에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingClientId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClientId(client.id);
    setForm({
      name: client.name,
      manager: client.manager,
      tel: client.tel,
      addr: client.addr,
      time: client.time,
      lunch: client.lunch,
      note: client.note,
      active: client.active,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(null);
  }

  function updateForm<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('납품처명을 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const payload: ClientInput = {
        name: form.name.trim(),
        manager: form.manager.trim(),
        tel: form.tel.trim(),
        addr: form.addr.trim(),
        time: form.time.trim(),
        lunch: form.lunch.trim(),
        note: form.note.trim(),
        active: form.active,
      };

      if (editingClientId) {
        const savedClient = await updateClient(editingClientId, payload);
        setClients((current) => current.map((client) => (client.id === editingClientId ? savedClient : client)));
      } else {
        const savedClient = await createClient(payload);
        setClients((current) => [...current, savedClient]);
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '납품처 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client: Client) {
    const confirmed = window.confirm(`"${client.name}" 납품처를 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await removeClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '납품처 삭제에 실패했습니다.');
    }
  }

  return (
    <div className="page-content">
      <PageHeader title="납품처 관리" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="toolbar client-toolbar client-toolbar-stacked">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="납품처명, 주소, 담당자 명 등으로 검색하세요."
          />
          <div className="client-toolbar-actions">
            <div className="toolbar-meta">검색 결과 {filteredClients.length}건</div>
            <Button type="button" variant="primary" onClick={openCreateModal}>
              납품처 추가
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">납품처 목록을 불러오는 중입니다...</div>
        ) : (
          <div className="table-wrap">
            <table className="table client-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 190 }}>납품처명</th>
                  <th style={{ width: 110 }}>담당자</th>
                  <th style={{ width: 152 }}>담당자 연락처</th>
                  <th style={{ width: 320 }}>납품주소</th>
                  <th style={{ width: 120 }}>점심시간</th>
                  <th style={{ width: 120 }}>입고시간</th>
                  <th style={{ width: 190 }}>비고</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 72 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="table-empty">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client, index) => (
                    <tr key={client.id} className="history-clickable-row" onClick={() => openEditModal(client)}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="table-primary">{client.name}</div>
                      </td>
                      <td>{client.manager || '-'}</td>
                      <td>{client.tel || '-'}</td>
                      <td className="table-address">{client.addr || '-'}</td>
                      <td>{client.lunch || '-'}</td>
                      <td>{client.time || '-'}</td>
                      <td>{client.note || '-'}</td>
                      <td>
                        <span className={client.active === false ? 'badge badge-muted' : 'badge'}>
                          {client.active === false ? '비활성' : '사용중'}
                        </span>
                      </td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <div className="button-row">
                          <TableActionButton variant="danger" onClick={() => void handleDelete(client)}>
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
      </section>

      <Modal
        open={modalOpen}
        title={editingClientId ? '납품처 수정' : '납품처 추가'}
        onClose={closeModal}
        closeOnOverlayClick={false}
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              취소
            </Button>
            <Button type="submit" form="client-form" variant="primary" disabled={saving}>
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

        <form id="client-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="납품처명 *">
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} />
            </FormField>

            <FormField label="담당자">
              <input value={form.manager} onChange={(event) => updateForm('manager', event.target.value)} />
            </FormField>

            <FormField label="담당자 연락처">
              <input value={form.tel} onChange={(event) => updateForm('tel', event.target.value)} />
            </FormField>

            <FormField label="입고시간">
              <input value={form.time} onChange={(event) => updateForm('time', event.target.value)} />
            </FormField>

            <FormField label="점심시간">
              <input value={form.lunch} onChange={(event) => updateForm('lunch', event.target.value)} />
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

            <FormField label="납품주소" className="field-span-2">
              <textarea value={form.addr} onChange={(event) => updateForm('addr', event.target.value)} />
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
