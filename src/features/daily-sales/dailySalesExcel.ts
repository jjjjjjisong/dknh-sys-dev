import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  formatYearMonthLabel,
  getMonthlyQty,
  getWeightedCostPrice,
  getWeightedSellPrice,
} from './dailySalesRows';
import type { DailySalesRow, DailySalesSummary } from './types';

export async function exportDailySalesToExcel(params: {
  yearMonth: string;
  rows: DailySalesRow[];
  days: number[];
  dailyQtyTotals: number[];
  summary: DailySalesSummary;
  noteDrafts: Record<string, string>;
}) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('일일판매', {
    views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }],
  });
  const excelFontName = '맑은 고딕';
  const headers = [
    '납품처',
    '품목명',
    '수신처',
    '총수량',
    '입고단가',
    '입고금액',
    '출고단가',
    '출고금액',
    '비고란',
    '전월이월분',
    ...params.days.map((day) => `${day}일`),
  ];

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
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
    { width: 24 },
    { width: 44 },
    { width: 16 },
    { width: 11 },
    { width: 12 },
    { width: 15 },
    { width: 12 },
    { width: 15 },
    { width: 20 },
    { width: 12 },
    ...params.days.map(() => ({ width: 9 })),
  ];

  worksheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = `${formatYearMonthLabel(params.yearMonth)} 일일판매 현황`;
  titleCell.font = { name: excelFontName, size: 18, bold: true, color: { argb: 'FF111827' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 30;

  const rangeCell = worksheet.getCell(2, 1);
  rangeCell.value = getDateRangeLabel(params.yearMonth);
  rangeCell.font = { name: excelFontName, size: 10, color: { argb: 'FF475569' } };
  rangeCell.alignment = { horizontal: 'left', vertical: 'middle' };

  const headerRow = worksheet.getRow(3);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: excelFontName, size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = createSolidFill('FFE7EEF8');
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyCellBorder(cell, 'FF8FA3BA');
  });

  let currentRow = 4;
  params.rows.forEach((row) => {
    const monthlyQty = getMonthlyQty(row);
    const excelRow = worksheet.getRow(currentRow);
    excelRow.values = [
      row.clientName,
      row.productName,
      row.receiver,
      monthlyQty,
      getWeightedCostPrice(row),
      row.costAmount,
      getWeightedSellPrice(row),
      row.sellAmount,
      params.noteDrafts[row.key] ?? row.note,
      row.carryoverQty,
      ...row.dailyQty,
    ];
    excelRow.height = 22;
    styleBodyRow(excelRow, excelFontName);
    currentRow += 1;
  });

  const totalRow = worksheet.getRow(currentRow);
  totalRow.values = [
    '합계',
    '',
    '',
    params.summary.monthlyQty,
    '',
    params.summary.costAmount,
    '',
    params.summary.sellAmount,
    '',
    '',
    ...params.dailyQtyTotals,
  ];
  totalRow.height = 24;
  totalRow.eachCell((cell, colNumber) => {
    cell.font = { name: excelFontName, size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = createSolidFill('FFDCEBFF');
    cell.alignment = {
      horizontal: colNumber >= 4 ? 'right' : 'center',
      vertical: 'middle',
    };
    applyCellBorder(cell, 'FF6B85A3');
  });

  applyNumberFormats(worksheet, currentRow, headers.length);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `일일판매_${params.yearMonth.replace('-', '')}.xlsx`);
}

function styleBodyRow(row: ExcelJS.Row, fontName: string) {
  row.eachCell((cell, colNumber) => {
    cell.font = { name: fontName, size: 10, color: { argb: 'FF111827' } };
    cell.alignment = {
      horizontal: colNumber >= 4 ? 'right' : 'left',
      vertical: 'middle',
    };
    applyCellBorder(cell, 'FFAEBBCA');
  });
}

function applyNumberFormats(worksheet: ExcelJS.Worksheet, lastRow: number, lastCol: number) {
  for (let rowNumber = 4; rowNumber <= lastRow; rowNumber += 1) {
    for (let colNumber = 4; colNumber <= lastCol; colNumber += 1) {
      const cell = worksheet.getRow(rowNumber).getCell(colNumber);
      if (cell.value === 0) cell.value = null;
      cell.numFmt = getNumberFormatByColumn(colNumber);
    }
  }
}

function getNumberFormatByColumn(colNumber: number) {
  if (colNumber === 5 || colNumber === 7) return '#,##0.0#';
  return '#,##0';
}

function getDateRangeLabel(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}.${String(month).padStart(2, '0')}.01~${year}.${String(month).padStart(2, '0')}.${lastDay}`;
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
