import { ReactNode } from 'react';
import { SharedPreviewData } from '../../types/documentPreview';
import {
  buildReleasePreviewHtml,
  buildInvoicePreviewHtml,
  getReleasePreviewStyles,
  getInvoicePreviewStyles,
} from '../../utils/documentPreview';

export type PreviewType = 'release' | 'invoice';

type Props = {
  type: PreviewType;
  data: SharedPreviewData;
  onClose: () => void;
  description?: ReactNode;
};

export default function DocumentPreviewModal({ type, data, onClose, description }: Props): JSX.Element {
  const title = type === 'release' ? '출고의뢰서 미리보기' : '거래명세서 미리보기';
  const html = type === 'release' ? buildReleasePreviewHtml(data) : buildInvoicePreviewHtml(data);
  const styles = type === 'release' ? getReleasePreviewStyles(true) : getInvoicePreviewStyles(false);

  function handlePrint() {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    const printHtml = type === 'release' ? buildReleasePreviewHtml(data) : buildInvoicePreviewHtml(data);
    const printStyles = type === 'release' ? getReleasePreviewStyles(true) : getInvoicePreviewStyles(true);

    if (!doc || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      window.alert('인쇄 창을 열지 못했습니다.');
      return;
    }

    doc.open();
    doc.write(
      `<!doctype html><html lang="ko"><head><meta charset="UTF-8" /><title>${title}</title><style>${printStyles}</style></head><body>${printHtml}</body></html>`,
    );
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    };
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card preview-modal-card">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {description}
          </div>
          <div className="button-row">
            <button className="btn btn-secondary" onClick={onClose}>
              닫기
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              인쇄 / PDF 저장
            </button>
          </div>
        </div>
        <div className={`release-preview-wrap in-modal ${type === 'invoice' ? 'invoice-preview-wrap' : ''}`}>
          <style>{styles}</style>
          <div
            className={`release-preview-host ${type === 'release' ? 'release-preview-host-print' : ''} ${type === 'invoice' ? 'invoice-preview-host' : ''}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
