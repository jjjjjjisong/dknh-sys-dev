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
  productPriceDrafts: Record<string, { cost_price: string; sell_price: string }>;
  savingPriceProductId: string | null;
  onUpdateProductPriceDraft: (
    productId: string,
    field: 'cost_price' | 'sell_price',
    value: string,
  ) => void;
  onSaveProductPrices: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
};

function formatDisplayNumber(value: number | null) {
  return value === null ? '-' : value.toLocaleString('ko-KR');
}

export function MasterProductsTable({
  filteredMasters,
  pagedMasters,
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
            <th style={{ width: 44 }} />
            <th style={{ width: 80 }}>구분</th>
            <th style={{ width: 260 }}>품목명(출고의뢰서)</th>
            <th style={{ width: 260 }}>품목명(거래명세서)</th>
            <th style={{ width: 110, textAlign: 'right' }}>1B=EA</th>
            <th style={{ width: 120, textAlign: 'right' }}>1P=BOX</th>
            <th style={{ width: 120, textAlign: 'right' }}>1P=EA</th>
            <th style={{ width: 110, textAlign: 'right' }}>1대당 파레트</th>
            <th style={{ width: 90, textAlign: 'center' }}>하위 품목</th>
            <th style={{ width: 150 }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {pagedMasters.map((master) => {
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
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </span>
                  </td>
                  <td>{master.gubun || '-'}</td>
                  <td className="font-bold">{master.name1 || '-'}</td>
                  <td>{master.name2 || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{formatDisplayNumber(master.ea_per_b)}</td>
                  <td style={{ textAlign: 'right' }}>{formatDisplayNumber(master.box_per_p)}</td>
                  <td style={{ textAlign: 'right' }}>{formatDisplayNumber(master.ea_per_p)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {formatDisplayNumber(master.pallets_per_truck)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-accent">
                      {master.linkedProductCount.toLocaleString('ko-KR')}개
                    </span>
                  </td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <div className="button-row">
                      <TableActionButton variant="primary" onClick={() => onCreateChild(master.id)}>
                        하위추가
                      </TableActionButton>
                      <TableActionButton onClick={() => onEditMaster(master)}>수정</TableActionButton>
                      <TableActionButton variant="danger" onClick={() => onDeleteMaster(master)}>
                        삭제
                      </TableActionButton>
                    </div>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="master-tree-child-row">
                    <td colSpan={10} className="master-tree-child-cell">
                      {children.length === 0 ? (
                        <div className="empty-state child-empty">
                          연결된 납품처별 품목이 없습니다.
                        </div>
                      ) : (
                        <div className="child-table-wrap">
                          <table className="table child-table">
                            <colgroup>
                              <col style={{ width: 260 }} />
                              <col style={{ width: 260 }} />
                              <col style={{ width: 160 }} />
                              <col style={{ width: 140 }} />
                              <col style={{ width: 90 }} />
                              <col style={{ width: 90 }} />
                              <col style={{ width: 70 }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th style={{ width: 260 }}>품목명(출고의뢰서)</th>
                                <th style={{ width: 260 }}>품목명(거래명세서)</th>
                                <th style={{ width: 160 }}>납품처</th>
                                <th style={{ width: 140 }}>수신처</th>
                                <th style={{ width: 90, textAlign: 'right' }}>입고단가</th>
                                <th style={{ width: 90, textAlign: 'right' }}>판매단가</th>
                                <th style={{ width: 70, textAlign: 'center' }}>관리</th>
                              </tr>
                            </thead>
                            <tbody>
                              {children.map((child) => (
                                <tr
                                  key={child.id}
                                  onClick={() => onEditChild(child)}
                                  className="history-clickable-row"
                                >
                                  <td>
                                    <div className="table-clamp-2" title={child.name1 || '-'}>
                                      {child.name1 || '-'}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="table-clamp-2" title={child.name2 || '-'}>
                                      {child.name2 || '-'}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="table-clamp-2" title={child.client || '-'}>
                                      {child.client || '-'}
                                    </div>
                                  </td>
                                  <td>
                                    <div className="table-clamp-2" title={child.receiver || '-'}>
                                      {child.receiver || '-'}
                                    </div>
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {formatDisplayNumber(child.cost_price)}
                                  </td>
                                  <td style={{ textAlign: 'right' }}>
                                    {formatDisplayNumber(child.sell_price)}
                                  </td>
                                  <td onClick={(event) => event.stopPropagation()}>
                                    <div className="button-row" style={{ justifyContent: 'center' }}>
                                      <TableActionButton
                                        variant="danger"
                                        onClick={() => onDeleteChild(child)}
                                      >
                                        삭제
                                      </TableActionButton>
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
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ProductsTable({
  filteredProducts,
  pagedProducts,
  productPriceDrafts,
  savingPriceProductId,
  onUpdateProductPriceDraft,
  onSaveProductPrices,
  onEditProduct,
}: ProductsTableProps) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 56 }}>No</th>
            <th style={{ width: 90 }}>구분</th>
            <th style={{ width: 180 }}>납품처</th>
            <th style={{ width: 270 }}>품목명(출고의뢰서)</th>
            <th style={{ width: 270 }}>품목명(거래명세서)</th>
            <th style={{ width: 140 }}>수신처</th>
            <th style={{ width: 110, textAlign: 'right' }}>입고단가</th>
            <th style={{ width: 110, textAlign: 'right' }}>판매단가</th>
            <th style={{ width: 90, textAlign: 'right' }}>1B=EA</th>
            <th style={{ width: 90, textAlign: 'right' }}>1P=BOX</th>
            <th style={{ width: 90, textAlign: 'right' }}>1P=EA</th>
            <th style={{ width: 110, textAlign: 'right' }}>1대당 파레트</th>
            <th style={{ width: 120 }}>관리</th>
          </tr>
        </thead>
        <tbody>
          {filteredProducts.length === 0 ? (
            <tr>
              <td colSpan={13} className="table-empty">
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
                  <div className="table-clamp-2" title={product.receiver || '-'}>
                    {product.receiver || '-'}
                  </div>
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <input
                    className="table-inline-input"
                    value={productPriceDrafts[product.id]?.cost_price ?? ''}
                    onChange={(event) =>
                      onUpdateProductPriceDraft(product.id, 'cost_price', event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onSaveProductPrices(product);
                      }
                    }}
                    inputMode="decimal"
                    placeholder="입고단가"
                  />
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <input
                    className="table-inline-input"
                    value={productPriceDrafts[product.id]?.sell_price ?? ''}
                    onChange={(event) =>
                      onUpdateProductPriceDraft(product.id, 'sell_price', event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onSaveProductPrices(product);
                      }
                    }}
                    inputMode="decimal"
                    placeholder="판매단가"
                  />
                </td>
                <td style={{ textAlign: 'right' }}>{formatDisplayNumber(product.ea_per_b)}</td>
                <td style={{ textAlign: 'right' }}>{formatDisplayNumber(product.box_per_p)}</td>
                <td style={{ textAlign: 'right' }}>{formatDisplayNumber(product.ea_per_p)}</td>
                <td style={{ textAlign: 'right' }}>
                  {formatDisplayNumber(product.pallets_per_truck)}
                </td>
                <td onClick={(event) => event.stopPropagation()}>
                  <div className="button-row">
                    <TableActionButton
                      variant="primary"
                      onClick={() => onSaveProductPrices(product)}
                      disabled={savingPriceProductId === product.id}
                    >
                      {savingPriceProductId === product.id ? '저장중...' : '저장'}
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
