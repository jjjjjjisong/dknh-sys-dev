import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { splitInvoiceDataByArriveDate } from './invoiceGrouping';

export interface InvoiceItem {
  name1: string;
  name2: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vat: boolean;
  invoiceNote: string;
  orderDate?: string | null;
  arriveDate?: string | null;
}

export interface InvoiceData {
  issueNo: string;
  client: string;
  manager?: string;
  managerTel?: string;
  receiver: string;
  supplierBizNo: string;
  supplierName: string;
  supplierOwner: string;
  supplierAddress: string;
  supplierBusinessType: string;
  supplierBusinessItem: string;
  orderDate: string | null;
  arriveDate: string | null;
  deliveryAddr: string;
  remark: string;
  requestNote: string;
  totalSupply: number;
  totalVat: number;
  totalAmount: number;
  items: InvoiceItem[];
}

type InvoiceExcelExportOptions = {
  hidePriceFields?: boolean;
};

const FOLD_LINE_ROW = 24;
const SECOND_COPY_START_ROW = 26;
const SECOND_COPY_SPACER_ROW_HEIGHT = 18;

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function formatKoreanDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year} 년 ${parseInt(month, 10)} 월 ${parseInt(day, 10)} 일`;
}

function formatMonthDay(value: string) {
  if (!value) return '';
  return value.slice(5).replace('-', ' / ');
}

function getVisualLength(str: string): number {
  let len = 0;
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    len += code > 0x3000 ? 2 : 1;
  }
  return len;
}

function estimateWrappedLineCount(value: string, charsPerLine = 90) {
  return value
    .split('\n')
    .reduce((count, line) => count + Math.max(1, Math.ceil((getVisualLength(line) || 1) / charsPerLine)), 0);
}

function createThinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  };
}

function applyOuterThinBorder(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let col = startCol; col <= endCol; col += 1) {
      const cell = ws.getCell(row, col);
      const border = { ...(cell.border ?? {}) };

      if (row === startRow) border.top = { style: 'thin' };
      if (row === endRow) border.bottom = { style: 'thin' };
      if (col === startCol) border.left = { style: 'thin' };
      if (col === endCol) border.right = { style: 'thin' };

      cell.border = border;
    }
  }
}

function sanitizeFilePart(value: string) {
  return (value || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatFileDate(value: string | null | undefined) {
  const digits = (value || '').replace(/[^0-9]/g, '');
  if (digits.length === 8) return digits.slice(2);
  return digits || '미정';
}

function buildInvoiceFileName(data: InvoiceData) {
  const client = sanitizeFilePart(data.client || '납품처');
  const arriveDate = formatFileDate(data.arriveDate || data.orderDate);
  return `DKH거래명세서_${client || '납품처'}_${arriveDate}.xlsx`;
}

function createInvoiceWorkbook(data: InvoiceData, options: InvoiceExcelExportOptions = {}) {
  const hidePriceFields = options.hidePriceFields ?? true;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('거래명세서', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.25,
        bottom: 0.25,
        header: 0,
        footer: 0,
      },
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
    },
  });

  ws.columns = [
    { width: 10 },
    { width: 24 },
    { width: 6 },
    { width: 4 },
    { width: 11 },
    { width: 18 },
    { width: 5 },
    { width: 11 },
    { width: 7 },
    { width: 15 },
  ];

  const font10 = { name: '맑은 고딕', size: 10 as const };
  const font10Bold = { name: '맑은 고딕', size: 10 as const, bold: true };
  const font11Bold = { name: '맑은 고딕', size: 11 as const, bold: true };

  const drawInvoicePart = (invoiceData: InvoiceData, startRow: number, suffix: string) => {
    ws.mergeCells(startRow, 1, startRow, 10);
    const titleCell = ws.getCell(startRow, 1);
    titleCell.value = `거 래 명 세 서 ${suffix}`;
    titleCell.font = { name: '맑은 고딕', size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(startRow).height = 40;

    for (let r = startRow + 1; r <= startRow + 4; r += 1) {
      for (let c = 1; c <= 10; c += 1) {
        const cell = ws.getCell(r, c);
        cell.border = createThinBorder();
        cell.font = font10;
        cell.alignment = { vertical: 'middle' };
      }
      ws.getRow(r).height = 35;
    }

    const issueDate = formatKoreanDate(invoiceData.arriveDate || invoiceData.orderDate || '');

    ws.mergeCells(startRow + 1, 1, startRow + 1, 3);
    ws.getCell(startRow + 1, 1).value = issueDate;
    ws.getCell(startRow + 1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow + 2, 1, startRow + 2, 2);
    ws.getCell(startRow + 2, 1).value = invoiceData.client || '';
    ws.getCell(startRow + 2, 1).font = { name: '맑은 고딕', size: 12, bold: true };
    ws.getCell(startRow + 2, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 2, 3).value = '귀하';
    ws.getCell(startRow + 2, 3).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow + 3, 1, startRow + 3, 3);
    ws.getCell(startRow + 3, 1).value = '아래와 같이 계산합니다.';
    ws.getCell(startRow + 3, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow + 4, 1, startRow + 4, 3);
    ws.getCell(startRow + 4, 1).value = hidePriceFields ? '' : `( ${formatNumber(invoiceData.totalAmount)} ) VAT 포함`;
    ws.getCell(startRow + 4, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow + 1, 4, startRow + 4, 4);
    ws.getCell(startRow + 1, 4).value = '공급자';
    ws.getCell(startRow + 1, 4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    ws.getCell(startRow + 1, 5).value = '등록\n번호';
    ws.getCell(startRow + 1, 5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.mergeCells(startRow + 1, 6, startRow + 1, 10);
    ws.getCell(startRow + 1, 6).value = invoiceData.supplierBizNo;
    ws.getCell(startRow + 1, 6).font = font11Bold;
    ws.getCell(startRow + 1, 6).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(startRow + 2, 5).value = '상호';
    ws.getCell(startRow + 2, 5).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 2, 6).value = invoiceData.supplierName;
    ws.getCell(startRow + 2, 6).font = font11Bold;
    ws.getCell(startRow + 2, 6).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 2, 7).value = '성명';
    ws.getCell(startRow + 2, 7).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(startRow + 2, 8, startRow + 2, 10);
    ws.getCell(startRow + 2, 8).value = invoiceData.supplierOwner;
    ws.getCell(startRow + 2, 8).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(startRow + 3, 5).value = '사업장\n주소';
    ws.getCell(startRow + 3, 5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.mergeCells(startRow + 3, 6, startRow + 3, 10);
    ws.getCell(startRow + 3, 6).value = invoiceData.supplierAddress;
    ws.getCell(startRow + 3, 6).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(startRow + 4, 5).value = '업태';
    ws.getCell(startRow + 4, 5).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 4, 6).value = invoiceData.supplierBusinessType;
    ws.getCell(startRow + 4, 6).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 4, 7).value = '종목';
    ws.getCell(startRow + 4, 7).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(startRow + 4, 8, startRow + 4, 10);
    ws.getCell(startRow + 4, 8).value = invoiceData.supplierBusinessItem;
    ws.getCell(startRow + 4, 8).alignment = { horizontal: 'center', vertical: 'middle' };

    applyOuterThinBorder(ws, startRow + 1, startRow + 4, 1, 10);

    startRow += 5;

    ws.mergeCells(startRow, 1, startRow, 3);
    ws.getCell(startRow, 1).value = '합계금액';
    ws.getCell(startRow, 1).font = font10Bold;
    ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow, 4, startRow, 10);
    ws.getCell(startRow, 4).value =
      hidePriceFields || invoiceData.totalAmount === 0 ? '' : `${formatNumber(invoiceData.totalAmount)} 원`;
    ws.getCell(startRow, 4).font = font10Bold;
    ws.getCell(startRow, 4).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getRow(startRow).height = 25;
    applyOuterThinBorder(ws, startRow, startRow, 1, 10);

    startRow += 1;

    ws.getCell(startRow, 1).value = '입고일';
    ws.mergeCells(startRow, 2, startRow, 4);
    ws.getCell(startRow, 2).value = '품목';
    ws.getCell(startRow, 5).value = '수량';
    ws.mergeCells(startRow, 6, startRow, 7);
    ws.getCell(startRow, 6).value = '단가';
    ws.getCell(startRow, 8).value = '공급가액';
    ws.getCell(startRow, 9).value = '세액';
    ws.getCell(startRow, 10).value = '비고';

    for (let c = 1; c <= 10; c += 1) {
      const cell = ws.getCell(startRow, c);
      cell.font = font10Bold;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = createThinBorder();
    }
    applyOuterThinBorder(ws, startRow, startRow, 1, 10);
    ws.getRow(startRow).height = 23;
    startRow += 1;

    const itemRowsCount = Math.max(invoiceData.items.length, 1);

    for (let i = 0; i < itemRowsCount; i += 1) {
      const item = invoiceData.items[i];

      if (item) {
        const vatAmount = item.vat ? Math.round((item.supply || 0) * 0.1) : 0;
        ws.getCell(startRow, 1).value = formatMonthDay(item.arriveDate || invoiceData.arriveDate || invoiceData.orderDate || '');
        ws.mergeCells(startRow, 2, startRow, 4);
        ws.getCell(startRow, 2).value = item.name2 || item.name1;
        ws.getCell(startRow, 5).value = item.qty ? Number(item.qty) : '';
        ws.mergeCells(startRow, 6, startRow, 7);
        ws.getCell(startRow, 6).value = hidePriceFields ? '' : item.unitPrice !== 0 ? Number(item.unitPrice) : '';
        ws.getCell(startRow, 8).value = hidePriceFields ? '' : item.supply !== 0 ? Number(item.supply) : '';
        ws.getCell(startRow, 9).value = hidePriceFields ? '' : vatAmount !== 0 ? vatAmount : '';
        ws.getCell(startRow, 10).value = item.invoiceNote || '';
      } else {
        ws.mergeCells(startRow, 2, startRow, 4);
        ws.mergeCells(startRow, 6, startRow, 7);
      }

      for (let c = 1; c <= 10; c += 1) {
        const cell = ws.getCell(startRow, c);
        cell.font = font10;
        cell.border = createThinBorder();
      }

      ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(startRow, 2).alignment = { horizontal: 'left', vertical: 'middle' };
      ws.getCell(startRow, 5).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(startRow, 5).numFmt = '#,##0';
      ws.getCell(startRow, 6).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(startRow, 6).numFmt = '#,##0';
      ws.getCell(startRow, 8).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(startRow, 8).numFmt = '#,##0';
      ws.getCell(startRow, 9).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(startRow, 9).numFmt = '#,##0';
      ws.getCell(startRow, 10).alignment = { horizontal: 'left', vertical: 'middle' };

      applyOuterThinBorder(ws, startRow, startRow, 1, 10);
      ws.getRow(startRow).height = 23;
      startRow += 1;
    }

    ws.mergeCells(startRow, 1, startRow, 4);
    ws.getCell(startRow, 1).value = '합계';
    ws.getCell(startRow, 1).font = font10Bold;
    ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow, 5).value = '';
    ws.mergeCells(startRow, 6, startRow, 7);
    ws.getCell(startRow, 8).value =
      hidePriceFields || invoiceData.totalSupply === 0 ? '' : invoiceData.totalSupply;
    ws.getCell(startRow, 9).value =
      hidePriceFields || invoiceData.totalVat === 0 ? '' : invoiceData.totalVat;

    for (let c = 1; c <= 10; c += 1) {
      ws.getCell(startRow, c).border = createThinBorder();
    }
    ws.getCell(startRow, 5).font = font10Bold;
    ws.getCell(startRow, 5).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(startRow, 5).numFmt = '#,##0';
    ws.getCell(startRow, 8).font = font10Bold;
    ws.getCell(startRow, 8).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(startRow, 8).numFmt = '#,##0';
    ws.getCell(startRow, 9).font = font10Bold;
    ws.getCell(startRow, 9).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(startRow, 9).numFmt = '#,##0';
    applyOuterThinBorder(ws, startRow, startRow, 1, 10);
    ws.getRow(startRow).height = 27;

    startRow += 1;

    ws.mergeCells(startRow, 1, startRow, 4);
    ws.getCell(startRow, 1).value = '총 합 계';
    ws.getCell(startRow, 1).font = font10Bold;
    ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow, 5).value =
      hidePriceFields || invoiceData.totalAmount === 0 ? '' : invoiceData.totalAmount;
    ws.getCell(startRow, 5).font = font10Bold;
    ws.getCell(startRow, 5).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(startRow, 5).numFmt = '#,##0';
    ws.getCell(startRow, 6).value = '인수자';
    ws.getCell(startRow, 6).font = font10;
    ws.getCell(startRow, 6).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(startRow, 7, startRow, 10);
    ws.getCell(startRow, 7).value = '';

    for (let c = 1; c <= 10; c += 1) {
      ws.getCell(startRow, c).border = createThinBorder();
    }
    applyOuterThinBorder(ws, startRow, startRow, 1, 10);
    ws.getRow(startRow).height = 25;

    startRow += 2;

    let noteText = '';
    if (invoiceData.remark) noteText += `참고사항 : ${invoiceData.remark}\n`;
    noteText += `납품처 : ${invoiceData.client || ''}${invoiceData.deliveryAddr ? ` / ${invoiceData.deliveryAddr}` : ''}\n`;
    if (invoiceData.manager || invoiceData.managerTel) {
      noteText += `담당자 : ${invoiceData.manager || ''}${invoiceData.managerTel ? ` / ${invoiceData.managerTel}` : ''}\n`;
    }
    if (invoiceData.requestNote) noteText += `요청사항 : ${invoiceData.requestNote || ''}`;

    const boldFont = { name: '맑은 고딕', size: 11, bold: true } as const;
    const normalFont = { name: '맑은 고딕', size: 11 } as const;

    const richTexts: ExcelJS.RichText[] = [];
    if (invoiceData.remark) {
      richTexts.push({ text: '참고사항', font: boldFont });
      richTexts.push({ text: ` : ${invoiceData.remark}\n`, font: normalFont });
    }
    richTexts.push({
      text: `납품처 : ${invoiceData.client || ''}${invoiceData.deliveryAddr ? ` / ${invoiceData.deliveryAddr}` : ''}\n`,
      font: boldFont,
    });
    if (invoiceData.manager || invoiceData.managerTel) {
      richTexts.push({ text: '담당자', font: boldFont });
      richTexts.push({
        text: ` : ${invoiceData.manager || ''}${invoiceData.managerTel ? ` / ${invoiceData.managerTel}` : ''}\n`,
        font: normalFont,
      });
    }
    if (invoiceData.requestNote) {
      richTexts.push({ text: '요청사항', font: boldFont });
      richTexts.push({ text: ` : ${invoiceData.requestNote || ''}`, font: normalFont });
    }

    ws.mergeCells(startRow, 1, startRow, 10);
    const noteCell = ws.getCell(startRow, 1);
    noteCell.value = { richText: richTexts };
    noteCell.alignment = { vertical: 'top', wrapText: true };
    ws.getRow(startRow).height = Math.max(22, estimateWrappedLineCount(noteText) * 20 + 10);
    startRow += 1;

    ws.mergeCells(startRow, 1, startRow, 10);
    const issueCell = ws.getCell(startRow, 1);
    issueCell.value = `발급 No. ${invoiceData.issueNo}`;
    issueCell.font = { name: '맑은 고딕', size: 11 };
    issueCell.alignment = { vertical: 'middle' };
    ws.getRow(startRow).height = 22;

    return startRow + 2;
  };

  let nextRow = 1;
  const padRowsUntil = (targetRow: number) => {
    while (nextRow < targetRow) {
      ws.getRow(nextRow).height = SECOND_COPY_SPACER_ROW_HEIGHT;
      nextRow += 1;
    }
  };

  const groupedDocs = splitInvoiceDataByArriveDate(data);

  groupedDocs.forEach((group, index) => {
    nextRow = drawInvoicePart(group, nextRow, '(공급자용)');

    padRowsUntil(FOLD_LINE_ROW);

    ws.mergeCells(nextRow, 1, nextRow, 10);
    ws.getCell(nextRow, 1).border = {
      bottom: { style: 'dashed', color: { argb: 'FFAAAAAA' } },
    };
    ws.getRow(nextRow).height = 10;
    nextRow += 2;

    padRowsUntil(SECOND_COPY_START_ROW);

    nextRow = drawInvoicePart(group, nextRow, '(공급받는자용)');

    if (index < groupedDocs.length - 1) {
      nextRow += 2;
      ws.getRow(nextRow).addPageBreak();
      nextRow += 1;
    }
  });

  return wb;
}

export async function exportInvoiceToExcel(
  data: InvoiceData,
  options: InvoiceExcelExportOptions = {},
) {
  const groupedDocs = splitInvoiceDataByArriveDate(data);

  for (const group of groupedDocs) {
    const wb = createInvoiceWorkbook(group, options);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, buildInvoiceFileName(group));
  }
}
