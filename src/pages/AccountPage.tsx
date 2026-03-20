import { useEffect, useMemo, useState, type FormEvent } from 'react';
import PageHeader from '../components/PageHeader';
import {
  createAccount,
  getAccounts,
  removeAccount,
  resetAccountPassword,
  toUserSession,
  updateAccount,
} from '../lib/accounts';
import { getStoredUser, isAdminUser, saveStoredUser } from '../lib/session';
import type { Account, AccountInput } from '../types/account';

const emptyForm: AccountInput = {
  id: '',
  password: '',
  name: '',
  rank: '',
  tel: '',
  email: '',
  role: 'user',
};

export default function AccountPage() {
  const currentUser = getStoredUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAccounts(getAccounts());
  }, []);

  const filteredAccounts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return accounts;
    return accounts.filter((account) =>
      [account.id, account.name, account.rank, account.tel, account.email, account.role]
        .join(' ')
        .toLowerCase()
        .includes(keyword),
    );
  }, [accounts, query]);

  if (!isAdminUser(currentUser)) {
    return (
      <div className="page-content">
        <PageHeader title="계정 관리" description="시스템 접속 계정을 관리합니다." />
        <section className="card placeholder-panel">
          <h2>관리자만 접근할 수 있습니다.</h2>
          <p>현재 로그인한 계정에는 계정 관리 권한이 없습니다.</p>
          <div className="placeholder-badge">ADMIN ONLY</div>
        </section>
      </div>
    );
  }

  function reloadAccounts() {
    setAccounts(getAccounts());
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(account: Account) {
    setEditingId(account.id);
    setForm({
      id: account.id,
      password: '',
      name: account.name,
      rank: account.rank,
      tel: account.tel,
      email: account.email,
      role: account.role,
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setFormError(null);
  }

  function openPasswordModal(account: Account) {
    setPasswordTarget(account);
    setPasswordValue('');
    setPasswordConfirm('');
    setPasswordError(null);
    setPasswordModalOpen(true);
  }

  function closePasswordModal() {
    if (saving) return;
    setPasswordModalOpen(false);
    setPasswordError(null);
  }

  function updateFormField<K extends keyof AccountInput>(key: K, value: AccountInput[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function validateForm() {
    if (!form.id.trim()) return '아이디를 입력해주세요.';
    if (!editingId && !form.password.trim()) return '비밀번호를 입력해주세요.';
    if (!form.name.trim()) return '이름을 입력해주세요.';
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validateForm();
    if (message) {
      setFormError(message);
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      let saved: Account;
      if (editingId) {
        saved = updateAccount(editingId, form);
      } else {
        saved = createAccount(form);
      }

      reloadAccounts();
      setModalOpen(false);

      if (currentUser && currentUser.id === editingId) {
        saveStoredUser(toUserSession(saved));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '계정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    if (currentUser?.id === account.id) {
      setError('현재 로그인한 계정은 삭제할 수 없습니다.');
      return;
    }

    const adminCount = accounts.filter((item) => item.role === 'admin').length;
    if (account.role === 'admin' && adminCount <= 1) {
      setError('최소 1개의 관리자 계정은 유지되어야 합니다.');
      return;
    }

    const confirmed = window.confirm(`"${account.name}" 계정을 삭제하시겠습니까?`);
    if (!confirmed) return;

    removeAccount(account.id);
    reloadAccounts();
  }

  async function handlePasswordReset(event: FormEvent) {
    event.preventDefault();

    if (!passwordTarget) return;
    if (!passwordValue.trim()) {
      setPasswordError('새 비밀번호를 입력해주세요.');
      return;
    }
    if (passwordValue !== passwordConfirm) {
      setPasswordError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setSaving(true);
      setPasswordError(null);
      const saved = resetAccountPassword(passwordTarget.id, passwordValue);
      reloadAccounts();
      setPasswordModalOpen(false);

      if (currentUser?.id === saved.id) {
        saveStoredUser(toUserSession(saved));
      }
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : '비밀번호 초기화에 실패했습니다.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="계정 관리"
        description="시스템 접속 계정을 관리합니다."
        action={
          <div className="button-row">
            <button className="btn btn-secondary" onClick={reloadAccounts}>
              새로고침
            </button>
            <button className="btn btn-primary" onClick={openCreateModal}>
              + 계정 추가
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="card">
        <div className="toolbar">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="아이디, 이름, 직급, 연락처, 이메일 검색.."
          />
          <div className="toolbar-meta">계정 {filteredAccounts.length}개</div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>No</th>
                <th style={{ width: 120 }}>아이디</th>
                <th>이름</th>
                <th style={{ width: 100 }}>직급</th>
                <th style={{ width: 140 }}>연락처</th>
                <th>이메일</th>
                <th style={{ width: 80 }}>권한</th>
                <th style={{ width: 220 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty">
                    표시할 계정이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account, index) => (
                  <tr key={account.id}>
                    <td>{index + 1}</td>
                    <td className="table-primary">{account.id}</td>
                    <td>
                      {account.name}
                      {currentUser?.id === account.id ? (
                        <span className="badge badge-muted history-badge">현재 로그인</span>
                      ) : null}
                    </td>
                    <td>{account.rank || '-'}</td>
                    <td>{account.tel || '-'}</td>
                    <td>{account.email || '-'}</td>
                    <td>
                      <span
                        className={
                          account.role === 'admin' ? 'badge badge-muted-blue' : 'badge badge-muted'
                        }
                      >
                        {account.role === 'admin' ? '관리자' : '사용자'}
                      </span>
                    </td>
                    <td>
                      <div className="button-row account-actions">
                        <button className="btn btn-secondary" onClick={() => openEditModal(account)}>
                          수정
                        </button>
                        <button className="btn btn-secondary" onClick={() => openPasswordModal(account)}>
                          비밀번호 초기화
                        </button>
                        <button className="btn btn-danger" onClick={() => void handleDelete(account)}>
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
      </section>

      {modalOpen ? (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card account-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{editingId ? '계정 수정' : '계정 추가'}</h2>
                <p>현재 단계에서는 로컬 저장소 기반 임시 계정으로 관리됩니다.</p>
              </div>
              <button className="btn btn-secondary" onClick={closeModal}>
                닫기
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>아이디 *</span>
                  <input
                    value={form.id}
                    onChange={(event) => updateFormField('id', event.target.value)}
                    placeholder="영문+숫자 조합"
                  />
                </label>

                <label className="field">
                  <span>{editingId ? '새 비밀번호' : '비밀번호 *'}</span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => updateFormField('password', event.target.value)}
                    placeholder={editingId ? '비워두면 기존 비밀번호 유지' : '신규 계정 비밀번호'}
                  />
                </label>

                <label className="field">
                  <span>이름 *</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateFormField('name', event.target.value)}
                    placeholder="홍길동"
                  />
                </label>

                <label className="field">
                  <span>직급</span>
                  <input
                    value={form.rank}
                    onChange={(event) => updateFormField('rank', event.target.value)}
                    placeholder="예: 과장, 대리"
                  />
                </label>

                <label className="field">
                  <span>연락처</span>
                  <input
                    value={form.tel}
                    onChange={(event) => updateFormField('tel', event.target.value)}
                    placeholder="010-0000-0000"
                  />
                </label>

                <label className="field">
                  <span>이메일</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => updateFormField('email', event.target.value)}
                    placeholder="example@email.com"
                  />
                </label>

                <label className="field field-span-2">
                  <span>권한</span>
                  <select
                    className="search-input"
                    value={form.role}
                    onChange={(event) =>
                      updateFormField('role', event.target.value as Account['role'])
                    }
                  >
                    <option value="user">일반 사용자</option>
                    <option value="admin">관리자</option>
                  </select>
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

      {passwordModalOpen && passwordTarget ? (
        <div className="modal-overlay" onClick={closePasswordModal}>
          <div className="modal-card password-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>비밀번호 초기화</h2>
                <p>
                  <strong>{passwordTarget.name}</strong> 계정의 비밀번호를 새로 설정합니다.
                </p>
              </div>
              <button className="btn btn-secondary" onClick={closePasswordModal}>
                닫기
              </button>
            </div>

            <form className="modal-form" onSubmit={handlePasswordReset}>
              <label className="field">
                <span>새 비밀번호 *</span>
                <input
                  type="password"
                  value={passwordValue}
                  onChange={(event) => setPasswordValue(event.target.value)}
                  placeholder="새 비밀번호 입력"
                />
              </label>

              <label className="field">
                <span>비밀번호 확인 *</span>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  placeholder="새 비밀번호 재입력"
                />
              </label>

              {passwordError ? <div className="alert alert-error">{passwordError}</div> : null}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closePasswordModal}>
                  취소
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '초기화 중..' : '초기화'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
