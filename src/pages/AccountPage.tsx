import { useEffect, useMemo, useState, type FormEvent } from 'react';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import Modal from '../components/ui/Modal';
import {
  createAccount,
  fetchAccounts,
  removeAccount,
  resetAccountPassword,
  toUserSession,
  updateAccount,
} from '../api/accounts';
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
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadAccounts();
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
        <PageHeader title="계정 관리" description="" />
        <section className="card placeholder-panel">
          <h2>관리자만 접근할 수 있습니다.</h2>
          <p>현재 로그인한 계정은 계정 관리 권한이 없습니다.</p>
          <div className="placeholder-badge">ADMIN ONLY</div>
        </section>
      </div>
    );
  }

  async function loadAccounts() {
    try {
      setLoading(true);
      setError(null);
      const rows = await fetchAccounts();
      setAccounts(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : '계정 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingAccount(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(account: Account) {
    setEditingAccount(account);
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
    if (!editingAccount && !form.password.trim()) return '비밀번호를 입력해주세요.';
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
      if (editingAccount) {
        saved = await updateAccount(editingAccount.id, form);
      } else {
        saved = await createAccount(form);
      }

      await loadAccounts();
      setModalOpen(false);

      if (currentUser && currentUser.id === saved.id) {
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

    try {
      await removeAccount(account.id);
      await loadAccounts();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '계정 삭제에 실패했습니다.');
    }
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
      const saved = await resetAccountPassword(passwordTarget.id, passwordValue);
      await loadAccounts();
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
      <PageHeader title="계정 관리" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="client-toolbar-stacked">
          <div className="toolbar">
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="아이디, 이름, 직급, 연락처, 이메일 등으로 검색하세요."
            />
          </div>

          <div className="client-toolbar-actions product-toolbar-actions">
            <div className="toolbar-meta">검색 결과 {filteredAccounts.length}건</div>
            <Button variant="primary" onClick={openCreateModal}>
              계정 추가
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">계정 목록을 불러오는 중입니다...</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No</th>
                  <th style={{ width: 140 }}>아이디</th>
                  <th style={{ width: 120 }}>이름</th>
                  <th style={{ width: 100 }}>직급</th>
                  <th style={{ width: 140 }}>연락처</th>
                  <th>이메일</th>
                  <th style={{ width: 90 }}>권한</th>
                  <th style={{ width: 88 }}>관리</th>
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
                    <tr
                      key={account.id}
                      className="history-clickable-row"
                      onClick={() => openEditModal(account)}
                    >
                      <td>{index + 1}</td>
                      <td className="table-primary">{account.id}</td>
                      <td>
                        {account.name}
                        {currentUser?.id === account.id ? (
                          <Badge variant="muted" className="history-badge">
                            현재 로그인
                          </Badge>
                        ) : null}
                      </td>
                      <td>{account.rank || '-'}</td>
                      <td>{account.tel || '-'}</td>
                      <td>{account.email || '-'}</td>
                      <td>
                        <Badge variant={account.role === 'admin' ? 'muted-blue' : 'muted'}>
                          {account.role === 'admin' ? '관리자' : '일반'}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDelete(account);
                          }}
                        >
                          삭제
                        </button>
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
        title={editingAccount ? '계정 수정' : '계정 추가'}
        onClose={closeModal}
        cardClassName="account-modal-card"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closeModal}>
              취소
            </Button>
            <Button type="submit" form="account-form" variant="primary" disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </>
        }
      >
        <div className="modal-head-actions">
          <div className="button-row">
            {editingAccount ? (
              <Button variant="secondary" onClick={() => openPasswordModal(editingAccount)}>
                비밀번호 초기화
              </Button>
            ) : null}
            <Button variant="secondary" onClick={closeModal}>
              닫기
            </Button>
          </div>
        </div>

        <form id="account-form" className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormField label="아이디 *">
              <input
                value={form.id}
                onChange={(event) => updateFormField('id', event.target.value)}
                placeholder="영문+숫자 조합"
              />
            </FormField>

            <FormField label={editingAccount ? '새 비밀번호' : '비밀번호 *'}>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateFormField('password', event.target.value)}
                placeholder={
                  editingAccount ? '비워두면 기존 비밀번호 유지' : '신규 계정 비밀번호'
                }
              />
            </FormField>

            <FormField label="이름 *">
              <input
                value={form.name}
                onChange={(event) => updateFormField('name', event.target.value)}
                placeholder="홍길동"
              />
            </FormField>

            <FormField label="직급">
              <input
                value={form.rank}
                onChange={(event) => updateFormField('rank', event.target.value)}
                placeholder="예: 과장, 대리"
              />
            </FormField>

            <FormField label="연락처">
              <input
                value={form.tel}
                onChange={(event) => updateFormField('tel', event.target.value)}
                placeholder="010-0000-0000"
              />
            </FormField>

            <FormField label="이메일">
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateFormField('email', event.target.value)}
                placeholder="example@email.com"
              />
            </FormField>

            <FormField label="권한" className="field-span-2">
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
            </FormField>
          </div>

          {formError ? <Alert>{formError}</Alert> : null}
        </form>
      </Modal>

      <Modal
        open={passwordModalOpen && !!passwordTarget}
        title="비밀번호 초기화"
        description={
          passwordTarget ? (
            <>
              <strong>{passwordTarget.name}</strong> 계정의 비밀번호를 새로 설정합니다.
            </>
          ) : undefined
        }
        onClose={closePasswordModal}
        cardClassName="password-modal-card"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={closePasswordModal}>
              취소
            </Button>
            <Button type="submit" form="password-form" variant="primary" disabled={saving}>
              {saving ? '초기화 중...' : '초기화'}
            </Button>
          </>
        }
      >
        <form id="password-form" className="modal-form" onSubmit={handlePasswordReset}>
          <FormField label="새 비밀번호 *">
            <input
              type="password"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              placeholder="새 비밀번호 입력"
            />
          </FormField>

          <FormField label="비밀번호 확인 *">
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="새 비밀번호 재입력"
            />
          </FormField>

          {passwordError ? <Alert>{passwordError}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
