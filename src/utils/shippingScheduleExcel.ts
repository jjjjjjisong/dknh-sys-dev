import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { OrderBookEntry } from '../types/order-book';

const COLUMN_COUNT = 8;
const UNASSIGNED_RECEIVER = '수신처 미지정';

function applyBorder(cell: ExcelJS.Cell, color = 'FF4B5563') {
  const borderColor = { argb: color };
  cell.border = {
    top: { style: 'thin', color: borderColor },
    left: { style: 'thin', color: borderColor },
    bottom: { style: 'thin', color: borderColor },
    right: { style: 'thin', color: borderColor },
  };
}

export async function exportShippingScheduleToExcel(
  entries: OrderBookEntry[],
  date: string,
  dispatches: Record<string, string>,
  notes: Record<string, string>,
  receiverFilter = 'all',
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('출고 일정');

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.25, right: 0.25, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.15 },
  };

  worksheet.columns = [
    { key: 'client', width: 22 },
    { key: 'date', width: 9 },
    { key: 'product', width: 31 },
    { key: 'pallet', width: 10 },
    { key: 'box', width: 10 },
    { key: 'qty', width: 14 },
    { key: 'dispatch', width: 18 },
    { key: 'note', width: 26 },
  ];

  worksheet.mergeCells(1, 1, 1, COLUMN_COUNT);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `${formatKoreanDate(date)} 출고 일정`;
  titleCell.font = { name: 'Malgun Gothic', size: 16, bold: true };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  worksheet.getRow(1).height = 27;
  worksheet.addRow([]);

  const groups = groupByReceiver(entries);
  groups.forEach(([receiver, groupEntries], groupIndex) => {
    const receiverRow = worksheet.addRow([receiver]);
    worksheet.mergeCells(receiverRow.number, 1, receiverRow.number, COLUMN_COUNT);
    receiverRow.height = 25;
    receiverRow.getCell(1).font = {
      name: 'Malgun Gothic',
      size: 12,
      bold: true,
      color: { argb: 'FF1F2937' },
    };
    receiverRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    };
    receiverRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorder(receiverRow.getCell(1), 'FF9CA9BC');

    const headerRow = worksheet.addRow(['거래처', '일자', '품목', '파렛트', 'BOX 수', '수량', '배차', '비고']);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Malgun Gothic', size: 10, bold: true, color: { argb: 'FF111827' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      applyBorder(cell);
    });

    groupEntries.forEach((entry) => {
      const row = worksheet.addRow({
        client: entry.client || '-',
        date: getDay(entry.deadline),
        product: entry.product || '-',
        pallet: entry.pallet ?? '',
        box: entry.box ?? '',
        qty: entry.qty,
        dispatch: dispatches[entry.id] ?? '',
        note: notes[entry.id] ?? '',
      });
      row.height = 22;
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        cell.font = { name: 'Malgun Gothic', size: 10, color: { argb: 'FF111827' } };
        cell.alignment = {
          horizontal: column >= 4 && column <= 6 ? 'right' : column === 2 ? 'center' : 'left',
          vertical: 'middle',
        };
        applyBorder(cell);
      });
      row.getCell(4).numFmt = '#,##0';
      row.getCell(5).numFmt = '#,##0';
      row.getCell(6).numFmt = '#,##0';
    });

    if (groupIndex < groups.length - 1) {
      worksheet.lastRow?.addPageBreak();
      worksheet.addRow([]);
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `출고일정_${date.replace(/-/g, '')}${receiverFilter === 'all' ? '' : `_${sanitizeFileName(receiverFilter)}`}.xlsx`,
  );
}

function groupByReceiver(entries: OrderBookEntry[]) {
  const groups = new Map<string, OrderBookEntry[]>();
  entries.forEach((entry) => {
    const receiver = entry.receiver.trim() || UNASSIGNED_RECEIVER;
    groups.set(receiver, [...(groups.get(receiver) ?? []), entry]);
  });
  return Array.from(groups.entries());
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '_');
}

function formatKoreanDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function getDay(value: string | null) {
  if (!value) return '';
  return Number(value.slice(-2));
}
