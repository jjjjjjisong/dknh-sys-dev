import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface InvoiceItem {
  name1: string;
  name2: string;
  qty: number;
  unitPrice: number;
  supply: number;
  vat: boolean;
  itemNote: string;
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

export async function exportInvoiceToExcel(data: InvoiceData) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('거래명세서', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      margins: {
        left: 0.3, right: 0.3,
        top: 0.25, bottom: 0.25,
        header: 0, footer: 0
      },
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1
    }
  });

  // We have 7 columns: Date, Item Name, Qty, Unit Price, Supply, VAT, Note
  // Let's divide the width to match the print preview roughly.
  // Col A: Date, B: Item Name, C: Qty, D: Unit Price, E: Supply, F: VAT, G: Note
  // Since seller table needs more granularity, we can use 9 columns and merge them for the item table.
  // Actually, building a 14-column grid (A to N) gives us max flexibility.
  // Let's stick to 7 columns for simplicity, adjusting widths.
  // Col 1: Date (12)
  // Col 2: Item Name (28)
  // Col 3: Qty (8)
  // Col 4: Unit Price (12)
  // Col 5: Supply (14)
  // Col 6: VAT (10)
  // Col 7: Note (16)
  ws.columns = [
    { width: 10 }, // 1: Date
    { width: 24 }, // 2: Item Name part 1
    { width: 6 },  // 3: Item Name part 2 / "귀하"
    { width: 4 },  // 4: Item Name part 3 / "공\n급\n자"
    { width: 11 }, // 5: Qty / Seller label
    { width: 18 }, // 6: Unit Price part 1 / BizNo/Name
    { width: 5 },  // 7: Unit Price part 2 / "성명"/"종목"
    { width: 11 }, // 8: Supply / Owner/Address/BusinessItem part 1
    { width: 7 },  // 9: VAT / ... part 2
    { width: 15 }  // 10: Note / ... part 3
  ];

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };
  const mediumBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium' },
    left: { style: 'medium' },
    bottom: { style: 'medium' },
    right: { style: 'medium' }
  };

  const drawInvoicePart = (startRow: number, suffix: string) => {
    // Row 1: Title
    ws.mergeCells(startRow, 1, startRow, 10);
    const titleCell = ws.getCell(startRow, 1);
    titleCell.value = `거 래 명 세 서 ${suffix}`;
    titleCell.font = { name: '맑은 고딕', size: 18, bold: true };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(startRow).height = 40;

    // Head table (Rows startRow+1 to startRow+4)
    for (let r = startRow + 1; r <= startRow + 4; r++) {
      for (let c = 1; c <= 10; c++) {
        const cell = ws.getCell(r, c);
        cell.border = thinBorder;
        cell.font = { name: '맑은 고딕', size: 10 };
        cell.alignment = { vertical: 'middle' };
      }
      ws.getRow(r).height = 35;
    }

    const issueDateFmt = data.arriveDate || data.orderDate ? formatKoreanDate(data.arriveDate || data.orderDate || '') : '미입력';

    // Buyer side (Col 1-3)
    ws.mergeCells(startRow + 1, 1, startRow + 1, 3);
    ws.getCell(startRow + 1, 1).value = issueDateFmt;
    ws.getCell(startRow + 1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow + 2, 1, startRow + 2, 2);
    ws.getCell(startRow + 2, 1).value = data.client || '';
    ws.getCell(startRow + 2, 1).font = { name: '맑은 고딕', size: 12, bold: true };
    ws.getCell(startRow + 2, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 2, 3).value = '귀하';
    ws.getCell(startRow + 2, 3).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow + 3, 1, startRow + 3, 3);
    ws.getCell(startRow + 3, 1).value = '아래와 같이 계산합니다.';
    ws.getCell(startRow + 3, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(startRow + 4, 1, startRow + 4, 3);
    ws.getCell(startRow + 4, 1).value = `( ₩ ${formatNumber(data.totalAmount)} ) VAT 포함`;
    ws.getCell(startRow + 4, 1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Seller side (Col 4-10)
    ws.mergeCells(startRow + 1, 4, startRow + 4, 4);
    ws.getCell(startRow + 1, 4).value = '공\n급\n자';
    ws.getCell(startRow + 1, 4).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Registration No
    ws.getCell(startRow + 1, 5).value = '등록\n번호';
    ws.getCell(startRow + 1, 5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.mergeCells(startRow + 1, 6, startRow + 1, 10);
    ws.getCell(startRow + 1, 6).value = data.supplierBizNo;
    ws.getCell(startRow + 1, 6).font = { name: '맑은 고딕', size: 11, bold: true };
    ws.getCell(startRow + 1, 6).alignment = { horizontal: 'center', vertical: 'middle' };

    // Name & Owner
    ws.getCell(startRow + 2, 5).value = '상호';
    ws.getCell(startRow + 2, 5).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 2, 6).value = data.supplierName;
    ws.getCell(startRow + 2, 6).font = { name: '맑은 고딕', size: 11, bold: true };
    ws.getCell(startRow + 2, 6).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 2, 7).value = '성명';
    ws.getCell(startRow + 2, 7).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(startRow + 2, 8, startRow + 2, 10);
    ws.getCell(startRow + 2, 8).value = data.supplierOwner;
    ws.getCell(startRow + 2, 8).alignment = { horizontal: 'center', vertical: 'middle' };

    // Address
    ws.getCell(startRow + 3, 5).value = '사업장\n주소';
    ws.getCell(startRow + 3, 5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.mergeCells(startRow + 3, 6, startRow + 3, 10);
    ws.getCell(startRow + 3, 6).value = data.supplierAddress;
    ws.getCell(startRow + 3, 6).alignment = { horizontal: 'center', vertical: 'middle' };

    // Business type & item
    ws.getCell(startRow + 4, 5).value = '업태';
    ws.getCell(startRow + 4, 5).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 4, 6).value = data.supplierBusinessType;
    ws.getCell(startRow + 4, 6).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow + 4, 7).value = '종목';
    ws.getCell(startRow + 4, 7).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(startRow + 4, 8, startRow + 4, 10);
    ws.getCell(startRow + 4, 8).value = data.supplierBusinessItem;
    ws.getCell(startRow + 4, 8).alignment = { horizontal: 'center', vertical: 'middle' };

    // Thick border around the head table
    for (let c = 1; c <= 10; c++) {
      ws.getCell(startRow + 1, c).border = { ...ws.getCell(startRow + 1, c).border, top: { style: 'medium' } };
      ws.getCell(startRow + 4, c).border = { ...ws.getCell(startRow + 4, c).border, bottom: { style: 'medium' } };
    }
    for (let r = startRow + 1; r <= startRow + 4; r++) {
      ws.getCell(r, 1).border = { ...ws.getCell(r, 1).border, left: { style: 'medium' } };
      ws.getCell(r, 10).border = { ...ws.getCell(r, 10).border, right: { style: 'medium' } };
    }

    // Space
    startRow += 5;

    // Total row
    ws.mergeCells(startRow, 1, startRow, 3);
    ws.getCell(startRow, 1).value = '합계금액';
    ws.getCell(startRow, 1).font = { name: '맑은 고딕', size: 10, bold: true };
    ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow, 1).border = mediumBorder;

    ws.mergeCells(startRow, 4, startRow, 10);
    ws.getCell(startRow, 4).value = `${formatNumber(data.totalAmount)} 원`;
    ws.getCell(startRow, 4).font = { name: '맑은 고딕', size: 10, bold: true };
    ws.getCell(startRow, 4).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(startRow, 4).border = mediumBorder;
    ws.getCell(startRow, 10).border = { ...ws.getCell(startRow, 10).border, right: { style: 'medium' } };
    ws.getRow(startRow).height = 25;
    
    startRow += 1;

    // Items table Header
    ws.getCell(startRow, 1).value = '입고일';
    ws.mergeCells(startRow, 2, startRow, 4);
    ws.getCell(startRow, 2).value = '품목';
    ws.getCell(startRow, 5).value = '수량';
    ws.mergeCells(startRow, 6, startRow, 7);
    ws.getCell(startRow, 6).value = '단가';
    ws.getCell(startRow, 8).value = '공급가액';
    ws.getCell(startRow, 9).value = '세액';
    ws.getCell(startRow, 10).value = '비고';

    for (let c = 1; c <= 10; c++) {
      const cell = ws.getCell(startRow, c);
      cell.font = { name: '맑은 고딕', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = thinBorder;
      // thick top
      cell.border = { ...cell.border, top: { style: 'medium' } };
    }
    ws.getCell(startRow, 1).border = { ...ws.getCell(startRow, 1).border, left: { style: 'medium' } };
    ws.getCell(startRow, 10).border = { ...ws.getCell(startRow, 10).border, right: { style: 'medium' } };
    ws.getRow(startRow).height = 20;
    startRow += 1;

    // Item rows
    let totalQty = 0;
    const itemRowsCount = Math.max(data.items.length, 10);
    for (let i = 0; i < itemRowsCount; i++) {
      const item = data.items[i];
      if (item) {
        totalQty += item.qty;
        const arrive = formatMonthDay(item.arriveDate || data.arriveDate || data.orderDate || '');
        ws.getCell(startRow, 1).value = arrive;
        ws.mergeCells(startRow, 2, startRow, 4);
        ws.getCell(startRow, 2).value = item.name2 || item.name1;
        ws.getCell(startRow, 5).value = item.qty ? Number(item.qty) : '';
        ws.mergeCells(startRow, 6, startRow, 7);
        ws.getCell(startRow, 6).value = item.unitPrice ? Number(item.unitPrice) : '';
        const vatAmount = item.vat ? Math.round((item.supply || 0) * 0.1) : 0;
        ws.getCell(startRow, 8).value = item.supply ? Number(item.supply) : '';
        ws.getCell(startRow, 9).value = item.vat ? vatAmount : '';
        ws.getCell(startRow, 10).value = item.itemNote || '';
      } else {
        ws.mergeCells(startRow, 2, startRow, 4);
        ws.mergeCells(startRow, 6, startRow, 7);
      }

      for (let c = 1; c <= 10; c++) {
        const cell = ws.getCell(startRow, c);
        cell.font = { name: '맑은 고딕', size: 10 };
        cell.border = thinBorder;
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

      ws.getCell(startRow, 1).border = { ...ws.getCell(startRow, 1).border, left: { style: 'medium' } };
      ws.getCell(startRow, 10).border = { ...ws.getCell(startRow, 10).border, right: { style: 'medium' } };
      ws.getRow(startRow).height = 20;
      startRow += 1;
    }

    // Sum row
    ws.mergeCells(startRow, 1, startRow, 4);
    ws.getCell(startRow, 1).value = '합계';
    ws.getCell(startRow, 1).font = { name: '맑은 고딕', size: 10, bold: true };
    ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow, 5).value = totalQty;
    ws.mergeCells(startRow, 6, startRow, 7);
    ws.getCell(startRow, 8).value = data.totalSupply;
    ws.getCell(startRow, 9).value = data.totalVat;

    for (let c = 1; c <= 10; c++) {
      const cell = ws.getCell(startRow, c);
      cell.border = thinBorder;
    }
    
    ws.getCell(startRow, 5).font = { name: '맑은 고딕', size: 10, bold: true };
    ws.getCell(startRow, 5).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(startRow, 5).numFmt = '#,##0';
    for(let c of [8, 9]) {
      ws.getCell(startRow, c).font = { name: '맑은 고딕', size: 10, bold: true };
      ws.getCell(startRow, c).alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getCell(startRow, c).numFmt = '#,##0';
    }

    ws.getCell(startRow, 1).border = { ...ws.getCell(startRow, 1).border, left: { style: 'medium' } };
    ws.getCell(startRow, 10).border = { ...ws.getCell(startRow, 10).border, right: { style: 'medium' } };
    ws.getRow(startRow).height = 25;
    startRow += 1;

    // Grand sum row
    ws.mergeCells(startRow, 1, startRow, 7);
    ws.getCell(startRow, 1).value = '총 합 계';
    ws.getCell(startRow, 1).font = { name: '맑은 고딕', size: 10, bold: true };
    ws.getCell(startRow, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell(startRow, 8).value = data.totalAmount;
    ws.mergeCells(startRow, 9, startRow, 10);
    ws.getCell(startRow, 9).value = '인수자';

    for (let c = 1; c <= 10; c++) {
      const cell = ws.getCell(startRow, c);
      cell.border = thinBorder;
      // bottom thick border
      cell.border = { ...cell.border, bottom: { style: 'medium' } };
    }
    ws.getCell(startRow, 8).font = { name: '맑은 고딕', size: 10, bold: true };
    ws.getCell(startRow, 8).alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell(startRow, 8).numFmt = '#,##0';
    ws.getCell(startRow, 9).font = { name: '맑은 고딕', size: 10 };
    ws.getCell(startRow, 9).alignment = { horizontal: 'center', vertical: 'middle' };

    ws.getCell(startRow, 1).border = { ...ws.getCell(startRow, 1).border, left: { style: 'medium' } };
    ws.getCell(startRow, 10).border = { ...ws.getCell(startRow, 10).border, right: { style: 'medium' } };
    ws.getRow(startRow).height = 25;
    
    startRow += 2;

    // Note Area
    let noteTxt = '';
    if (data.remark) noteTxt += `참고사항 : ${data.remark}\n`;
    noteTxt += `납품처 : ${data.client || ''}${data.deliveryAddr ? ` / ${data.deliveryAddr}` : ''}\n`;
    if (data.manager || data.managerTel) noteTxt += `담당자 : ${data.manager || ''}${data.managerTel ? ` / ${data.managerTel}` : ''}\n`;
    if (data.requestNote) noteTxt += `요청사항 : ${data.requestNote.replace(/\n/g, ' ')}\n`;
    noteTxt += `\n발급 No. ${data.issueNo}`;

    ws.mergeCells(startRow, 1, startRow + 3, 10);
    const noteCell = ws.getCell(startRow, 1);
    noteCell.value = noteTxt;
    noteCell.font = { name: '맑은 고딕', size: 9 };
    noteCell.alignment = { vertical: 'top', wrapText: true };
    ws.getRow(startRow).height = 20;

    return startRow + 5;
  };

  let nextRow = drawInvoicePart(1, '(공급자용)');
  
  // draw dashed line between the two parts (approximate with a row of dots or borders)
  ws.mergeCells(nextRow, 1, nextRow, 10);
  const dividerRow = ws.getCell(nextRow, 1);
  dividerRow.border = { bottom: { style: 'dashed', color: { argb: 'FFAAAAAA' } } };
  ws.getRow(nextRow).height = 10;
  nextRow += 2;

  drawInvoicePart(nextRow, '(공급받는자용)');

  // Save via file-saver
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `거래명세서_${data.issueNo}.xlsx`);
}
