import { SharedPreviewData } from '../types/documentPreview';

const today = new Date().toISOString().slice(0, 10);

export function buildReleasePreviewHtml(data: SharedPreviewData) {
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
    <div class="doc-title">출 고 의 뢰 서</div>
    <div class="doc-subtitle">수신 <strong>${escapeHtml(data.receiver || '수신처 미입력')}</strong> 귀하&emsp;|&emsp;담당자 ${escapeHtml(data.manager || '-')}&emsp;|&emsp;발급 No. <strong>${escapeHtml(data.issueNo || '-')}</strong></div>
    <table class="doc-tbl">
      <thead>
        <tr>
          <th class="no-col">No</th>
          <th class="date-col">발주일</th>
          <th class="date-col">입고일</th>
          <th class="client-col">납품처</th>
          <th class="name-col">품목명</th>
          <th class="pallet-col">파렛트</th>
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
    </table>
    ${data.requestNote ? `<div class="request-box"><strong>요청사항</strong>${escapeHtml(data.requestNote).replace(/\n/g, '<br>')}</div>` : ''}
    <div class="release-signoff">${escapeHtml(formatKoreanDate(data.orderDate || today))}<br><strong>㈜ 디케이앤에이치</strong></div>
  </div>`;
}

export function buildInvoicePreviewHtml(data: SharedPreviewData) {
  const rows = data.items
    .map((item) => {
      const vatAmount = item.vat ? Math.round(item.supply * 0.1) : 0;

      return `<tr>
        <td class="c date-col">${escapeHtml(formatMonthDay(item.arriveDate || data.arriveDate || ''))}</td>
        <td class="l product-col">${escapeHtml(item.name2 || item.name1)}</td>
        <td class="r qty-col">${escapeHtml(formatNumber(item.qty))}</td>
        <td class="r price-col">${item.unitPrice ? escapeHtml(formatNumber(item.unitPrice)) : ''}</td>
        <td class="r supply-col">${item.supply ? escapeHtml(formatNumber(item.supply)) : ''}</td>
        <td class="r vat-col">${item.vat ? escapeHtml(formatNumber(vatAmount)) : ''}</td>
        <td class="l note-col">${escapeHtml(item.invoiceNote || '')}</td>
      </tr>`;
    })
    .join('');

  const totalQty = data.items.reduce((sum, item) => sum + item.qty, 0);
  const issueDateFmt = data.arriveDate ? formatKoreanDate(data.arriveDate) : formatKoreanDate(today);

  const invoicePiece = (suffix: string) => `<div class="invoice-doc">
    <div class="invoice-title">거 래 명 세 서 <span>${suffix}</span></div>
    <table class="invoice-head-table">
      <tr>
        <td class="buyer-cell">
          <table class="inner-table">
            <tr><td colspan="2" class="c">${escapeHtml(issueDateFmt)}</td></tr>
            <tr><td class="c strong">${escapeHtml(data.client || '')}</td><td class="c narrow">귀하</td></tr>
            <tr><td colspan="2" class="c">아래와 같이 계산합니다.</td></tr>
            <tr><td colspan="2" class="c">( 금 ${escapeHtml(formatNumber(data.totalAmount))} 원 ) VAT 포함</td></tr>
          </table>
        </td>
        <td class="seller-cell">
          <table class="inner-table">
            <tr><td rowspan="4" class="vertical">공<br>급<br>자</td><td class="c label">등록<br>번호</td><td colspan="3" class="c strong">${escapeHtml(data.supplierBizNo)}</td></tr>
            <tr><td class="c label">상호</td><td class="c strong">${escapeHtml(data.supplierName)}</td><td class="c label narrow">성명</td><td class="c">${escapeHtml(data.supplierOwner)}</td></tr>
            <tr><td class="c label">사업장<br>주소</td><td colspan="3" class="c">${escapeHtml(data.supplierAddress)}</td></tr>
            <tr><td class="c label">업태</td><td class="c">${escapeHtml(data.supplierBusinessType)}</td><td class="c label narrow">종목</td><td class="c">${escapeHtml(data.supplierBusinessItem)}</td></tr>
          </table>
        </td>
      </tr>
    </table>
    <table class="invoice-total-table">
      <tr><td class="label-cell">합계금액</td><td class="value-cell">${escapeHtml(formatNumber(data.totalAmount))} 원</td></tr>
    </table>
    <table class="invoice-items-table">
      <thead>
        <tr><th class="date-col">입고일</th><th class="product-col">품목명</th><th class="qty-col">수량</th><th class="price-col">단가</th><th class="supply-col">공급가액</th><th class="vat-col">세액</th><th class="note-col">비고</th></tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="sum-row"><td colspan="2" class="c">합계</td><td class="r">${escapeHtml(formatNumber(totalQty))}</td><td></td><td class="r">${escapeHtml(formatNumber(data.totalSupply))}</td><td class="r">${escapeHtml(formatNumber(data.totalVat))}</td><td></td></tr>
        <tr class="grand-row"><td colspan="4" class="c">총 금 액</td><td class="r">${escapeHtml(formatNumber(data.totalAmount))}</td><td class="c">인수자</td><td></td></tr>
      </tbody>
    </table>
    <div class="invoice-note-area">
      ${data.remark ? `<div><strong>참고사항 :</strong> ${escapeHtml(data.remark)}</div>` : ''}
      <div><strong>납품처 :</strong> ${escapeHtml(data.client || '')}${data.deliveryAddr ? ` / ${escapeHtml(data.deliveryAddr)}` : ''}</div>
      ${data.manager || data.managerTel ? `<div><strong>담당자 :</strong> ${escapeHtml(data.manager || '')}${data.managerTel ? ` / ${escapeHtml(data.managerTel)}` : ''}</div>` : ''}
      ${data.requestNote ? `<div><strong>요청사항 :</strong> ${escapeHtml(data.requestNote).replace(/\n/g, ' ')}</div>` : ''}
      <div class="issue-line">발급 No. ${escapeHtml(data.issueNo)}</div>
    </div>
  </div>`;

  return `<div class="invoice-page">${invoicePiece('(공급자용)')}<div class="invoice-break"></div>${invoicePiece('(공급받는자용)')}</div>`;
}

export function getReleasePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.release-doc{width:${printMode ? '100%' : '297mm'};margin:${printMode ? '0' : '0 auto'};background:#fff;padding:${printMode ? '0' : '10mm 12mm'};box-sizing:border-box}.release-approval-row{display:flex;justify-content:flex-end;margin-bottom:6px}.approval-grid{display:flex;width:360px}.approval-group{display:flex;flex:1;border:1px solid #999}.approval-group+.approval-group{margin-left:-1px;border-left:2px solid #333}.approval-cell{flex:1;text-align:center;border-right:1px solid #999}.approval-cell:last-child{border-right:none}.approval-hd{background:#f0f0f0;font-weight:600;font-size:9.5pt;padding:4px;border-bottom:1px solid #999}.approval-body{height:34px}.doc-title{font-size:22pt;font-weight:900;letter-spacing:.2em;margin-bottom:16px;text-align:left}.doc-subtitle{font-size:12pt;margin-bottom:8px;text-align:left}.doc-tbl,.doc-info-tbl{width:100%;border-collapse:collapse;table-layout:fixed}.doc-tbl{font-size:12pt;margin-bottom:8px}.doc-tbl tbody td{font-size:11pt}.doc-tbl th,.doc-tbl td{border:1px solid #000;padding:5px 7px;vertical-align:middle}.doc-tbl th{background:#f7f7f7;font-weight:700}.doc-tbl .c{text-align:center}.doc-tbl .l{text-align:left}.doc-tbl .sum-row{background:#f0f0f0;font-weight:700}.doc-tbl .sum-row td{font-size:12pt}.doc-tbl .no-col{width:44px}.doc-tbl .date-col{width:76px}.doc-tbl .client-col{width:170px}.doc-tbl .name-col{width:auto}.doc-tbl .pallet-col,.doc-tbl .box-col{width:64px}.doc-tbl .qty-col{width:72px}.doc-tbl .note-col{width:130px}.doc-info-tbl{font-size:12pt;margin-bottom:6px}.doc-info-tbl td{border:1px solid #bdbdbd;padding:3px 6px}.doc-info-tbl .lbl{width:140px;background:#f7f7f7;font-weight:700}.request-box{border:1px solid #ccc;border-radius:4px;padding:6px 10px;margin-top:6px;font-size:10pt;line-height:1.5}.request-box strong{display:block;margin-bottom:2px;font-size:8.5pt}.release-signoff{text-align:right;margin-top:24px;font-size:10pt;line-height:2}.release-signoff strong{font-size:13pt;letter-spacing:.1em}@media print{@page{size:A4 landscape;margin:10mm 12mm}body{background:#fff}.release-doc{width:100%;margin:0;padding:0}}`;
}

export function getInvoicePreviewStyles(printMode: boolean) {
  return `body{margin:0;background:${printMode ? '#fff' : '#f3f4f6'};font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;color:#111}.invoice-page{width:${printMode ? '100%' : '210mm'};margin:${printMode ? '0' : '0 auto'};background:#fff;padding:${printMode ? '0' : '6mm 8mm'};box-sizing:border-box}.invoice-doc{page-break-inside:avoid;break-inside:avoid}.invoice-break{border-top:1px dashed #aaa;margin:10px 0;padding-top:10px}.invoice-title{text-align:center;font-size:12pt;font-weight:900;margin-bottom:6px;letter-spacing:.1em}.invoice-title span{font-size:9pt;font-weight:400}.invoice-head-table,.invoice-total-table,.invoice-items-table,.inner-table{width:100%;border-collapse:collapse}.invoice-head-table{border:2px solid #000;margin-bottom:0}.invoice-head-table td{vertical-align:middle;padding:0}.buyer-cell{width:40%;border-right:1px solid #000}.seller-cell{width:60%}.inner-table td{border-bottom:1px solid #000;border-right:1px solid #000;padding:2px 3px;font-size:9pt;vertical-align:middle}.inner-table tr:last-child td{border-bottom:0}.inner-table td:last-child{border-right:0}.inner-table .narrow{width:28px}.inner-table .label{width:48px}.inner-table .strong{font-weight:700}.inner-table .vertical{width:20px;text-align:center;line-height:1.4;vertical-align:middle}.inner-table .c{text-align:center}.invoice-total-table{border:2px solid #000;border-top:0}.invoice-total-table td{padding:4px 8px;font-size:9pt;font-weight:700;vertical-align:middle}.invoice-total-table .label-cell{width:20%;border-right:1px solid #000}.invoice-total-table .value-cell{text-align:right}.invoice-items-table{border:2px solid #000;border-top:0;text-align:center;table-layout:fixed}.invoice-items-table th,.invoice-items-table td{border-right:1px solid #000;border-bottom:1px solid #000;padding:4px 2px;font-size:9pt;vertical-align:middle}.invoice-items-table th:last-child,.invoice-items-table td:last-child{border-right:0}.invoice-items-table tbody tr:last-child td{border-bottom:0}.invoice-items-table .l{text-align:left}.invoice-items-table .r{text-align:right}.invoice-items-table .c{text-align:center}.invoice-items-table .sum-row td,.invoice-items-table .grand-row td{font-weight:700}.invoice-items-table .date-col{width:62px}.invoice-items-table .product-col{width:auto}.invoice-items-table .qty-col{width:72px}.invoice-items-table .price-col{width:68px}.invoice-items-table .supply-col{width:92px}.invoice-items-table .vat-col{width:72px}.invoice-items-table .note-col{width:92px}.invoice-note-area{margin-top:6px;font-size:9pt;line-height:1.4;text-align:left;padding:0 3px}.invoice-note-area .issue-line{margin-top:6px;color:#666}@media print{@page{margin:6mm 8mm;size:A4 portrait}body{background:#fff}.invoice-page{width:100%;margin:0;padding:0}.invoice-break{page-break-before:avoid;break-before:avoid}}`;
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
