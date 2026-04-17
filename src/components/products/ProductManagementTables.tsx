import TableActionButton from '../ui/TableActionButton';
import type { Product, ProductMaster } from '../../types/product';

type MasterProductsTableProps = {
  filteredMasters: ProductMaster[];
  pagedMasters: ProductMaster[];
  currentPage: number;
  pageSize: number;
  expandedMasterIds: string[];
  productsByMasterId: Map<string, Product[]>;
  onToggleMaster: (masterId: string) => void;
  onCreateChild: (masterId: string) => void;
  onEditMaster: (master: ProductMaster) => void;
  onDeleteMaster: (master: ProductMaster) => void;
  onEditChild: (product: Product) => void;
  onDeleteChild: (product: Product) => void;
};

type ProductsTableProps = {
  filteredProducts: Product[];
  pagedProducts: Product[];
  currentPage: number;
  pageSize: number;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
};

type MasterCardProps = {
  master: ProductMaster;
  index: number;
  childrenRows: Product[];
  expanded: boolean;
  onToggle: () => void;
  onCreateChild: () => void;
  onEditMaster: () => void;
  onDeleteMaster: () => void;
  onEditChild: (product: Product) => void;
  onDeleteChild: (product: Product) => void;
};

export function MasterProductsTable({
  filteredMasters,
  pagedMasters,
  currentPage,
  pageSize,
  expandedMasterIds,
  productsByMasterId,
  onToggleMaster,
  onCreateChild,
  onEditMaster,
  onDeleteMaster,
  onEditChild,
  onDeleteChild,
}: MasterProductsTableProps) {
  if (filteredMasters.length === 0) {
    return <div className="empty-state">검색 결과가 없습니다.</div>;
  }

  return (
    <div className="master-card-list">
      {pagedMasters.map((master, index) => {
        const children = productsByMasterId.get(master.id) ?? [];
        const expanded = expandedMasterIds.includes(master.id);

        return (
          <MasterCard
            key={master.id}
            master={master}
            index={(currentPage - 1) * pageSize + index + 1}
            childrenRows={children}
            expanded={expanded}
            onToggle={() => onToggleMaster(master.id)}
            onCreateChild={() => onCreateChild(master.id)}
            onEditMaster={() => onEditMaster(master)}
            onDeleteMaster={() => onDeleteMaster(master)}
            onEditChild={onEditChild}
            onDeleteChild={onDeleteChild}
          />
        );
      })}
    </div>
  );
}

export function ProductsTable({
  filteredProducts,
  pagedProducts,
  onEditProduct,
  onDeleteProduct,
}: ProductsTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 56 }}>No</th>
            <th style={{ width: 90 }}>구분</th>
            <th style={{ width: 180 }}>거래처</th>
            <th style={{ width: 270 }}>품목명</th>
            <th style={{ width: 270 }}>품목명(거래명세서)</th>
            <th style={{ width: 140 }}>출고처</th>
            <th style={{ width: 110, textAlign: 'right' }}>입고 단가</th>
            <th style={{ width: 110, textAlign: 'right' }}>판매 단가</th>
            <th style={{ width: 90, textAlign: 'right' }}>1B=ea</th>
            <th style={{ width: 90, textAlign: 'right' }}>1P=BOX</th>
            <th style={{ width: 96 }}>상태</th>
            <th style={{ width: 72 }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length === 0 ? (
            <tr>
              <td colSpan={12} className="table-empty">
                검색 결과가 없습니다.
              </td>
            </tr>
          ) : (
            pagedProducts.map((product) => (
              <tr
                key={product.id}
                className="history-clickable-row"
                onClick={() => onEditProduct(product)}
              >
                <td>{product.no ?? '-'}</td>
                <td>
                  <div className="table-clamp-2" title={product.gubun || '-'}>
                    {product.gubun || '-'}
                  </div>
                </td>
                <td>
                  <div className="table-clamp-2" title={product.client || '-'}>
                    {product.client || '-'}
                  </div>
                </td>
                <td>
                  <div className="table-clamp-2" title={product.name1 || '-'}>
                    {product.name1 || '-'}
                  </div>
                </td>
                <td>
                  <div className="table-clamp-2" title={product.name2 || '-'}>
                    {product.name2 || '-'}
                  </div>
                </td>
                <td>
                  <div className="table-clamp-2" title={product.supplier || '-'}>
                    {product.supplier || '-'}
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>{product.cost_price ?? '-'}</td>
                <td style={{ textAlign: 'right' }}>{product.sell_price ?? '-'}</td>
                <td style={{ textAlign: 'right' }}>{product.ea_per_b ?? '-'}</td>
                <td style={{ textAlign: 'right' }}>{product.box_per_p ?? '-'}</td>
                <td>
                  <span className={product.delYn === 'Y' ? 'badge badge-muted' : 'badge'}>
                    {product.delYn === 'Y' ? '비활성' : '사용중'}
                  </span>
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <div className="button-row">
                    <TableActionButton variant="danger" onClick={() => onDeleteProduct(product)}>
                      삭제
                    </TableActionButton>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function MasterCard({
  master,
  index,
  childrenRows,
  expanded,
  onToggle,
  onCreateChild,
  onEditMaster,
  onDeleteMaster,
  onEditChild,
  onDeleteChild,
}: MasterCardProps) {
  return (
    <section className={`master-card${expanded ? ' is-expanded' : ''}`}>
      <button type="button" className="master-card-main" onClick={onToggle}>
        <div className="master-card-lead">
          <span className="master-card-index">{index}</span>
          <span className="master-card-gubun">{master.gubun || '-'}</span>
        </div>

        <div className="master-card-body">
          <div className="master-card-title-row">
            <h3 className="master-card-title">{master.name1 || '-'}</h3>
            <span className="master-card-chevron" aria-hidden="true">
              {expanded ? '▾' : '▸'}
            </span>
          </div>
          <p className="master-card-subtitle">거래명세서명 {master.name2 || '-'}</p>
          <div className="master-card-metrics">
            <span className="master-card-metric">1B=ea {master.ea_per_b ?? '-'}</span>
            <span className="master-card-metric">1P=BOX {master.box_per_p ?? '-'}</span>
            <span className="master-card-metric">1P=ea {master.ea_per_p ?? '-'}</span>
            <span className="master-card-metric">1대당 팔레트 {master.pallets_per_truck ?? '-'}</span>
            <span className="master-card-metric is-accent">연결 {master.linkedProductCount}개</span>
          </div>
        </div>
      </button>

      <div className="master-card-actions">
        <TableActionButton variant="primary" onClick={onCreateChild}>
          하위 추가
        </TableActionButton>
        <TableActionButton onClick={onEditMaster}>수정</TableActionButton>
        <TableActionButton variant="danger" onClick={onDeleteMaster}>
          삭제
        </TableActionButton>
      </div>

      {expanded ? (
        <div className="master-card-children">
          {childrenRows.length === 0 ? (
            <div className="empty-state" style={{ margin: 0 }}>
              연결된 거래처별 품목이 없습니다.
            </div>
          ) : (
            <>
              <div className="master-child-head">
                <span>거래처</span>
                <span>품목명</span>
                <span>거래명세서명</span>
                <span>출고처</span>
                <span style={{ textAlign: 'right' }}>1B=ea</span>
                <span style={{ textAlign: 'right' }}>1P=BOX</span>
                <span style={{ textAlign: 'right' }}>관리</span>
              </div>
              <div className="master-child-list">
                {childrenRows.map((product) => (
                  <div
                    key={product.id}
                    className="master-child-row"
                    onClick={() => onEditChild(product)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onEditChild(product);
                      }
                    }}
                  >
                    <span className="master-child-cell">{product.client || '-'}</span>
                    <span className="master-child-cell">
                      <strong>{product.name1 || '-'}</strong>
                      <em>{product.gubun || '-'}</em>
                    </span>
                    <span className="master-child-cell">{product.name2 || '-'}</span>
                    <span className="master-child-cell">{product.supplier || '-'}</span>
                    <span className="master-child-cell is-number">{product.ea_per_b ?? '-'}</span>
                    <span className="master-child-cell is-number">{product.box_per_p ?? '-'}</span>
                    <span
                      className="master-child-cell master-child-actions"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <TableActionButton variant="danger" onClick={() => onDeleteChild(product)}>
                        삭제
                      </TableActionButton>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
