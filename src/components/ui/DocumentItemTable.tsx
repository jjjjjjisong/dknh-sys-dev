import React from 'react';
import type { Product } from '../../types/product';
import {
  formatIntegerInput,
  formatDecimalInput,
  parseNullableInteger,
  parseNullableDecimal,
  stripNonNumeric,
  formatNumber,
} from '../../utils/formatters';

export const MANUAL_PRODUCT_ID = '__manual__';
export const DEFAULT_GUBUN_OPTIONS = ['캔', '캔뚜껑', '라벨', '스트로우', '기타'];

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

export default function DocumentItemTable({
  items,
  clientProducts,
  itemSummaries,
  totals,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: DocumentItemTableProps) {
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
              <th className="doc-pallet-col">파렛트</th>
              <th className="doc-box-col">BOX</th>
              <th>단가</th>
              <th>공급가액</th>
              <th>VAT</th>
              <th className="doc-note-col">비고1</th>
              <th className="doc-note-col">비고2</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const summary = itemSummaries[index];
              const manualMode = item.productId === MANUAL_PRODUCT_ID;

              return (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td className="doc-item-name-cell">
                    <div className="doc-inline-stack">
                      <select
                        className="doc-cell-control"
                        value={item.productId}
                        onChange={(event) => {
                          const nextId = event.target.value;
                          const selected = clientProducts.find((row) => row.id === nextId);
                          onUpdateItem(item.id, (current) => ({
                            ...current,
                            productId: nextId,
                            manualGubun: DEFAULT_GUBUN_OPTIONS[0],
                            manualName: nextId === MANUAL_PRODUCT_ID ? current.manualName : '',
                            unitPrice: nextId === MANUAL_PRODUCT_ID ? current.unitPrice : selected?.sell_price ?? null,
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
                      {manualMode ? (
                        <input
                          className="doc-cell-control doc-item-name-input"
                          value={item.manualName}
                          onChange={(event) =>
                            onUpdateItem(item.id, (current) => ({ ...current, manualName: event.target.value }))
                          }
                          placeholder="품목명"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="doc-gubun-cell">
                    {manualMode ? (
                      <select
                        className="doc-cell-control"
                        value={item.manualGubun}
                        onChange={(event) =>
                          onUpdateItem(item.id, (current) => ({ ...current, manualGubun: event.target.value }))
                        }
                      >
                        {DEFAULT_GUBUN_OPTIONS.map((option) => (
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
                        onUpdateItem(item.id, (current) => ({ ...current, orderDate: event.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="doc-cell-control"
                      type="date"
                      value={item.arriveDate}
                      onChange={(event) =>
                        onUpdateItem(item.id, (current) => ({ ...current, arriveDate: event.target.value }))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="doc-cell-control doc-number-input-qty"
                      type="text"
                      inputMode="numeric"
                      value={formatIntegerInput(item.qty)}
                      onFocus={() => handleNumericFocus(item.id, 'qty')}
                      onChange={(event) =>
                        onUpdateItem(item.id, (current) => ({
                          ...current,
                          qty: parseNullableInteger(stripNonNumeric(event.target.value)),
                          customPallet: null,
                          customBox: null,
                          customSupply: null,
                        }))
                      }
                    />
                  </td>
                  <td className="doc-pallet-col">
                    <input
                      className="doc-cell-control doc-number-input-pallet-box"
                      type="text"
                      inputMode="numeric"
                      value={formatIntegerInput(item.customPallet)}
                      onFocus={() => handleNumericFocus(item.id, 'customPallet')}
                      onChange={(event) =>
                        onUpdateItem(item.id, (current) => ({
                          ...current,
                          customPallet: parseNullableInteger(stripNonNumeric(event.target.value)),
                        }))
                      }
                      placeholder={summary.pallet !== null ? String(summary.pallet) : '자동'}
                    />
                  </td>
                  <td className="doc-box-col">
                    <input
                      className="doc-cell-control doc-number-input-pallet-box"
                      type="text"
                      inputMode="numeric"
                      value={formatIntegerInput(item.customBox)}
                      onFocus={() => handleNumericFocus(item.id, 'customBox')}
                      onChange={(event) =>
                        onUpdateItem(item.id, (current) => ({
                          ...current,
                          customBox: parseNullableInteger(stripNonNumeric(event.target.value)),
                        }))
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
                      inputMode="numeric"
                      value={formatIntegerInput(item.customSupply)}
                      onFocus={() => handleNumericFocus(item.id, 'customSupply')}
                      onChange={(event) =>
                        onUpdateItem(item.id, (current) => ({
                          ...current,
                          customSupply: parseNullableInteger(stripNonNumeric(event.target.value)),
                        }))
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
                          onUpdateItem(item.id, (current) => ({ ...current, vat: event.target.checked }))
                        }
                      />
                      포함
                    </label>
                  </td>
                  <td className="doc-note-col">
                    <textarea
                      className="doc-cell-control doc-item-note"
                      rows={1}
                      value={item.releaseNote}
                      onChange={(event) =>
                        onUpdateItem(item.id, (current) => ({ ...current, releaseNote: event.target.value }))
                      }
                      placeholder="비고(출고의뢰서)"
                    />
                  </td>
                  <td className="doc-note-col">
                    <textarea
                      className="doc-cell-control doc-item-note"
                      rows={1}
                      value={item.invoiceNote}
                      onChange={(event) =>
                        onUpdateItem(item.id, (current) => ({ ...current, invoiceNote: event.target.value }))
                      }
                      placeholder="비고(거래명세서)"
                    />
                  </td>
                  <td>
                    <button className="btn btn-danger doc-delete-button" type="button" onClick={() => onRemoveItem(item.id)}>
                      삭제
                    </button>
                  </td>
                </tr>
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
