import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { OrderBookEntry } from '../types/order-book';

const COLUMN_COUNT = 7;
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
  dateFrom: string,
  dateTo: string,
  dispatches: Record<string, string>,
  notes: Record<string, string>,
) {
  const workbook = new ExcelJS.Workbook();
  const usedSheetNames = new Set<string>();

  groupByReceiver(entries).forEach(([receiver, receiverEntries]) => {
    const worksheet = workbook.addWorksheet(createSheetName(receiver, usedSheetNames));
    worksheet.pageSetup = {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.15, right: 0.15, top: 0.3, bottom: 0.3, header: 0.1, footer: 0.1 },
    };
    worksheet.columns = [
      { key: 'client', width: 25 },
      { key: 'product', width: 34 },
      { key: 'pallet', width: 7 },
      { key: 'box', width: 8 },
      { key: 'qty', width: 11 },
      { key: 'dispatch', width: 18 },
      { key: 'note', width: 27 },
    ];

    worksheet.mergeCells(1, 1, 1, COLUMN_COUNT);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `${formatDateRange(dateFrom, dateTo)} 출고 일정`;
    titleCell.font = { name: 'Malgun Gothic', size: 17, bold: true };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getRow(1).height = 27;
    worksheet.addRow([]);

    const receiverRow = worksheet.addRow([receiver]);
    worksheet.mergeCells(receiverRow.number, 1, receiverRow.number, COLUMN_COUNT);
    receiverRow.height = 27;
    receiverRow.getCell(1).font = { name: 'Malgun Gothic', size: 14, bold: true, color: { argb: 'FF1F2937' } };
    receiverRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    receiverRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    applyBorder(receiverRow.getCell(1), 'FF9CA9BC');

    groupByDate(receiverEntries).forEach(([date, dateEntries], dateIndex) => {
      if (dateIndex > 0) worksheet.addRow([]);

      const dateRow = worksheet.addRow([formatDateHeading(date)]);
      worksheet.mergeCells(dateRow.number, 1, dateRow.number, COLUMN_COUNT);
      dateRow.height = 27;
      dateRow.getCell(1).font = { name: 'Malgun Gothic', size: 13, bold: true, color: { argb: 'FF1F2937' } };
      dateRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F5F8' } };
      dateRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      applyBorder(dateRow.getCell(1), 'FF9CA9BC');

      const headerRow = worksheet.addRow(['거래처', '품목', '파렛트', 'BOX 수', '수량', '배차', '비고']);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: 'Malgun Gothic', size: 12, bold: true, color: { argb: 'FF111827' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(cell);
      });

      dateEntries.forEach((entry) => {
        const row = worksheet.addRow({
          client: entry.client || '-',
          product: entry.product || '-',
          pallet: entry.pallet ?? '',
          box: entry.box ?? '',
          qty: entry.qty,
          dispatch: dispatches[entry.id] ?? entry.releaseNote,
          note: notes[entry.id] ?? '',
        });
        row.height = 26;
        row.eachCell({ includeEmpty: true }, (cell, column) => {
          cell.font = { name: 'Malgun Gothic', size: 12, color: { argb: 'FF111827' } };
          cell.alignment = {
            horizontal: column >= 3 && column <= 5 ? 'right' : 'left',
            vertical: 'middle',
          };
          applyBorder(cell);
        });
        row.getCell(3).numFmt = '#,##0';
        row.getCell(4).numFmt = '#,##0';
        row.getCell(5).numFmt = '#,##0';
      });
    });

    worksheet.pageSetup.printArea = `A1:G${worksheet.lastRow?.number ?? 1}`;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `출고일정_${dateFrom.replace(/-/g, '')}_${dateTo.replace(/-/g, '')}.xlsx`,
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

function groupByDate(entries: OrderBookEntry[]) {
  const groups = new Map<string, OrderBookEntry[]>();
  entries.forEach((entry) => {
    const date = entry.deadline ?? '날짜 미지정';
    groups.set(date, [...(groups.get(date) ?? []), entry]);
  });
  return Array.from(groups.entries());
}

function createSheetName(receiver: string, usedSheetNames: Set<string>) {
  const base = receiver.replace(/[\\/?*:[\]]/g, '_').slice(0, 31) || '수신처';
  let name = base;
  let suffix = 2;
  while (usedSheetNames.has(name)) {
    const marker = `_${suffix}`;
    name = `${base.slice(0, 31 - marker.length)}${marker}`;
    suffix += 1;
  }
  usedSheetNames.add(name);
  return name;
}

function formatDateRange(dateFrom: string, dateTo: string) {
  if (dateFrom === dateTo) return formatKoreanDate(dateFrom);
  return `${formatKoreanDate(dateFrom)} ~ ${formatKoreanDate(dateTo)}`;
}

function formatKoreanDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function formatDateHeading(value: string) {
  if (value === '날짜 미지정') return value;
  const [, month, day] = value.split('-').map(Number);
  return `${month}월 ${day}일`;
}
