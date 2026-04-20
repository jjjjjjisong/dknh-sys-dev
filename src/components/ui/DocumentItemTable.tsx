import React, { useState } from 'react';
import { DEFAULT_GUBUN, GUBUN_OPTIONS } from '../../constants/gubun';
import type { Product } from '../../types/product';
import {
  formatDecimalInput,
  formatIntegerInput,
  formatNumber,
  parseNullableDecimal,
  parseNullableInteger,
  stripNonNumericAllowNegative,
} from '../../utils/formatters';

export const MANUAL_PRODUCT_ID = '__manual__';

export type SharedItemRow = {
  id: string;
  productId: string;
  manualName: string;
  manualGubun: string;
  orderDate: string;
  arriveDate: string;
  qty: number | null;
  customPallet: number | null;
  customBox: number | null;
  unitPrice: number | null;
  customSupply: number | null;
  vat: boolean;
  releaseNote: string;
  invoiceNote: string;
};

export type ItemSummary = {
  name1: string;
  name2: string;
  gubun: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vatAmount: number;
  pallet: number | null;
  box: number | null;
  eaPerB: number | null;
  boxPerP: number | null;
};

interface DocumentItemTableProps {
  items: SharedItemRow[];
  clientProducts: Product[];
  itemSummaries: ItemSummary[];
  totals: { supply: number; vat: number; total: number };
  onUpdateItem: (id: string, updater: (item: SharedItemRow) => SharedItemRow) => void;
  onRemoveItem: (id: string) => void;
  onAddItem: () => void;
}

type IntegerFieldKey = 'qty' | 'customPallet' | 'customBox' | 'customSupply';

export default function DocumentItemTable({
  items,
  clientProducts,
  itemSummaries,
  totals,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: DocumentItemTableProps) {
  const [integerEditingValues, setIntegerEditingValues] = useState<Record<string, string>>({});

  function getIntegerFieldStateKey(id: string, key: IntegerFieldKey) {
    return `${id}:${key}`;
  }

  function getIntegerDisplayValue(id: string, key: IntegerFieldKey, value: number | null) {
    const stateKey = getIntegerFieldStateKey(id, key);
    if (Object.prototype.hasOwnProperty.call(integerEditingValues, stateKey)) {
      return integerEditingValues[stateKey];
    }
    return formatIntegerInput(value);
  }

  function handleNumericFocus(
    id: string,
    key: 'qty' | 'customPallet' | 'customBox' | 'unitPrice' | 'customSupply',
  ) {
    onUpdateItem(id, (current) => {
      const value = current[key];
      if (value === 0) {
        return { ...current, [key]: null };
      }
      return current;
    });
  }

  function handleIntegerFocus(id: string, key: IntegerFieldKey, value: number | null) {
    handleNumericFocus(id, key);
    setIntegerEditingValues((current) => ({
      ...current,
      [getIntegerFieldStateKey(id, key)]: value === null || value === 0 ? '' : String(value),
    }));
  }

  function handleIntegerBlur(id: string, key: IntegerFieldKey) {
    const stateKey = getIntegerFieldStateKey(id, key);
    setIntegerEditingValues((current) => {
      const next = { ...current };
      delete next[stateKey];
      return next;
    });
  }

  function handleIntegerChange(id: string, key: IntegerFieldKey, rawValue: string) {
    const sanitized = stripNonNumericAllowNegative(rawValue);
    const stateKey = getIntegerFieldStateKey(id, key);

    setIntegerEditingValues((current) => ({
      ...current,
      [stateKey]: sanitized,
    }));

    onUpdateItem(id, (current) => ({
      ...current,
      [key]: sanitized === '' || sanitized === '-' ? null : parseNullableInteger(sanitized),
      ...(key === 'qty'
        ? {
            customPallet: null,
            customBox: null,
            customSupply: null,
          }
        : {}),
    }));
  }

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>품목 정보</h2>
        </div>
        <button className="btn btn-primary" type="button" onClick={onAddItem}>
          + 품목 추가
        </button>
      </div>

      <div className="table-wrap">
        <table className="table doc-items-table wide">
          <thead>
            <tr>
              <th>#</th>
              <th className="doc-item-name-cell">품목명</th>
              <th className="doc-gubun-col">구분</th>
              <th>발주일자</th>
              <th>입고일자</th>
              <th>수량(ea)</th>
              <th className="doc-pallet-col">파레트</th>
              <th className="doc-box-col">BOX</th>
              <th>단가</th>
              <th>공급가액</th>
              <th>VAT</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const summary = itemSummaries[index];
              const manualMode = item.productId === MANUAL_PRODUCT_ID;

              return (
                <React.Fragment key={item.id}>
                  <tr className="doc-item-main-row">
                    <td>{index + 1}</td>
                    <td className="doc-item-name-cell">
                      <select
                        className="doc-cell-control"
                        value={item.productId}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          const selected = clientProducts.find((row) => row.id === nextId);
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            productId: nextId,
                            manualGubun: DEFAULT_GUBUN,
                            manualName: nextId === MANUAL_PRODUCT_ID ? current.manualName : '',
                            unitPrice:
                              nextId === MANUAL_PRODUCT_ID
                                ? current.unitPrice
                                : selected?.sell_price ?? null,
                            customSupply: null,
                          }));
                        }}
                      >
                        <option value="">품목 선택</option>
                        {clientProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name1}
                          </option>
                        ))}
                        <option value={MANUAL_PRODUCT_ID}>직접입력</option>
                      </select>
                    </td>
                    <td className="doc-gubun-cell">
                      {manualMode ? (
                        <select
                          className="doc-cell-control"
                          value={item.manualGubun}
                          onChange={(event) =>
                            onUpdateItem(item.id, (current) => ({
                              ...current,
                              manualGubun: event.target.value,
                            }))
                          }
                        >
                          {GUBUN_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        summary.gubun || '-'
                      )}
                    </td>
                    <td>
                      <input
                        className="doc-cell-control"
                        type="date"
                        value={item.orderDate}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            orderDate: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control"
                        type="date"
                        value={item.arriveDate}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            arriveDate: event.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control doc-number-input-qty"
                        type="text"
                        inputMode="text"
                        value={getIntegerDisplayValue(item.id, 'qty', item.qty)}
                        onFocus={() => handleIntegerFocus(item.id, 'qty', item.qty)}
                        onBlur={() => handleIntegerBlur(item.id, 'qty')}
                        onChange={(event) => handleIntegerChange(item.id, 'qty', event.target.value)}
                      />
                    </td>
                    <td className="doc-pallet-col">
                      <input
                        className="doc-cell-control doc-number-input-pallet-box"
                        type="text"
                        inputMode="text"
                        value={getIntegerDisplayValue(item.id, 'customPallet', item.customPallet)}
                        onFocus={() =>
                          handleIntegerFocus(item.id, 'customPallet', item.customPallet)
                        }
                        onBlur={() => handleIntegerBlur(item.id, 'customPallet')}
                        onChange={(event) =>
                          handleIntegerChange(item.id, 'customPallet', event.target.value)
                        }
                        placeholder={summary.pallet !== null ? String(summary.pallet) : '자동'}
                      />
                    </td>
                    <td className="doc-box-col">
                      <input
                        className="doc-cell-control doc-number-input-pallet-box"
                        type="text"
                        inputMode="text"
                        value={getIntegerDisplayValue(item.id, 'customBox', item.customBox)}
                        onFocus={() => handleIntegerFocus(item.id, 'customBox', item.customBox)}
                        onBlur={() => handleIntegerBlur(item.id, 'customBox')}
                        onChange={(event) =>
                          handleIntegerChange(item.id, 'customBox', event.target.value)
                        }
                        placeholder={summary.box !== null ? String(summary.box) : '자동'}
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control doc-number-input-unitprice"
                        type="text"
                        inputMode="decimal"
                        value={formatDecimalInput(item.unitPrice)}
                        onFocus={() => handleNumericFocus(item.id, 'unitPrice')}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            unitPrice: parseNullableDecimal(event.target.value),
                            customSupply: null,
                          }))
                        }
                        placeholder="단가"
                      />
                    </td>
                    <td>
                      <input
                        className="doc-cell-control doc-number-input-supply"
                        type="text"
                        inputMode="text"
                        value={getIntegerDisplayValue(item.id, 'customSupply', item.customSupply)}
                        onFocus={() =>
                          handleIntegerFocus(item.id, 'customSupply', item.customSupply)
                        }
                        onBlur={() => handleIntegerBlur(item.id, 'customSupply')}
                        onChange={(event) =>
                          handleIntegerChange(item.id, 'customSupply', event.target.value)
                        }
                        placeholder={formatNumber(summary.supply)}
                      />
                    </td>
                    <td>
                      <label className="inline-check">
                        <input
                          type="checkbox"
                          checked={item.vat}
                          onChange={(event) =>
                            onUpdateItem(item.id, (current) => ({
                              ...current,
                              vat: event.target.checked,
                            }))
                          }
                        />
                        포함
                      </label>
                    </td>
                    <td>
                      <button
                        className="btn btn-danger doc-delete-button"
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                  <tr className="doc-item-note-row">
                    <td className="doc-item-note-spacer" />
                    <td>
                      {manualMode ? (
                        <input
                          className="doc-cell-control doc-item-name-input"
                          value={item.manualName}
                          onChange={(event) =>
                            onUpdateItem(item.id, (current) => ({
                              ...current,
                              manualName: event.target.value,
                            }))
                          }
                          placeholder="품목명 입력"
                        />
                      ) : null}
                    </td>
                    <td className="doc-item-note-spacer" />
                    <td colSpan={2}>
                      <input
                        className="doc-cell-control doc-item-release-note"
                        value={item.releaseNote}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            releaseNote: event.target.value,
                          }))
                        }
                        placeholder="비고(출고의뢰서) 입력"
                      />
                    </td>
                    <td colSpan={2}>
                      <input
                        className="doc-cell-control doc-item-invoice-note"
                        value={item.invoiceNote}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            invoiceNote: event.target.value,
                          }))
                        }
                        placeholder="비고(거래명세서) 입력"
                      />
                    </td>
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                    <td className="doc-item-note-spacer" />
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="doc-totals-strip">
        <div className="doc-total-item">
          <span>공급가액 합계</span>
          <strong>{formatNumber(totals.supply)}</strong>
        </div>
        <div className="doc-total-item">
          <span>부가세 합계</span>
          <strong>{formatNumber(totals.vat)}</strong>
        </div>
        <div className="doc-total-item total">
          <span>합계금액</span>
          <strong>{formatNumber(totals.total)}</strong>
        </div>
      </div>
    </section>
  );
}
