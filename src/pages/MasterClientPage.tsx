import { useEffect, useMemo, useState, type FormEvent } from 'react';
import PageHeader from '../components/PageHeader';
import {
  createClient,
  fetchClients,
  removeClient,
  updateClient,
} from '../api/clients';
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
      if (!keyword) {
        return true;
      }

      return [client.name, client.manager, client.addr, client.tel, client.note]
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
      setError(
        err instanceof Error ? err.message : '납품처 목록 조회에 실패했습니다.',
      );
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
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
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
        setClients((current) =>
          current.map((client) =>
            client.id === editingClientId ? savedClient : client,
          ),
        );
      } else {
        const savedClient = await createClient(payload);
        setClients((current) => [...current, savedClient]);
      }

      setModalOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : '납품처 저장에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(client: Client) {
    const confirmed = window.confirm(
      `"${client.name}" 납품처를 삭제하시겠습니까?\n이 작업은 dev DB에 반영됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await removeClient(client.id);
      setClients((current) => current.filter((item) => item.id !== client.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '납품처 삭제에 실패했습니다.',
      );
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="납품처 관리"
        description="거래처와 납품처 정보를 관리합니다."
        action={
          <div className="button-row">
            <button className="btn btn-secondary" onClick={() => void loadClients()}>
              새로고침
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + 납품처 추가
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="card">
        <div className="toolbar client-toolbar">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="납품처명, 주소, 담당자 검색.."
          />
          <div className="toolbar-meta">검색 결과 {filteredClients.length}건</div>
        </div>

        {loading ? (
          <div className="empty-state">납품처 목록을 불러오는 중입니다...</div>
        ) : (
          <div className="table-wrap">
            <table className="table client-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th>납품처명</th>
                  <th style={{ width: 110 }}>담당자</th>
                  <th style={{ width: 140 }}>담당자 연락처</th>
                  <th>납품 주소</th>
                  <th style={{ width: 120 }}>입고시간</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 120 }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      표시할 납품처가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client, index) => (
                    <tr key={client.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="table-primary">{client.name}</div>
                      </td>
                      <td>{client.manager || '-'}</td>
                      <td>{client.tel || '-'}</td>
                      <td className="table-address">{client.addr || '-'}</td>
                      <td>{client.time || '-'}</td>
                      <td>
                        <span
                          className={
                            client.active === false ? 'badge badge-muted' : 'badge'
                          }
                        >
                          {client.active === false ? '비활성' : '사용중'}
                        </span>
                      </td>
                      <td>
                        <div className="button-row">
                          <button
                            className="btn btn-secondary"
                            onClick={() => openEditModal(client)}
                          >
                            수정
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => void handleDelete(client)}
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
                <h2>{editingClientId ? '납품처 수정' : '납품처 추가'}</h2>
                <p>이번 단계에서는 dev DB의 `clients` 테이블에 바로 반영됩니다.</p>
              </div>
              <button className="btn btn-secondary" onClick={closeModal}>
                닫기
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>납품처명 *</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateForm('name', event.target.value)}
                    placeholder="예: 샘플 거래처"
                  />
                </label>

                <label className="field">
                  <span>담당자</span>
                  <input
                    value={form.manager}
                    onChange={(event) => updateForm('manager', event.target.value)}
                    placeholder="예: 김담당"
                  />
                </label>

                <label className="field">
                  <span>담당자 연락처</span>
                  <input
                    value={form.tel}
                    onChange={(event) => updateForm('tel', event.target.value)}
                    placeholder="예: 010-0000-0000"
                  />
                </label>

                <label className="field">
                  <span>입고시간</span>
                  <input
                    value={form.time}
                    onChange={(event) => updateForm('time', event.target.value)}
                    placeholder="예: 09:00~17:00"
                  />
                </label>

                <label className="field">
                  <span>점심시간</span>
                  <input
                    value={form.lunch}
                    onChange={(event) => updateForm('lunch', event.target.value)}
                    placeholder="예: 12:30~13:30"
                  />
                </label>

                <label className="field field-check">
                  <span>상태</span>
                  <label className="inline-check">
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) => updateForm('active', event.target.checked)}
                    />
                    사용중
                  </label>
                </label>

                <label className="field field-span-2">
                  <span>납품 주소</span>
                  <textarea
                    value={form.addr}
                    onChange={(event) => updateForm('addr', event.target.value)}
                    placeholder="납품 주소를 입력해주세요."
                  />
                </label>

                <label className="field field-span-2">
                  <span>메모</span>
                  <textarea
                    value={form.note}
                    onChange={(event) => updateForm('note', event.target.value)}
                    placeholder="요청사항이나 특이사항을 적어주세요."
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
