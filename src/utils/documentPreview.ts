import { SharedPreviewData } from '../types/documentPreview';
import { getLocalDateInputValue } from './formatters';
import { splitInvoiceDataByArriveDate } from './invoiceGrouping';

type InvoicePreviewOptions = {
  showPrice?: boolean;
};

export function buildReleasePreviewHtml(data: SharedPreviewData) {
  const today = getLocalDateInputValue();
  const rows = data.items
    .map((item) => {
      const palletValue = item.pallet !== null ? String(item.pallet) : '-';
      const boxValue = item.box !== null ? String(item.box) : '-';

      return `<tr>
        <td class="c">${escapeHtml(String(item.seq))}</td>
        <td class="c date-col">${escapeHtml(formatShortDate(item.orderDate || data.orderDate || ''))}</td>
        <td class="c date-col">${escapeHtml(formatShortDate(item.arriveDate || data.arriveDate || data.orderDate || ''))}</td>
        <td class="l client-col">${escapeHtml(data.client)}</td>
        <td class="l name-col">${escapeHtml(item.name1)}</td>
        <td class="c pallet-col">${escapeHtml(palletValue)}</td>
        <td class="c box-col">${escapeHtml(boxValue)}</td>
        <td class="c qty-col">${escapeHtml(formatNumber(item.qty))}</td>
        <td class="l note-col">${escapeHtml(item.releaseNote || '')}</td>
      </tr>`;
    })
    .join('');

  const totalPallet = data.items.reduce((sum, item) => sum + (item.pallet ?? 0), 0);
  const totalBox = data.items.reduce((sum, item) => sum + (item.box ?? 0), 0);
  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0);

  return `<div class="doc release-doc">
    <div class="release-approval-row">
      <div class="approval-grid">
        <div class="approval-group">
          <div class="approval-cell"><div class="approval-hd">과장</div><div class="approval-body"></div></div>
          <div class="approval-cell"><div class="approval-hd">부장</div><div class="approval-body"></div></div>
        </div>
        <div class="approval-group">
          <div class="approval-cell"><div class="approval-hd">상무</div><div class="approval-body"></div></div>
          <div class="approval-cell"><div class="approval-hd">대표</div><div class="approval-body"></div></div>
        </div>
      </div>
    </div>
    <div class="doc-title">출고의뢰서</div>
    <div class="doc-subtitle">수신 <strong>${escapeHtml(data.receiver || '수신처 미입력')}</strong> 귀하 &emsp;|&emsp;담당자 ${escapeHtml(data.manager || '-')}&emsp;|&emsp;발급 No. <strong>${escapeHtml(data.issueNo || '-')}</strong></div>
    <table class="doc-tbl">
      <thead>
        <tr>
          <th class="no-col">No</th>
          <th class="date-col">발주일</th>
          <th class="date-col">입고일</th>
          <th class="client-col">납품처</th>
          <th class="name-col">품목명</th>
          <th class="pallet-col">파레트</th>
          <th class="box-col">BOX</th>
          <th class="qty-col">수량</th>
          <th class="note-col">비고</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="sum-row">
          <td class="c" colspan="5">합계</td>
          <td class="c">${escapeHtml(String(totalPallet))}</td>
          <td class="c">${escapeHtml(String(totalBox))}</td>
          <td class="c">${escapeHtml(formatNumber(totalQty))}</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <table class="doc-info-tbl">
      ${
        data.manager || data.managerTel
          ? `<tr><td class="lbl">납품처 담당자</td><td>${escapeHtml(data.manager || '')}${data.managerTel ? `&emsp;(${escapeHtml(data.managerTel)})` : ''}</td></tr>`
          : ''
      }
      ${data.deliveryAddr ? `<tr><td class="lbl">납품처 주소</td><td>${escapeHtml(data.deliveryAddr)}</td></tr>` : ''}
      ${data.remark ? `<tr><td class="lbl">비고</td><td>${escapeHtml(data.remark)}</td></tr>` : ''}
      ${data.requestNote ? `<tr><td class="lbl">요청사항</td><td>${escapeHtml(data.requestNote).replace(/\n/g, '<br>')}</td></tr>` : ''}
    </table>
    <div class="release-signoff">${escapeHtml(formatKoreanDate(today))}<br><strong>(주)디케이앤에이치</strong></div>
  </div>`;
}

export function buildInvoicePreviewHtml(
  data: SharedPreviewData,
  { showPrice = true }: InvoicePreviewOptions = {},
) {
  const today = getLocalDateInputValue();
  const groupedDocs = splitInvoiceDataByArriveDate(data);

  const invoicePiece = (group: SharedPreviewData, suffix: string) => {
    const rows = group.items
      .map((item) => {
        const vatAmount = showPrice && item.vat ? Math.round(item.supply * 0.1) : 0;
        const unitPriceDisplay =
          showPrice && item.unitPrice !== 0 ? escapeHtml(formatNumber(item.unitPrice)) : '';
        const supplyDisplay =
          showPrice && item.supply !== 0 ? escapeHtml(formatNumber(item.supply)) : '';
        const vatDisplay = showPrice && vatAmount !== 0 ? escapeHtml(formatNumber(vatAmount)) : '';

        return `<tr>
          <td class="c date-col">${escapeHtml(formatMonthDay(item.arriveDate || group.arriveDate || ''))}</td>
          <td class="l product-col">${escapeHtml(item.name2 || item.name1)}</td>
          <td class="r qty-col">${escapeHtml(formatNumber(item.qty))}</td>
          <td class="r price-col">${unitPriceDisplay}</td>
          <td class="r supply-col">${supplyDisplay}</td>
          <td class="r vat-col">${vatDisplay}</td>
          <td class="l note-col">${escapeHtml(item.invoiceNote || '')}</td>
        </tr>`;
      })
      .join('');

    const totalSupplyDisplay =
      showPrice && group.totalSupply !== 0 ? escapeHtml(formatNumber(group.totalSupply)) : '';
    const totalVatDisplay =
      showPrice && group.totalVat !== 0 ? escapeHtml(formatNumber(group.totalVat)) : '';
    const totalAmountDisplay =
      showPrice && group.totalAmount !== 0 ? escapeHtml(formatNumber(group.totalAmount)) : '';
    const amountText =
      showPrice && group.totalAmount !== 0 ? escapeHtml(formatNumber(group.totalAmount)) : '';
    const issueDateFmt = group.arriveDate ? formatKoreanDate(group.arriveDate) : formatKoreanDate(today);

    return `<div class="invoice-doc">
      <div class="invoice-title">거래명세표<span>${suffix}</span></div>
      <table class="invoice-head-table">
        <tr>
          <td class="buyer-cell">
            <table class="inner-table">
              <tr><td colspan="2" class="c">${escapeHtml(issueDateFmt)}</td></tr>
              <tr><td class="c strong">${escapeHtml(group.client || '')}</td><td class="c narrow">귀하</td></tr>
              <tr><td colspan="2" class="c">아래와 같이 계산합니다.</td></tr>
              <tr><td colspan="2" class="c">( 금${amountText} 원) VAT 포함</td></tr>
            </table>
          </td>
          <td class="seller-cell">
            <table class="inner-table">
              <tr><td rowspan="4" class="vertical">공<br>급<br>자</td><td class="c label">등록<br>번호</td><td colspan="3" class="c strong">${escapeHtml(group.supplierBizNo)}</td></tr>
              <tr><td class="c label">상호</td><td class="c strong">${escapeHtml(group.supplierName)}</td><td class="c label narrow">성명</td><td class="c">${escapeHtml(group.supplierOwner)}</td></tr>
              <tr><td class="c label">사업장<br>주소</td><td colspan="3" class="c">${escapeHtml(group.supplierAddress)}</td></tr>
              <tr><td class="c label">업태</td><td class="c">${escapeHtml(group.supplierBusinessType)}</td><td class="c label narrow">종목</td><td class="c">${escapeHtml(group.supplierBusinessItem)}</td></tr>
            </table>
          </td>
        </tr>
      </table>
      <table class="invoice-total-table">
        <tr><td class="label-cell">합계금액</td><td class="value-cell">${totalAmountDisplay ? `${totalAmountDisplay} 원` : ''}</td></tr>
      </table>
      <table class="invoice-items-table">
        <thead>
          <tr><th class="date-col">입고일</th><th class="product-col">품목명</th><th class="qty-col">수량</th><th class="price-col">단가</th><th class="supply-col">공급가액</th><th class="vat-col">세액</th><th class="note-col">비고</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="sum-row"><td colspan="2" class="c">합계</td><td class="r"></td><td></td><td class="r">${totalSupplyDisplay}</td><td class="r">${totalVatDisplay}</td><td></td></tr>
          <tr class="grand-row"><td colspan="4" class="c">총 금액</td><td class="r">${totalAmountDisplay}</td><td class="c">인수자</td><td></td></tr>
        </tbody>
      </table>
      <div class="invoice-note-area">
        ${group.remark ? `<div><strong>참고사항 :</strong> ${escapeHtml(group.remark)}</div>` : ''}
        <div><strong>납품처:</strong> ${escapeHtml(group.client || '')}${group.deliveryAddr ? ` / ${escapeHtml(group.deliveryAddr)}` : ''}</div>
        ${group.manager || group.managerTel ? `<div><strong>담당자:</strong> ${escapeHtml(group.manager || '')}${group.managerTel ? ` / ${escapeHtml(group.managerTel)}` : ''}</div>` : ''}
        ${group.requestNote ? `<div><strong>요청사항 :</strong> ${escapeHtml(group.requestNote).replace(/\n/g, ' ')}</div>` : ''}
        <div class="issue-line">발급 No. ${escapeHtml(group.issueNo)}</div>
      </div>
    </div>`;
  };

  return groupedDocs
    .map(
      (group, index) => `<div class="invoice-page">
        <div class="invoice-half invoice-half-top">
          ${invoicePiece(group, '(공급자용)')}
        </div>
        <div class="invoice-half invoice-half-bottom">
          <div class="invoice-break"></div>
          ${invoicePiece(group, '(공급받는자용)')}
        </div>
      </div>${index < groupedDocs.length - 1 ? '<div class="invoice-group-break"></div>' : ''}`,
    )
    .join('');
}

export function getReleasePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.release-doc{width:${printMode ? '100%' : '297mm'};margin:${printMode ? '0' : '0 auto'};background:#fff;padding:${printMode ? '0' : '10mm 12mm'};box-sizing:border-box}.release-approval-row{display:flex;justify-content:flex-end;margin-bottom:6px}.approval-grid{display:flex;width:360px}.approval-group{display:flex;flex:1;border:1px solid #999}.approval-group+.approval-group{margin-left:-1px;border-left:2px solid #333}.approval-cell{flex:1;text-align:center;border-right:1px solid #999}.approval-cell:last-child{border-right:none}.approval-hd{background:#f0f0f0;font-weight:600;font-size:9.5pt;padding:4px;border-bottom:1px solid #999}.approval-body{height:34px}.doc-title{font-size:22pt;font-weight:900;letter-spacing:.2em;margin-bottom:16px;text-align:left}.doc-subtitle{font-size:12pt;margin-bottom:8px;text-align:left}.doc-tbl,.doc-info-tbl{width:100%;border-collapse:collapse;table-layout:fixed}.doc-tbl{font-size:12pt;margin-bottom:8px}.doc-tbl tbody td{font-size:11pt}.doc-tbl th,.doc-tbl td{border:1px solid #000;padding:5px 7px;vertical-align:middle}.doc-tbl th{background:#f7f7f7;font-weight:700}.doc-tbl .c{text-align:center}.doc-tbl .l{text-align:left}.doc-tbl .sum-row{background:#f0f0f0;font-weight:700}.doc-tbl .sum-row td{font-size:12pt}.doc-tbl .no-col{width:44px}.doc-tbl .date-col{width:76px}.doc-tbl .client-col{width:170px}.doc-tbl .name-col{width:auto}.doc-tbl .pallet-col,.doc-tbl .box-col{width:64px}.doc-tbl .qty-col{width:72px}.doc-tbl .note-col{width:130px}.doc-info-tbl{font-size:12pt;margin-bottom:6px}.doc-info-tbl td{border:1px solid #bdbdbd;padding:3px 6px}.doc-info-tbl .lbl{width:140px;background:#f7f7f7;font-weight:700}.request-box{border:1px solid #ccc;border-radius:4px;padding:6px 10px;margin-top:6px;font-size:10pt;line-height:1.5}.request-box strong{display:block;margin-bottom:2px;font-size:8.5pt}.release-signoff{text-align:right;margin-top:24px;font-size:10pt;line-height:2}.release-signoff strong{font-size:13pt;letter-spacing:.1em}@media print{@page{size:A4 landscape;margin:10mm 12mm}body{background:#fff}.release-doc{width:100%;margin:0;padding:0}}`;
}

export function getInvoicePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.invoice-page{width:210mm;height:297mm;margin:${printMode ? '0' : '0 auto'};background:#fff;box-sizing:border-box;display:flex;flex-direction:column}.invoice-half{height:148.5mm;box-sizing:border-box;padding:6mm 8mm;overflow:hidden}.invoice-half-bottom{border-top:1px dashed #aaa}.invoice-doc{page-break-inside:avoid;break-inside:avoid}.invoice-break{height:10px}.invoice-group-break{height:${printMode ? '0' : '16px'}}.invoice-title{text-align:center;font-size:12pt;font-weight:900;margin-bottom:6px;letter-spacing:.1em}.invoice-title span{font-size:9pt;font-weight:400}.invoice-head-table,.invoice-total-table,.invoice-items-table,.inner-table{width:100%;border-collapse:collapse}.invoice-head-table{border:2px solid #000;margin-bottom:0}.invoice-head-table td{vertical-align:middle;padding:0}.buyer-cell{width:40%;border-right:1px solid #000}.seller-cell{width:60%}.inner-table td{border-bottom:1px solid #000;border-right:1px solid #000;padding:2px 3px;font-size:9pt;vertical-align:middle}.inner-table tr:last-child td{border-bottom:0}.inner-table td:last-child{border-right:0}.inner-table .narrow{width:28px}.inner-table .label{width:48px}.inner-table .strong{font-weight:700}.inner-table .vertical{width:20px;text-align:center;line-height:1.4;vertical-align:middle}.inner-table .c{text-align:center}.invoice-total-table{border:2px solid #000;border-top:0}.invoice-total-table td{padding:4px 8px;font-size:9pt;font-weight:700;vertical-align:middle}.invoice-total-table .label-cell{width:20%;border-right:1px solid #000}.invoice-total-table .value-cell{text-align:right}.invoice-items-table{border:2px solid #000;border-top:0;text-align:center;table-layout:fixed}.invoice-items-table th,.invoice-items-table td{border-right:1px solid #000;border-bottom:1px solid #000;padding:4px 2px;font-size:9pt;vertical-align:middle}.invoice-items-table th:last-child,.invoice-items-table td:last-child{border-right:0}.invoice-items-table tbody tr:last-child td{border-bottom:0}.invoice-items-table .l{text-align:left}.invoice-items-table .r{text-align:right}.invoice-items-table .c{text-align:center}.invoice-items-table .sum-row td,.invoice-items-table .grand-row td{font-weight:700}.invoice-items-table .date-col{width:62px}.invoice-items-table .product-col{width:auto}.invoice-items-table .qty-col{width:72px}.invoice-items-table .price-col{width:68px}.invoice-items-table .supply-col{width:92px}.invoice-items-table .vat-col{width:72px}.invoice-items-table .note-col{width:92px}.invoice-note-area{margin-top:6px;font-size:9pt;line-height:1.4;text-align:left;padding:0 3px}.invoice-note-area .issue-line{margin-top:6px;color:#666}@media print{@page{margin:0;size:A4 portrait}body{background:#fff}.invoice-page{margin:0}.invoice-group-break{page-break-after:always;break-after:page}}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export function formatShortDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year.slice(2)}.${month}.${day}`;
}

export function formatMonthDay(value: string) {
  if (!value) return '';
  const [, month, day] = value.split('-');
  return `${month}/${day}`;
}

export function formatKoreanDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${year} 년 ${parseInt(month, 10)} 월 ${parseInt(day, 10)} 일`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
