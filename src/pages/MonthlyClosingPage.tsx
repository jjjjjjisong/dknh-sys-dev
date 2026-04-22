import { useEffect, useMemo, useRef, useState } from 'react';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { fetchClients } from '../api/clients';
import { fetchDocuments, updateDocumentItemMonthlyClosingNote } from '../api/documents';
import { fetchProducts } from '../api/products';
import PageHeader from '../components/PageHeader';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import type { Client } from '../types/client';
import type { DocumentHistory, DocumentHistoryItem } from '../types/document';
import type { Product } from '../types/product';

type ClosingRow = {
  id: string;
  itemId: string;
  date: string;
  productName: string;
  unitPrice: number;
  qty: number;
  supply: number;
  vat: number;
  total: number;
  note: string;
};

type ClosingGroup = {
  productName: string;
  rows: ClosingRow[];
  subtotalQty: number;
  subtotalSupply: number;
  subtotalVat: number;
  subtotalTotal: number;
};

type SupplierInfo = {
  supplierName: string;
  supplierOwner: string;
  supplierBizNo: string;
  supplierAddress: string;
};

type SummaryRow = {
  clientId: string;
  clientName: string;
  totalAmount: number;
};

const today = new Date();
const currentYear = String(today.getFullYear());
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
const currentYearMonth = `${currentYear}-${currentMonth}`;
const defaultSupplierAddress = '서울시 동대문구 장한로21,5층507호 북한연구소빌딩';

export default function MonthlyClosingPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [documents, setDocuments] = useState<DocumentHistory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedYearMonth, setSelectedYearMonth] = useState(currentYearMonth);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientKeyword, setClientKeyword] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [summaryNoteDrafts, setSummaryNoteDrafts] = useState<Record<string, string>>({});
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const clientSearchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPageData() {
      try {
        setLoading(true);
        setError(null);

        const [clientRows, documentRows, productRows] = await Promise.all([
          fetchClients(),
          fetchDocuments(),
          fetchProducts(),
        ]);

        if (!mounted) return;

        const activeClients = clientRows.filter((client) => client.active !== false);
        setClients(activeClients);
        setDocuments(documentRows);
        setProducts(productRows);

        if (!selectedClientId && activeClients.length > 0) {
          setSelectedClientId(activeClients[0].id);
          setClientKeyword(activeClients[0].name);
        } else if (
          selectedClientId &&
          !activeClients.some((client) => client.id === selectedClientId) &&
          activeClients.length > 0
        ) {
          setSelectedClientId(activeClients[0].id);
          setClientKeyword(activeClients[0].name);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : '월마감 데이터를 불러오지 못했습니다.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPageData();

    return () => {
      mounted = false;
    };
  }, [selectedClientId]);

  useEffect(() => {
    if (!clientDropdownOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (clientSearchBoxRef.current && !clientSearchBoxRef.current.contains(event.target as Node)) {
        setClientDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [clientDropdownOpen]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const availableYearMonths = useMemo(() => {
    const values = new Set<string>();

    documents.forEach((document) => {
      if (document.status === 'ST01') return;

      document.items.forEach((item) => {
        const baseDate = getItemBaseDate(document, item);
        if (baseDate) values.add(baseDate.slice(0, 7));
      });
    });

    if (values.size === 0) {
      values.add(currentYearMonth);
    }

    return Array.from(values).sort((left, right) => right.localeCompare(left));
  }, [documents]);

  useEffect(() => {
    if (!availableYearMonths.includes(selectedYearMonth)) {
      setSelectedYearMonth(availableYearMonths[0] ?? currentYearMonth);
    }
  }, [availableYearMonths, selectedYearMonth]);

  const filteredClients = useMemo(() => {
    const keyword = clientKeyword.trim().toLowerCase();
    if (!keyword) return clients;
    return clients.filter((client) => client.name.toLowerCase().includes(keyword));
  }, [clientKeyword, clients]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  useEffect(() => {
    if (selectedClient) {
      setClientKeyword(selectedClient.name);
    }
  }, [selectedClient]);

  const closingRows = useMemo<ClosingRow[]>(() => {
    if (!selectedYearMonth || !selectedClient) return [];

    const rows: ClosingRow[] = [];

    documents.forEach((document) => {
      if (document.status === 'ST01') return;
      if (document.clientId !== selectedClient.id) return;

      document.items.forEach((item) => {
        const baseDate = getItemBaseDate(document, item);
        if (!baseDate || !baseDate.startsWith(selectedYearMonth)) return;

        const matchedProduct = item.productId ? productMap.get(item.productId) ?? null : null;
        const productName = matchedProduct?.name1?.trim() || item.name1.trim();
        if (!productName) return;

        const supply = Number(item.supply || 0);
        const vat = item.vat ? Math.round(supply * 0.1) : 0;

        rows.push({
          id: `${document.id}-${item.id}`,
          itemId: item.id,
          date: baseDate,
          productName,
          unitPrice: Number(item.unitPrice || 0),
          qty: Number(item.qty || 0),
          supply,
          vat,
          total: supply + vat,
          note: item.monthlyClosingNote?.trim() || '',
        });
      });
    });

    return rows.sort((left, right) => {
      const nameOrder = left.productName.localeCompare(right.productName, 'ko');
      if (nameOrder !== 0) return nameOrder;
      return left.date.localeCompare(right.date);
    });
  }, [documents, productMap, selectedClient, selectedYearMonth]);

  useEffect(() => {
    setNoteDrafts((current) => {
      const next: Record<string, string> = {};
      closingRows.forEach((row) => {
        next[row.id] = Object.prototype.hasOwnProperty.call(current, row.id)
          ? current[row.id]
          : row.note;
      });
      return next;
    });
  }, [closingRows]);

  const closingGroups = useMemo<ClosingGroup[]>(() => {
    const grouped = new Map<string, ClosingGroup>();

    closingRows.forEach((row) => {
      const group = grouped.get(row.productName) ?? {
        productName: row.productName,
        rows: [],
        subtotalQty: 0,
        subtotalSupply: 0,
        subtotalVat: 0,
        subtotalTotal: 0,
      };

      group.rows.push(row);
      group.subtotalQty += row.qty;
      group.subtotalSupply += row.supply;
      group.subtotalVat += row.vat;
      group.subtotalTotal += row.total;
      grouped.set(row.productName, group);
    });

    return Array.from(grouped.values());
  }, [closingRows]);

  const summary = useMemo(
    () =>
      closingGroups.reduce(
        (acc, group) => ({
          qty: acc.qty + group.subtotalQty,
          supply: acc.supply + group.subtotalSupply,
          vat: acc.vat + group.subtotalVat,
          total: acc.total + group.subtotalTotal,
        }),
        { qty: 0, supply: 0, vat: 0, total: 0 },
      ),
    [closingGroups],
  );

  const monthlyClientSummaries = useMemo<SummaryRow[]>(() => {
    const totalByClientId = new Map<string, number>();

    documents.forEach((document) => {
      if (document.status === 'ST01') return;
      if (!document.clientId) return;

      let documentTotal = 0;

      document.items.forEach((item) => {
        const baseDate = getItemBaseDate(document, item);
        if (!baseDate || !baseDate.startsWith(selectedYearMonth)) return;

        const supply = Number(item.supply || 0);
        const vat = item.vat ? Math.round(supply * 0.1) : 0;
        documentTotal += supply + vat;
      });

      if (documentTotal === 0) return;
      totalByClientId.set(document.clientId, (totalByClientId.get(document.clientId) ?? 0) + documentTotal);
    });

    return clients
      .map((client) => ({
        clientId: client.id,
        clientName: client.name,
        totalAmount: totalByClientId.get(client.id) ?? 0,
      }))
      .sort((left, right) => left.clientName.localeCompare(right.clientName, 'ko'));
  }, [clients, documents, selectedYearMonth]);

  const supplierInfo = useMemo<SupplierInfo | null>(() => {
    if (!selectedClient || closingRows.length === 0) return null;

    const sourceDocument =
      documents.find(
        (document) =>
          document.clientId === selectedClient.id &&
          document.status !== 'ST01' &&
          document.items.some((item) => {
            const baseDate = getItemBaseDate(document, item);
            return baseDate?.startsWith(selectedYearMonth);
          }),
      ) ?? null;

    if (!sourceDocument) return null;

    return {
      supplierName: sourceDocument.supplierName,
      supplierOwner: sourceDocument.supplierOwner,
      supplierBizNo: sourceDocument.supplierBizNo,
      supplierAddress: sourceDocument.supplierAddress,
    };
  }, [closingRows.length, documents, selectedClient, selectedYearMonth]);

  function handleClientSelect(client: Client) {
    setSelectedClientId(client.id);
    setClientKeyword(client.name);
    setClientDropdownOpen(false);
  }

  async function handleSaveNote(row: ClosingRow) {
    const nextNote = (noteDrafts[row.id] ?? '').trim();

    try {
      setSavingRowId(row.id);
      setError(null);
      await updateDocumentItemMonthlyClosingNote(row.itemId, nextNote);

      setDocuments((current) =>
        current.map((document) => ({
          ...document,
          items: document.items.map((item) =>
            item.id === row.itemId ? { ...item, monthlyClosingNote: nextNote } : item,
          ),
        })),
      );

      setNoteDrafts((current) => ({
        ...current,
        [row.id]: nextNote,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '비고 저장에 실패했습니다.');
    } finally {
      setSavingRowId(null);
    }
  }

  function handleDownloadExcel() {
    if (closingGroups.length === 0) {
      window.alert('다운로드할 월마감 데이터가 없습니다.');
      return;
    }

    void exportMonthlyClosingToExcel({
      yearMonth: selectedYearMonth,
      clientName: selectedClient?.name || '전체',
      supplierInfo,
      groups: closingGroups,
      noteDrafts,
      summary,
    });
  }

  function handleDownloadSummaryExcel() {
    if (monthlyClientSummaries.length === 0) {
      window.alert('\uB2E4\uC6B4\uB85C\uB4DC\uD560 \uC885\uD569\uC7A5 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.');
      return;
    }

    void exportMonthlySummaryToExcel({
      yearMonth: selectedYearMonth,
      rows: monthlyClientSummaries,
      noteDrafts: summaryNoteDrafts,
    });
  }

  return (
    <div className="page-content">
      <PageHeader
        title="월마감"
        description="발행이력 기준으로 월별 입고 내역을 품목별로 묶어 확인합니다."
      />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card monthly-closing-filter-card">
        <div className="monthly-closing-filter-grid">
          <label className="field">
            <span>연 / 월</span>
            <select value={selectedYearMonth} onChange={(event) => setSelectedYearMonth(event.target.value)}>
              {availableYearMonths.map((yearMonth) => (
                <option key={yearMonth} value={yearMonth}>
                  {formatYearMonthLabel(yearMonth)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>납품처</span>
            <div className="client-search-box" ref={clientSearchBoxRef}>
              <input
                className="search-input"
                value={clientKeyword}
                onChange={(event) => {
                  setClientKeyword(event.target.value);
                  setClientDropdownOpen(true);
                }}
                onFocus={() => setClientDropdownOpen(true)}
                placeholder="납품처 검색 또는 선택"
              />
              <span className="client-search-caret" aria-hidden="true" />
              {clientDropdownOpen ? (
                <div className="client-search-dropdown">
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        className="client-search-option"
                        onClick={() => handleClientSelect(client)}
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
          </label>

          <div className="monthly-closing-filter-actions">
            <Button type="button" variant="secondary" onClick={() => setSummaryModalOpen(true)}>
              종합장
            </Button>
          </div>
        </div>
      </section>

      <section className="card monthly-closing-sheet">
        <div className="monthly-closing-sheet-head">
          <div>
            <h2>
              {selectedClient?.name
                ? `${formatYearMonthTitle(selectedYearMonth)} ${selectedClient.name} 월마감`
                : '월마감'}
            </h2>
            <p>품목별 상세 내역과 소계를 확인하고, 비고를 직접 입력해 저장할 수 있습니다.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="excel-download-button"
            onClick={handleDownloadExcel}
            disabled={loading || closingGroups.length === 0}
          >
            엑셀 다운로드
          </Button>
        </div>

        {loading ? (
          <div className="empty-state">월마감 데이터를 불러오는 중입니다...</div>
        ) : closingGroups.length === 0 ? (
          <div className="empty-state">선택한 조건에 해당하는 발행이력이 없습니다.</div>
        ) : (
          <div className="table-wrap">
            <table className="table monthly-closing-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>날짜</th>
                  <th style={{ minWidth: 320 }}>품목명</th>
                  <th style={{ width: 90 }}>단위</th>
                  <th style={{ width: 110, textAlign: 'right' }}>단가</th>
                  <th style={{ width: 120, textAlign: 'right' }}>입고량</th>
                  <th style={{ width: 140, textAlign: 'right' }}>공급가액</th>
                  <th style={{ width: 120, textAlign: 'right' }}>부가세</th>
                  <th style={{ width: 140, textAlign: 'right' }}>합계</th>
                  <th style={{ minWidth: 220 }}>비고란</th>
                </tr>
              </thead>
              <tbody>
                {closingGroups.flatMap((group) =>
                  group.rows.flatMap((row, index) => {
                    const elements = [
                      <tr key={row.id}>
                        <td>{formatShortDate(row.date)}</td>
                        <td>
                          <div className="table-primary">{row.productName}</div>
                        </td>
                        <td>EA</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(row.unitPrice)}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(row.qty)}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(row.supply)}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(row.vat)}</td>
                        <td style={{ textAlign: 'right' }}>{formatNumber(row.total)}</td>
                        <td>
                          <input
                            className="search-input monthly-closing-note-input"
                            value={noteDrafts[row.id] ?? ''}
                            placeholder="비고 입력 후 Enter"
                            disabled={savingRowId === row.id}
                            onChange={(event) =>
                              setNoteDrafts((current) => ({
                                ...current,
                                [row.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter') return;
                              event.preventDefault();
                              void handleSaveNote(row);
                            }}
                          />
                        </td>
                      </tr>,
                    ];

                    if (index === group.rows.length - 1) {
                      elements.push(
                        <tr key={`${group.productName}-subtotal`} className="monthly-closing-subtotal-row">
                          <td colSpan={4}>소계</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(group.subtotalQty)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(group.subtotalSupply)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(group.subtotalVat)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(group.subtotalTotal)}</td>
                          <td />
                        </tr>,
                      );
                    }

                    return elements;
                  }),
                )}
              </tbody>
              <tfoot>
                <tr className="monthly-closing-grand-total-row">
                  <td colSpan={4}>월 합계</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(summary.qty)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(summary.supply)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(summary.vat)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(summary.total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={summaryModalOpen}
        title={`${formatYearMonthLabel(selectedYearMonth)} 거래명세서 합계`}
        description="납품처별 해당 월 총 금액 합계를 확인합니다."
        onClose={() => setSummaryModalOpen(false)}
        closeOnOverlayClick
        cardClassName="monthly-summary-modal-card"
        headerAction={
          <Button
            type="button"
            variant="secondary"
            className="excel-download-button"
            onClick={handleDownloadSummaryExcel}
            disabled={monthlyClientSummaries.length === 0}
          >
            {'\uC5D1\uC140 \uB2E4\uC6B4\uB85C\uB4DC'}
          </Button>
        }
        footer={
          <Button type="button" variant="secondary" onClick={() => setSummaryModalOpen(false)}>
            닫기
          </Button>
        }
      >
        <div className="table-wrap">
          <table className="table monthly-summary-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>거래처</th>
                <th style={{ width: 180, textAlign: 'right' }}>금액</th>
                <th style={{ minWidth: 180 }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {monthlyClientSummaries.map((row) => (
                <tr key={row.clientId}>
                  <td>{row.clientName}</td>
                  <td style={{ textAlign: 'right' }}>
                    {row.totalAmount > 0 ? formatNumber(row.totalAmount) : '-'}
                  </td>
                  <td>
                    <input
                      className="search-input monthly-summary-note-input"
                      value={summaryNoteDrafts[row.clientId] ?? ''}
                      onChange={(event) =>
                        setSummaryNoteDrafts((current) => ({
                          ...current,
                          [row.clientId]: event.target.value,
                        }))
                      }
                      placeholder="비고 입력"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="monthly-closing-grand-total-row">
                <td>합계</td>
                <td style={{ textAlign: 'right' }}>
                  {formatNumber(
                    monthlyClientSummaries.reduce((sum, row) => sum + row.totalAmount, 0),
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Modal>
    </div>
  );
}

async function exportMonthlySummaryToExcel(params: {
  yearMonth: string;
  rows: SummaryRow[];
  noteDrafts: Record<string, string>;
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('\uC885\uD569\uC7A5', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });
  const excelFontName = '\uAD74\uB9BC';
  const totalAmount = params.rows.reduce((sum, row) => sum + row.totalAmount, 0);

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.28,
      right: 0.28,
      top: 0.35,
      bottom: 0.35,
      header: 0.1,
      footer: 0.1,
    },
  };

  worksheet.columns = [{ width: 26 }, { width: 18 }, { width: 20 }];

  worksheet.mergeCells('A1:C1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${formatYearMonthLabel(params.yearMonth)} \uAC70\uB798\uBA85\uC138\uC11C \uD569\uACC4`;
  titleCell.font = { name: excelFontName, size: 16, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  const headerRow = worksheet.getRow(3);
  headerRow.values = ['\uAC70\uB798\uCC98', '\uAE08\uC561', '\uBE44\uACE0'];
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: excelFontName, size: 11, bold: true, color: { argb: 'FF000000' } };
    cell.fill = createSolidFill('FFE5E7EB');
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(cell, 'FFB8BEC8');
  });

  let currentRow = 4;

  params.rows.forEach((row) => {
    const excelRow = worksheet.getRow(currentRow);
    excelRow.values = [
      row.clientName,
      row.totalAmount > 0 ? row.totalAmount : '-',
      params.noteDrafts[row.clientId] ?? '',
    ];
    excelRow.height = 23;

    excelRow.eachCell((cell, colNumber) => {
      cell.font = { name: excelFontName, size: 11, color: { argb: 'FF000000' } };
      cell.alignment = {
        horizontal: colNumber === 2 ? 'right' : 'left',
        vertical: 'middle',
      };
      applyCellBorder(cell, 'FFC9CED6');
    });

    if (row.totalAmount > 0) {
      excelRow.getCell(2).numFmt = '#,##0';
    }

    currentRow += 1;
  });

  const totalRow = worksheet.getRow(currentRow);
  totalRow.values = ['\uD569\uACC4', totalAmount, ''];
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: excelFontName, size: 11, bold: true, color: { argb: 'FF000000' } };
    cell.fill = createSolidFill('FFF3F4F6');
    cell.alignment = {
      horizontal: colNumber === 2 ? 'right' : 'center',
      vertical: 'middle',
    };
    applyCellBorder(cell, 'FFB8BEC8');
  });
  totalRow.getCell(2).numFmt = '#,##0';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `\uC885\uD569\uC7A5_${params.yearMonth.replace('-', '')}.xlsx`);
}

function getItemBaseDate(document: DocumentHistory, item: DocumentHistoryItem) {
  return item.arriveDate || document.arriveDate || item.orderDate || document.orderDate || null;
}

function formatYearMonthLabel(value: string) {
  const [year, month] = value.split('-');
  return `${year}년 ${Number(month)}월`;
}

function formatYearMonthTitle(value: string) {
  const [year, month] = value.split('-');
  return `${year}년 (${Number(month)}월)`;
}

function formatShortDate(value: string) {
  if (!value) return '-';
  const [, month, day] = value.split('-');
  return `${month}/${day}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function createSolidFill(argb: string): ExcelJS.FillPattern {
  return {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
  };
}

function applyCellBorder(cell: ExcelJS.Cell, color = 'FFD6DEE8') {
  cell.border = {
    top: { style: 'thin', color: { argb: color } },
    left: { style: 'thin', color: { argb: color } },
    bottom: { style: 'thin', color: { argb: color } },
    right: { style: 'thin', color: { argb: color } },
  };
}

async function exportMonthlyClosingToExcel(params: {
  yearMonth: string;
  clientName: string;
  supplierInfo: SupplierInfo | null;
  groups: ClosingGroup[];
  noteDrafts: Record<string, string>;
  summary: { qty: number; supply: number; vat: number; total: number };
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('월마감', {
    views: [{ state: 'frozen', ySplit: 6 }],
  });
  const excelFontName = '굴림';
  const firstProductName = params.groups[0]?.productName || '-';
  const totalItemCount = params.groups.reduce((sum, group) => sum + group.rows.length, 0);
  const productSummaryLabel =
    totalItemCount > 1 ? `${firstProductName} 외 ${totalItemCount - 1}건` : firstProductName;

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.2,
      right: 0.2,
      top: 0.35,
      bottom: 0.35,
      header: 0.1,
      footer: 0.1,
    },
  };

  worksheet.columns = [
    { width: 7.5 },
    { width: 37 },
    { width: 6.5 },
    { width: 7.5 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 15 },
    { width: 18 },
  ];

  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${formatYearMonthTitle(params.yearMonth)} ${params.clientName} 품목별 입고 확인서`;
  titleCell.font = { name: excelFontName, size: 18, bold: true, color: { argb: 'FF000000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  worksheet.getCell('A3').value = `공급자 : ${params.supplierInfo?.supplierName || '-'}`;
  worksheet.getCell('A4').value = `공급받는자 : ${params.clientName}`;
  worksheet.getCell('A5').value = `품목명 : ${productSummaryLabel}`;
  worksheet.getCell('I4').value = 'T)02-900-4112';

  ['A3', 'A4', 'A5', 'I4'].forEach((address) => {
    const cell = worksheet.getCell(address);
    cell.font = { name: excelFontName, size: 11, color: { argb: 'FF000000' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: address === 'I4' ? 'right' : 'left',
      wrapText: false,
    };
  });

  const headerRow = worksheet.getRow(6);
  headerRow.values = ['날짜', '품목명', '단위', '단가', '입고량', '공급가액', '부가세', '합계', '비고란'];
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: excelFontName, size: 11, bold: true, color: { argb: 'FF000000' } };
    cell.fill = createSolidFill('FFDADDE2');
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(cell, 'FFB8BEC8');
  });

  let currentRow = 7;

  params.groups.forEach((group) => {
    group.rows.forEach((row) => {
      const excelRow = worksheet.getRow(currentRow);
      excelRow.values = [
        formatShortDate(row.date),
        row.productName,
        'EA',
        row.unitPrice,
        row.qty,
        row.supply,
        row.vat,
        row.total,
        params.noteDrafts[row.id] ?? '',
      ];
      excelRow.height = 22;

      excelRow.eachCell((cell, colNumber) => {
        cell.font = { name: excelFontName, size: 11, color: { argb: 'FF000000' } };
        cell.alignment = {
          horizontal: colNumber >= 4 && colNumber <= 8 ? 'right' : colNumber === 3 ? 'center' : 'left',
          vertical: 'middle',
        };
        applyCellBorder(cell, 'FFC9CED6');
      });

      excelRow.getCell(4).numFmt = '#,##0.0';
      [5, 6, 7, 8].forEach((col) => {
        excelRow.getCell(col).numFmt = '#,##0';
      });

      currentRow += 1;
    });

    const subtotalRow = worksheet.getRow(currentRow);
    subtotalRow.values = ['', '소계', '', '', group.subtotalQty, group.subtotalSupply, group.subtotalVat, group.subtotalTotal, ''];
    subtotalRow.height = 23;
    subtotalRow.eachCell((cell, colNumber) => {
      cell.font = { name: excelFontName, size: 11, bold: true, color: { argb: 'FF000000' } };
      cell.fill = createSolidFill('FFF3F4F6');
      cell.alignment = {
        horizontal: colNumber >= 5 && colNumber <= 8 ? 'right' : colNumber === 2 ? 'center' : 'left',
        vertical: 'middle',
      };
      applyCellBorder(cell, 'FFC9CED6');
    });

    [5, 6, 7, 8].forEach((col) => {
      subtotalRow.getCell(col).numFmt = '#,##0';
    });

    currentRow += 1;
  });

  const totalRow = worksheet.getRow(currentRow);
  totalRow.values = ['', '월 합계', '', '', params.summary.qty, params.summary.supply, params.summary.vat, params.summary.total, ''];
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: excelFontName, size: 11, bold: true, color: { argb: 'FF000000' } };
    cell.fill = createSolidFill('FFE5E7EB');
    cell.alignment = {
      horizontal: colNumber >= 5 && colNumber <= 8 ? 'right' : colNumber === 2 ? 'center' : 'left',
      vertical: 'middle',
    };
    applyCellBorder(cell, 'FFB8BEC8');
  });

  [5, 6, 7, 8].forEach((col) => {
    totalRow.getCell(col).numFmt = '#,##0';
  });

  currentRow += 2;

  worksheet.mergeCells(`A${currentRow}:I${currentRow}`);
  const confirmCell = worksheet.getCell(`A${currentRow}`);
  confirmCell.value = `상기와 같이 ${params.clientName}에 입고 되었음을 확인합니다.`;
  confirmCell.font = { name: excelFontName, size: 11, bold: true, color: { argb: 'FF000000' } };
  confirmCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(currentRow).height = 24;

  currentRow += 1;

  const footerRows = [
    ['공급업체명', params.supplierInfo?.supplierName || '-'],
    ['사업자번호', params.supplierInfo?.supplierBizNo || '-'],
    ['사업장주소', params.supplierInfo?.supplierAddress || defaultSupplierAddress],
    ['대 표 자 명', params.supplierInfo?.supplierOwner || '-'],
  ] as const;

  footerRows.forEach(([label, value]) => {
    worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
    worksheet.mergeCells(`D${currentRow}:I${currentRow}`);

    const labelCell = worksheet.getCell(`A${currentRow}`);
    labelCell.value = label;
    labelCell.font = { name: excelFontName, size: 11, bold: true, color: { argb: 'FF000000' } };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const valueCell = worksheet.getCell(`D${currentRow}`);
    valueCell.value = `: ${value}`;
    valueCell.font = { name: excelFontName, size: 11, color: { argb: 'FF000000' } };
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };

    worksheet.getRow(currentRow).height = 22;
    currentRow += 1;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `월마감_${params.clientName}_${params.yearMonth.replace('-', '')}.xlsx`);
}
