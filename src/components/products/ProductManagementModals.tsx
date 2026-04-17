import { type RefObject, type FormEvent } from 'react';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';
import type { Client } from '../../types/client';
import type { Product, ProductInput, ProductMaster, ProductMasterInput } from '../../types/product';

type ProductMasterModalProps = {
  open: boolean;
  editingMaster: ProductMaster | null;
  masterForm: ProductMasterInput;
  masterFormError: string | null;
  saving: boolean;
  linkedProductsCount: number;
  gubunChoices: string[];
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onUpdateForm: <K extends keyof ProductMasterInput>(key: K, value: ProductMasterInput[K]) => void;
  formatNullableNumber: (value: number | null) => string;
  parseNullableNumber: (value: string) => number | null;
};

type ProductModalProps = {
  open: boolean;
  editingProduct: Product | null;
  productForm: ProductInput;
  productFormError: string | null;
  saving: boolean;
  productMasters: ProductMaster[];
  clients: Client[];
  filteredFormClientOptions: Client[];
  clientDropdownOpen: boolean;
  clientSearchBoxRef: RefObject<HTMLDivElement>;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  onUpdateForm: <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => void;
  onApplyMasterDefaults: (productMasterId: string) => void;
  onHandleClientSelect: (clientName: string) => void;
  onSetClientDropdownOpen: (open: boolean) => void;
  formatNullableNumber: (value: number | null) => string;
};

export function ProductMasterModal({
  open,
  editingMaster,
  masterForm,
  masterFormError,
  saving,
  linkedProductsCount,
  gubunChoices,
  onClose,
  onSubmit,
  onUpdateForm,
  formatNullableNumber,
  parseNullableNumber,
}: ProductMasterModalProps) {
  return (
    <Modal
      open={open}
      title={editingMaster ? '공통 품목 수정' : '공통 품목 추가'}
      onClose={onClose}
      closeOnOverlayClick={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" form="product-master-form" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      <form id="product-master-form" className="form-grid" onSubmit={onSubmit}>
        <FormField label="구분 *">
          <select
            value={masterForm.gubun}
            onChange={(event) => onUpdateForm('gubun', event.target.value)}
          >
            {gubunChoices.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="공통 품목명 *">
          <input
            value={masterForm.name1}
            onChange={(event) => onUpdateForm('name1', event.target.value)}
            placeholder="공통 품목명 입력"
          />
        </FormField>

        <FormField label="거래명세서 기본명">
          <input
            value={masterForm.name2}
            onChange={(event) => onUpdateForm('name2', event.target.value)}
            placeholder="비워두면 공통 품목명과 동일하게 저장"
          />
        </FormField>

        <FormField label="1B=ea">
          <input
            value={formatNullableNumber(masterForm.ea_per_b)}
            onChange={(event) => onUpdateForm('ea_per_b', parseNullableNumber(event.target.value))}
            inputMode="numeric"
            placeholder="1B ea"
          />
        </FormField>

        <FormField label="1P=BOX">
          <input
            value={formatNullableNumber(masterForm.box_per_p)}
            onChange={(event) => onUpdateForm('box_per_p', parseNullableNumber(event.target.value))}
            inputMode="numeric"
            placeholder="1P BOX"
          />
        </FormField>

        <FormField label="1P=ea">
          <input value={formatNullableNumber(masterForm.ea_per_p)} readOnly placeholder="자동 계산" />
        </FormField>

        <FormField label="1대당 팔레트">
          <input
            value={formatNullableNumber(masterForm.pallets_per_truck)}
            onChange={(event) =>
              onUpdateForm('pallets_per_truck', parseNullableNumber(event.target.value))
            }
            inputMode="numeric"
            placeholder="팔레트 수"
          />
        </FormField>

        {editingMaster ? (
          <div className="field">
            <span>연결된 거래처별 품목</span>
            <div>
              {linkedProductsCount === 0 ? (
                <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
                  연결된 거래처별 품목이 없습니다.
                </span>
              ) : (
                <span className="badge">{linkedProductsCount}개 연결됨</span>
              )}
            </div>
          </div>
        ) : null}

        {masterFormError ? <Alert>{masterFormError}</Alert> : null}
      </form>
    </Modal>
  );
}

export function ProductItemModal({
  open,
  editingProduct,
  productForm,
  productFormError,
  saving,
  productMasters,
  clients,
  filteredFormClientOptions,
  clientDropdownOpen,
  clientSearchBoxRef,
  onClose,
  onSubmit,
  onUpdateForm,
  onApplyMasterDefaults,
  onHandleClientSelect,
  onSetClientDropdownOpen,
  formatNullableNumber,
}: ProductModalProps) {
  return (
    <Modal
      open={open}
      title={editingProduct ? '거래처별 품목 수정' : '거래처별 품목 추가'}
      onClose={onClose}
      closeOnOverlayClick={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" form="product-form" disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      <form id="product-form" className="form-grid" onSubmit={onSubmit}>
        <FormField label="공통 품목 *">
          <select
            value={productForm.productMasterId}
            onChange={(event) => {
              const nextId = event.target.value;
              onUpdateForm('productMasterId', nextId);
              onApplyMasterDefaults(nextId);
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
                onUpdateForm('client', nextClientName);
                onUpdateForm('clientId', matchedClient?.id ?? '');
                onSetClientDropdownOpen(true);
              }}
              onFocus={() => onSetClientDropdownOpen(true)}
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
                      onClick={() => onHandleClientSelect(client.name)}
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

        <FormField label="수신처">
          <input
            value={productForm.receiver}
            onChange={(event) => onUpdateForm('receiver', event.target.value)}
            placeholder="수신처 입력"
          />
        </FormField>

        <div className="product-form-section field-span-2">
          <p className="product-form-section-label">품목명</p>
        </div>

        <FormField label="거래처별 품목명 *">
          <input
            value={productForm.name1}
            onChange={(event) => onUpdateForm('name1', event.target.value)}
            placeholder="거래처별 품목명 입력"
          />
        </FormField>

        <FormField label="거래명세서명">
          <input
            value={productForm.name2}
            onChange={(event) => onUpdateForm('name2', event.target.value)}
            placeholder="비워두면 거래처별 품목명과 동일하게 저장"
          />
        </FormField>

        <FormField label="공급처">
          <input
            value={productForm.supplier}
            onChange={(event) => onUpdateForm('supplier', event.target.value)}
            placeholder="공급처 입력"
          />
        </FormField>

        <div className="product-form-section field-span-2">
          <p className="product-form-section-label">공통 품목 기준값</p>
        </div>

        <FormField label="구분">
          <input value={productForm.gubun || '-'} readOnly />
        </FormField>

        <FormField label="1B=ea">
          <input value={formatNullableNumber(productForm.ea_per_b)} readOnly />
        </FormField>

        <FormField label="1P=BOX">
          <input value={formatNullableNumber(productForm.box_per_p)} readOnly />
        </FormField>

        <FormField label="1P=ea">
          <input value={formatNullableNumber(productForm.ea_per_p)} readOnly />
        </FormField>

        <FormField label="1대당 팔레트">
          <input value={formatNullableNumber(productForm.pallets_per_truck)} readOnly />
        </FormField>

        {productFormError ? <Alert>{productFormError}</Alert> : null}
      </form>
    </Modal>
  );
}
