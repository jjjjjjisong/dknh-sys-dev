import { type RefObject, type FormEvent } from 'react';
import { RECEIVER_OPTIONS } from '../../constants/receivers';
import type { Client } from '../../types/client';
import type { Product, ProductInput, ProductMaster, ProductMasterInput } from '../../types/product';
import Alert from '../ui/Alert';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import Modal from '../ui/Modal';

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
  showPricingFields: boolean;
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
  parseNullableNumber: (value: string) => number | null;
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

        <FormField label="품목명(출고의뢰서) *">
          <input
            value={masterForm.name1}
            onChange={(event) => onUpdateForm('name1', event.target.value)}
            placeholder="품목명(출고의뢰서)를 입력하세요"
          />
        </FormField>

        <FormField label="품목명(거래명세서)">
          <input
            value={masterForm.name2}
            onChange={(event) => onUpdateForm('name2', event.target.value)}
            placeholder="비워두면 품목명(출고의뢰서)와 동일하게 저장됩니다"
          />
        </FormField>

        <FormField label="1B=EA">
          <input
            value={formatNullableNumber(masterForm.ea_per_b)}
            onChange={(event) => onUpdateForm('ea_per_b', parseNullableNumber(event.target.value))}
            inputMode="numeric"
            placeholder="1Box 기준 EA 수량"
          />
        </FormField>

        <FormField label="1P=BOX">
          <input
            value={formatNullableNumber(masterForm.box_per_p)}
            onChange={(event) => onUpdateForm('box_per_p', parseNullableNumber(event.target.value))}
            inputMode="numeric"
            placeholder="1P 기준 BOX 수량"
          />
        </FormField>

        <FormField label="1P=EA">
          <input value={formatNullableNumber(masterForm.ea_per_p)} readOnly placeholder="자동 계산" />
        </FormField>

        <FormField label="1대당 파레트">
          <input
            value={formatNullableNumber(masterForm.pallets_per_truck)}
            onChange={(event) =>
              onUpdateForm('pallets_per_truck', parseNullableNumber(event.target.value))
            }
            inputMode="numeric"
            placeholder="차량당 파레트 수량"
          />
        </FormField>

        {editingMaster ? (
          <div className="field">
            <span>연결된 납품처별 품목</span>
            <div>
              {linkedProductsCount === 0 ? (
                <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
                  연결된 납품처별 품목이 없습니다.
                </span>
              ) : (
                <span className="badge">{linkedProductsCount.toLocaleString('ko-KR')}개 연결됨</span>
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
  showPricingFields,
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
  parseNullableNumber,
}: ProductModalProps) {
  return (
    <Modal
      open={open}
      title={editingProduct ? '납품처별 품목 수정' : '납품처별 품목 추가'}
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

        <FormField label="구분">
          <input value={productForm.gubun || '-'} readOnly />
        </FormField>

        <FormField label="납품처 *">
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
              placeholder="납품처를 선택하세요"
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
          <select
            value={productForm.receiver}
            onChange={(event) => onUpdateForm('receiver', event.target.value)}
          >
            <option value="">수신처를 선택하세요</option>
            {RECEIVER_OPTIONS.map((receiver) => (
              <option key={receiver} value={receiver}>
                {receiver}
              </option>
            ))}
          </select>
        </FormField>

        <div className="product-form-section field-span-2">
          <p className="product-form-section-label">품목명(출고의뢰서)</p>
        </div>

        <FormField label="품목명(출고의뢰서) *">
          <input
            value={productForm.name1}
            onChange={(event) => onUpdateForm('name1', event.target.value)}
            placeholder="품목명(출고의뢰서)를 입력하세요"
          />
        </FormField>

        <FormField label="품목명(거래명세서)">
          <input
            value={productForm.name2}
            onChange={(event) => onUpdateForm('name2', event.target.value)}
            placeholder="비워두면 품목명(출고의뢰서)와 동일하게 저장됩니다"
          />
        </FormField>

        <FormField label="1B=EA">
          <input
            value={formatNullableNumber(productForm.ea_per_b)}
            readOnly
            placeholder="1Box 기준 EA 수량"
          />
        </FormField>

        <FormField label="1P=BOX">
          <input
            value={formatNullableNumber(productForm.box_per_p)}
            readOnly
            placeholder="1P 기준 BOX 수량"
          />
        </FormField>

        <FormField label="1P=EA">
          <input value={formatNullableNumber(productForm.ea_per_p)} readOnly placeholder="자동 계산" />
        </FormField>

        <FormField label="1대당 파레트">
          <input
            value={formatNullableNumber(productForm.pallets_per_truck)}
            readOnly
            placeholder="차량당 파레트 수량"
          />
        </FormField>

        {showPricingFields ? (
          <>
            <FormField label="입고단가">
              <input
                value={formatNullableNumber(productForm.cost_price)}
                onChange={(event) =>
                  onUpdateForm('cost_price', parseNullableNumber(event.target.value))
                }
                inputMode="decimal"
                placeholder="입고단가 입력"
              />
            </FormField>

            <FormField label="판매단가">
              <input
                value={formatNullableNumber(productForm.sell_price)}
                onChange={(event) =>
                  onUpdateForm('sell_price', parseNullableNumber(event.target.value))
                }
                inputMode="decimal"
                placeholder="판매단가 입력"
              />
            </FormField>
          </>
        ) : null}

        {productFormError ? <Alert>{productFormError}</Alert> : null}
      </form>
    </Modal>
  );
}
