import { useEffect, useMemo, useRef, useState } from 'react';
import type { PriceChangeLog, PriceChangePreviewRow } from '../../api/priceChanges';
import { MANUAL_PRICE_CHANGE_PRODUCT_ID } from '../../api/priceChanges';
import type { Client } from '../../types/client';
import type { Product } from '../../types/product';
import Button from '../ui/Button';

export type PriceChangeForm = {
  dateFrom: string;
  dateTo: string;
  clientId: string;
  clientName: string;
  receiver: string;
  productId: string;
  productName: string;
  newCostPrice: string;
  newUnitPrice: string;
};

type PriceChangePanelProps = {
  clients: Client[];
  products: Product[];
  form: PriceChangeForm;
  previewRows: PriceChangePreviewRow[];
  selectedItemIds: string[];
  searched: boolean;
  logs: PriceChangeLog[];
  loadingPreview: boolean;
  applying: boolean;
  onUpdateForm: <K extends keyof PriceChangeForm>(key: K, value: PriceChangeForm[K]) => void;
  onPreview: () => void;
  onTogglePreviewRow: (itemId: string) => void;
  onToggleAllPreviewRows: () => void;
  onRemoveSelectedRow: (itemId: string) => void;
  onApply: () => void;
};

function formatNumber(value: number | null) {
  return value === null ? '-' : value.toLocaleString('ko-KR');
}

function formatDate(value: string | null) {
  return value || '-';
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR');
}

function formatPriceChange(before: number | null, after: number | null) {
  if (after === null) return '-';
  return `${formatNumber(before)} -> ${formatNumber(after)}`;
}

function formatLogDate(log: PriceChangeLog) {
  if (log.baseDate) return formatDate(log.baseDate);
  if (log.dateFrom && log.dateTo && log.dateFrom !== log.dateTo) {
    return `${formatDate(log.dateFrom)} ~ ${formatDate(log.dateTo)}`;
  }
  return formatDate(log.dateFrom ?? log.dateTo);
}

function getProductLabel(product: Product) {
  return [product.client, product.receiver, product.name1].filter(Boolean).join(' / ');
}

export default function PriceChangePanel({
  clients,
  products,
  form,
  previewRows,
  selectedItemIds,
  searched,
  logs,
  loadingPreview,
  applying,
  onUpdateForm,
  onPreview,
  onTogglePreviewRow,
  onToggleAllPreviewRows,
  onRemoveSelectedRow,
  onApply,
}: PriceChangePanelProps) {
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyKeyword, setHistoryKeyword] = useState('');
  const clientSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRef = useRef<HTMLDivElement>(null);
  const selectedIdSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);
  const selectedRows = previewRows.filter((row) => selectedIdSet.has(row.itemId));
  const selectedDocumentCount = new Set(selectedRows.map((row) => row.documentId)).size;
  const allPreviewRowsSelected =
    previewRows.length > 0 && previewRows.every((row) => selectedIdSet.has(row.itemId));
  const manualOnlySelected = form.productId === MANUAL_PRICE_CHANGE_PRODUCT_ID;
  const selectedProduct = manualOnlySelected
    ? undefined
    : products.find((product) => product.id === form.productId);
  const selectedClient = clients.find((client) => client.id === form.clientId);
  const keyword = form.productName.trim().toLowerCase();
  const clientKeyword = form.clientName.trim().toLowerCase();

  const clientSuggestions = useMemo(() => {
    const source = clientKeyword
      ? clients.filter((client) => client.name.toLowerCase().includes(clientKeyword))
      : clients;

    return source.slice(0, 30);
  }, [clientKeyword, clients]);

  const productSuggestions = useMemo(() => {
    const clientFilteredProducts = form.clientId
      ? products.filter((product) => product.clientId === form.clientId)
      : clientKeyword
        ? products.filter((product) => product.client.toLowerCase().includes(clientKeyword))
      : products;
    const source = keyword
      ? clientFilteredProducts.filter((product) =>
          [product.client, product.receiver, product.name1, product.name2]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(keyword)),
        )
      : clientFilteredProducts;

    return source.slice(0, 30);
  }, [clientKeyword, form.clientId, keyword, products]);

  const filteredLogs = useMemo(() => {
    const logKeyword = historyKeyword.trim().toLowerCase();
    if (!logKeyword) return logs;
    return logs.filter((log) => log.productName.toLowerCase().includes(logKeyword));
  }, [historyKeyword, logs]);

  const showManualOption = keyword.length === 0;

  useEffect(() => {
    if (!clientSearchOpen && !productSearchOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (clientSearchOpen && clientSearchRef.current && !clientSearchRef.current.contains(target)) {
        setClientSearchOpen(false);
      }
      if (productSearchOpen && productSearchRef.current && !productSearchRef.current.contains(target)) {
        setProductSearchOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setClientSearchOpen(false);
      setProductSearchOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [clientSearchOpen, productSearchOpen]);

  function handleProductKeywordChange(value: string) {
    onUpdateForm('productName', value);
    setProductSearchOpen(true);
  }

  function handleClientKeywordChange(value: string) {
    onUpdateForm('clientName', value);
    setClientSearchOpen(true);
  }

  function handleClientSelect(client: Client) {
    onUpdateForm('clientName', client.name);
    onUpdateForm('clientId', client.id);
    setClientSearchOpen(false);
  }

  function handleManualSelect() {
    onUpdateForm('productId', MANUAL_PRICE_CHANGE_PRODUCT_ID);
    setProductSearchOpen(false);
  }

  function handleProductSelect(product: Product) {
    onUpdateForm('productName', product.name1);
    onUpdateForm('productId', product.id);
    setProductSearchOpen(false);
  }

  return (
    <div className="price-change-panel">
      <div className="price-change-head">
        <div />
        <Button type="button" variant="secondary" onClick={() => setHistoryOpen(true)}>
          변경 이력 보기
        </Button>
      </div>

      <section className="price-change-section">
        <div className="price-change-section-title">
          <h3>1. 검색 조건</h3>
          <p>날짜와 품목을 선택한 뒤 검색하세요.</p>
        </div>
        <div className="price-change-search-grid">
          <label className="field">
            <span>시작일 *</span>
            <input
              type="date"
              value={form.dateFrom}
              onChange={(event) => onUpdateForm('dateFrom', event.target.value)}
            />
          </label>
          <label className="field">
            <span>종료일 *</span>
            <input
              type="date"
              value={form.dateTo}
              onChange={(event) => onUpdateForm('dateTo', event.target.value)}
            />
          </label>
          <div className="field price-change-client-search" ref={clientSearchRef}>
            <span>납품처</span>
            <input
              value={form.clientName}
              onChange={(event) => handleClientKeywordChange(event.target.value)}
              onFocus={() => setClientSearchOpen(true)}
              placeholder="납품처 검색 또는 선택"
            />
            {clientSearchOpen ? (
              <div className="price-change-product-menu">
                <button
                  type="button"
                  className="price-change-product-option"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onUpdateForm('clientName', '');
                    onUpdateForm('clientId', '');
                    setClientSearchOpen(false);
                  }}
                >
                  <strong>전체 납품처</strong>
                </button>
                {clientSuggestions.length === 0 ? (
                  <button type="button" className="price-change-product-option" disabled>
                    검색 결과가 없습니다.
                  </button>
                ) : (
                  clientSuggestions.map((client) => (
                    <button
                      type="button"
                      key={client.id}
                      className="price-change-product-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleClientSelect(client)}
                    >
                      <strong>{client.name}</strong>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <div className="field price-change-product-search" ref={productSearchRef}>
            <span>품목 선택 *</span>
            <input
              value={form.productName}
              onChange={(event) => handleProductKeywordChange(event.target.value)}
              onFocus={() => setProductSearchOpen(true)}
              placeholder="품목명을 입력해서 검색"
            />
            {productSearchOpen ? (
              <div className="price-change-product-menu">
                {showManualOption ? (
                  <button
                    type="button"
                    className="price-change-product-option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={handleManualSelect}
                  >
                    <strong>직접입력</strong>
                    <span>기간 내 직접입력 품목 전체 검색</span>
                  </button>
                ) : null}
                {productSuggestions.length === 0 ? (
                  <button type="button" className="price-change-product-option" disabled>
                    검색 결과가 없습니다.
                  </button>
                ) : (
                  productSuggestions.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      className="price-change-product-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleProductSelect(product)}
                    >
                      <strong>{product.name1}</strong>
                      <span>{getProductLabel(product)}</span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <Button type="button" variant="primary" onClick={onPreview} disabled={loadingPreview || applying}>
            {loadingPreview ? '검색 중...' : '검색'}
          </Button>
        </div>
        {manualOnlySelected ? (
          <div className="price-change-count-row">
            <span>선택된 품목: 직접입력</span>
            {selectedClient ? <span>납품처: {selectedClient.name}</span> : null}
          </div>
        ) : null}
        {manualOnlySelected ? (
          <div className="price-change-next-hint price-change-step-enter">
            {form.productName.trim()
              ? `기간 내 직접입력 품목 중 "${form.productName.trim()}" 검색합니다.`
              : '기간 내 직접입력 품목 전체를 검색합니다.'}
          </div>
        ) : null}
        {selectedProduct ? (
          <div className="price-change-product-summary price-change-step-enter">
            <div>
              <span>납품처</span>
              <strong>{selectedProduct.client || '-'}</strong>
            </div>
            <div>
              <span>수신처</span>
              <strong>{selectedProduct.receiver || '-'}</strong>
            </div>
            <div>
              <span>품목명</span>
              <strong>{selectedProduct.name1 || '-'}</strong>
            </div>
            <div>
              <span>입고단가</span>
              <strong>{formatNumber(selectedProduct.cost_price ?? null)}</strong>
            </div>
            <div>
              <span>판매단가</span>
              <strong>{formatNumber(selectedProduct.sell_price ?? null)}</strong>
            </div>
          </div>
        ) : null}
      </section>

      {searched ? (
        <section className="price-change-section price-change-step-enter">
          <div className="price-change-section-title">
            <h3>2. 검색 결과</h3>
            <p>변경할 항목만 체크하세요.</p>
          </div>
          <div className="price-change-count-row">
            <span>검색 결과 {previewRows.length.toLocaleString('ko-KR')}건</span>
            <span>선택 {selectedRows.length.toLocaleString('ko-KR')}건</span>
          </div>
          {previewRows.length === 0 ? (
            <div className="price-change-empty-result">검색 결과가 없습니다.</div>
          ) : (
            <div className="table-wrap price-change-preview-table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 54 }}>
                      <input
                        type="checkbox"
                        checked={allPreviewRowsSelected}
                        disabled={previewRows.length === 0}
                        onChange={onToggleAllPreviewRows}
                        aria-label="검색 결과 전체 선택"
                      />
                    </th>
                    <th className="price-change-date-col">기준일</th>
                    <th style={{ width: 100 }}>발급번호</th>
                    <th style={{ minWidth: 150 }}>납품처</th>
                    <th style={{ minWidth: 140 }}>수신처</th>
                    <th style={{ minWidth: 220 }}>품목</th>
                    <th style={{ width: 90, textAlign: 'right' }}>수량</th>
                    <th style={{ width: 110, textAlign: 'right' }}>입고단가</th>
                    <th style={{ width: 110, textAlign: 'right' }}>판매단가</th>
                    <th style={{ width: 130, textAlign: 'right' }}>공급가액</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.itemId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIdSet.has(row.itemId)}
                          onChange={() => onTogglePreviewRow(row.itemId)}
                          aria-label={`${row.productName} 선택`}
                        />
                      </td>
                      <td className="price-change-date-col">{formatDate(row.baseDate)}</td>
                      <td>{row.issueNo || '-'}</td>
                      <td>{row.clientName || '-'}</td>
                      <td>{row.receiver || '-'}</td>
                      <td>{row.productName || '-'}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.qty)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.costPrice)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(row.supply)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {selectedRows.length > 0 ? (
        <section className="price-change-section price-change-target-section price-change-step-enter">
          <div className="price-change-section-title">
            <h3>3. 변경 대상</h3>
            <p>체크한 항목만 실제 변경됩니다.</p>
          </div>
          <div className="price-change-target-summary">
            <div>
              <span>선택 품목</span>
              <strong>{selectedRows.length.toLocaleString('ko-KR')}건</strong>
            </div>
            <div>
              <span>영향 문서</span>
              <strong>{selectedDocumentCount.toLocaleString('ko-KR')}건</strong>
            </div>
          </div>
          <div className="table-wrap price-change-selected-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="price-change-date-col">기준일</th>
                  <th style={{ width: 100 }}>발급번호</th>
                  <th style={{ minWidth: 140 }}>납품처</th>
                  <th style={{ minWidth: 130 }}>수신처</th>
                  <th style={{ minWidth: 220 }}>품목</th>
                  <th style={{ width: 90, textAlign: 'right' }}>수량</th>
                  <th style={{ width: 110, textAlign: 'right' }}>입고단가</th>
                  <th style={{ width: 110, textAlign: 'right' }}>판매단가</th>
                  <th style={{ width: 80 }}>제외</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((row) => (
                  <tr key={row.itemId}>
                    <td className="price-change-date-col">{formatDate(row.baseDate)}</td>
                    <td>{row.issueNo || '-'}</td>
                    <td>{row.clientName || '-'}</td>
                    <td>{row.receiver || '-'}</td>
                    <td>{row.productName || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(row.qty)}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(row.costPrice)}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(row.unitPrice)}</td>
                    <td>
                      <button
                        type="button"
                        className="price-change-remove-btn"
                        onClick={() => onRemoveSelectedRow(row.itemId)}
                      >
                        제외
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="price-change-apply-grid">
            <label className="field">
              <span>변경할 입고단가</span>
              <input
                value={form.newCostPrice}
                onChange={(event) => onUpdateForm('newCostPrice', event.target.value)}
                inputMode="decimal"
                placeholder="비우면 변경 안 함"
              />
            </label>
            <label className="field">
              <span>변경할 판매단가</span>
              <input
                value={form.newUnitPrice}
                onChange={(event) => onUpdateForm('newUnitPrice', event.target.value)}
                inputMode="decimal"
                placeholder="비우면 변경 안 함"
              />
            </label>
            <Button
              type="button"
              variant="primary"
              onClick={onApply}
              disabled={selectedRows.length === 0 || applying || loadingPreview}
            >
              {applying ? '변경 중...' : '변경하기'}
            </Button>
          </div>
        </section>
      ) : searched ? (
        <div className="price-change-next-hint price-change-step-enter">
          검색 결과에서 변경할 항목을 체크하면 변경 대상 영역이 나타납니다.
        </div>
      ) : null}

      {historyOpen ? (
        <div className="modal-overlay" role="presentation">
          <div className="modal-card price-change-history-modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <h2>단가 변경 이력</h2>
              </div>
              <Button type="button" variant="secondary" onClick={() => setHistoryOpen(false)}>
                닫기
              </Button>
            </div>
            <label className="field">
              <span>품목명 검색</span>
              <input
                value={historyKeyword}
                onChange={(event) => setHistoryKeyword(event.target.value)}
                placeholder="품목명을 입력하세요"
              />
            </label>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 112 }}>날짜</th>
                    <th style={{ width: 110 }}>발급번호</th>
                    <th style={{ minWidth: 200 }}>품목</th>
                    <th style={{ minWidth: 150 }}>납품처</th>
                    <th style={{ minWidth: 130 }}>수신처</th>
                    <th style={{ width: 105 }}>입고단가</th>
                    <th style={{ width: 105 }}>판매단가</th>
                    <th style={{ width: 100 }}>변경자</th>
                    <th style={{ width: 210 }}>변경일시</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-empty">
                        단가 변경 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatLogDate(log)}</td>
                        <td>{log.issueNo || '-'}</td>
                        <td>{log.productName || '-'}</td>
                        <td>{log.clientName || '-'}</td>
                        <td>{log.receiver || '-'}</td>
                        <td>{formatPriceChange(log.oldCostPrice, log.newCostPrice)}</td>
                        <td>{formatPriceChange(log.oldUnitPrice, log.newUnitPrice)}</td>
                        <td>{log.changedBy || '-'}</td>
                        <td>{formatDateTime(log.changedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
