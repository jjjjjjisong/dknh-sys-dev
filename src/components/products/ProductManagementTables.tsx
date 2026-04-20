import React from 'react';
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
    <div className="table-wrap">
      <table className="table master-tree-table">
        <thead>
          <tr>
            <th style={{ width: 44 }}></th>
            <th style={{ width: 80 }}>구분</th>
            <th style={{ width: 260 }}>공통품목명</th>
            <th style={{ width: 260 }}>품목명(거래명세서)</th>
            <th style={{ width: 90, textAlign: 'right' }}>1B=ea</th>
            <th style={{ width: 90, textAlign: 'right' }}>1P=BOX</th>
            <th style={{ width: 90, textAlign: 'right' }}>1P=ea</th>
            <th style={{ width: 100, textAlign: 'right' }}>1대당 팔레트</th>
            <th style={{ width: 90, textAlign: 'center' }}>하위 품목</th>
            <th style={{ width: 150 }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {pagedMasters.map(master => {
            const isExpanded = expandedMasterIds.includes(master.id);
            const children = productsByMasterId.get(master.id) ?? [];
            return (
              <React.Fragment key={master.id}>
                <tr 
                  className={`master-tree-row ${isExpanded ? 'is-expanded' : ''}`} 
                  onClick={() => onToggleMaster(master.id)}
                >
                  <td className="chevron-cell">
                    <span className="tree-chevron">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </span>
                  </td>
                  <td>{master.gubun || '-'}</td>
                  <td className="font-bold">{master.name1 || '-'}</td>
                  <td>{master.name2 || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{master.ea_per_b ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{master.box_per_p ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{master.ea_per_p ?? '-'}</td>
                  <td style={{ textAlign: 'right' }}>{master.pallets_per_truck ?? '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-accent">{master.linkedProductCount}개</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="button-row">
                      <TableActionButton variant="primary" onClick={() => onCreateChild(master.id)}>하위추가</TableActionButton>
                      <TableActionButton onClick={() => onEditMaster(master)}>수정</TableActionButton>
                      <TableActionButton variant="danger" onClick={() => onDeleteMaster(master)}>삭제</TableActionButton>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="master-tree-child-row">
                    <td colSpan={10} className="master-tree-child-cell">
                      {children.length === 0 ? (
                         <div className="empty-state child-empty">연결된 거래처별 품목이 없습니다.</div>
                      ) : (
                        <div className="child-table-wrap">
                          <table className="table child-table">
                            <thead>
                              <tr>
                                <th style={{ width: 160 }}>거래처</th>
                                <th style={{ width: 240 }}>거래처별 품목명</th>
                                <th style={{ width: 240 }}>품목명(거래명세서)</th>
                                <th style={{ width: 140 }}>출고처</th>
                                <th style={{ width: 90, textAlign: 'right' }}>입고단가</th>
                                <th style={{ width: 90, textAlign: 'right' }}>판매단가</th>
                                <th style={{ width: 70, textAlign: 'center' }}>상태</th>
                                <th style={{ width: 70 }}>관리</th>
                              </tr>
                            </thead>
                            <tbody>
                              {children.map(child => (
                                <tr key={child.id} onClick={() => onEditChild(child)} className="history-clickable-row">
                                  <td>
                                    <div className="table-clamp-2" title={child.client || '-'}>{child.client || '-'}</div>
                                  </td>
                                  <td>
                                    <div className="table-clamp-2" title={child.name1 || '-'}>{child.name1 || '-'}</div>
                                  </td>
                                  <td>
                                    <div className="table-clamp-2" title={child.name2 || '-'}>{child.name2 || '-'}</div>
                                  </td>
                                  <td>
                                    <div className="table-clamp-2" title={child.supplier || '-'}>{child.supplier || '-'}</div>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>{child.cost_price ?? '-'}</td>
                                  <td style={{ textAlign: 'right' }}>{child.sell_price ?? '-'}</td>
                                  <td style={{ textAlign: 'center' }}>
                                      <span className={child.delYn === 'Y' ? 'badge badge-muted' : 'badge'}>
                                        {child.delYn === 'Y' ? '비활성' : '사용'}
                                      </span>
                                  </td>
                                  <td onClick={e => e.stopPropagation()}>
                                    <div className="button-row" style={{ justifyContent: 'center' }}>
                                      <TableActionButton variant="danger" onClick={() => onDeleteChild(child)}>삭제</TableActionButton>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
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

// Remove MasterCard component
