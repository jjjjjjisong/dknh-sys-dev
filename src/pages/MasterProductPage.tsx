import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import {
  ProductItemModal,
  ProductMasterModal,
} from '../components/products/ProductManagementModals';
import PriceChangePanel from '../components/products/PriceChangePanel';
import {
  MasterProductsTable,
  ProductsTable,
} from '../components/products/ProductManagementTables';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { GUBUN_CHOICES, PRODUCT_PAGE_SIZE } from '../features/products/constants';
import { formatNullableNumber, parseNullableNumber } from '../features/products/forms';
import { useMasterProductPage } from '../hooks/useMasterProductPage';
import type { Product, ProductMaster } from '../types/product';

export default function MasterProductPage() {
  const {
    activeRows,
    activeTab,
    clientDropdownOpen,
    clientFilter,
    clientOptions,
    clientSearchBoxRef,
    clients,
    currentPage,
    editingMaster,
    editingProduct,
    error,
    expandedMasterIds,
    filteredFormClientOptions,
    filteredMasters,
    filteredProducts,
    handleClientSelect,
    handleDeleteMaster,
    handleDeleteProduct,
    handleDownloadExcel,
    handleMasterSubmit,
    handleProductSubmit,
    handleSaveProductPrices,
    handleApplyPriceChange,
    handlePreviewPriceChange,
    removeSelectedPriceChangeRow,
    toggleAllPriceChangePreviewRows,
    togglePriceChangePreviewRow,
    linkedProductsForEditingMaster,
    loading,
    masterForm,
    masterFormError,
    masterModalOpen,
    pagedRows,
    productForm,
    productFormError,
    productMasters,
    productModalOpen,
    productPriceDrafts,
    priceChangeApplying,
    priceChangeForm,
    priceChangeLoadingPreview,
    priceChangeLogs,
    priceChangePreviewRows,
    priceChangeSearched,
    selectedPriceChangeItemIds,
    products,
    productsByMasterId,
    query,
    saving,
    savingPriceProductId,
    setActiveTab,
    setClientDropdownOpen,
    setClientFilter,
    setCurrentPage,
    setQuery,
    applyProductMasterDefaults,
    closeMasterModal,
    closeProductModal,
    openCreateMasterModal,
    openCreateProductModal,
    openEditMasterModal,
    openEditProductModal,
    toggleMasterAccordion,
    updateMasterForm,
    updatePriceChangeForm,
    updateProductPriceDraft,
    updateProductForm,
  } = useMasterProductPage();

  return (
    <div className="page-content">
      <PageHeader title="품목 관리" description="" />

      {error ? <Alert>{error}</Alert> : null}

      <section className="card">
        <div className="product-tab-list">
          <button
            type="button"
            className={`product-tab-btn${activeTab === 'masters' ? ' active' : ''}`}
            onClick={() => setActiveTab('masters')}
          >
            공통 품목
          </button>
          <button
            type="button"
            className={`product-tab-btn${activeTab === 'products' ? ' active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            납품처별 품목
          </button>
          <button
            type="button"
            className={`product-tab-btn${activeTab === 'price-change' ? ' active' : ''}`}
            onClick={() => setActiveTab('price-change')}
          >
            단가 수정
          </button>
        </div>

        {activeTab !== 'price-change' ? (
          <div className="client-toolbar-stacked">
          <div className="toolbar toolbar-grid product-toolbar">
            {activeTab === 'products' ? (
              <select
                className="search-input"
                value={clientFilter}
                onChange={(event) => setClientFilter(event.target.value)}
              >
                <option value="">전체 납품처</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </select>
            ) : (
              <div />
            )}

            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                activeTab === 'masters'
                  ? '공통 품목명(출고의뢰서), 거래명세서명, 구분으로 검색하세요.'
                  : '공통 품목명(출고의뢰서), 납품처, 수신처, 납품처별 품목명(출고의뢰서)으로 검색하세요.'
              }
            />
          </div>

          <div className="client-toolbar-actions product-toolbar-actions">
            <div className="toolbar-meta">검색 결과 {activeRows.length}건</div>
            <div className="button-row">
              <Button
                type="button"
                variant="secondary"
                className="excel-download-button"
                onClick={handleDownloadExcel}
              >
                엑셀다운
              </Button>
              <Button
                type="button"
                variant="primary"
                style={activeTab === 'masters' ? undefined : { display: 'none' }}
                onClick={openCreateMasterModal}
              >
                {activeTab === 'masters' ? '공통 품목 추가' : '납품처별 품목 추가'}
              </Button>
            </div>
          </div>
          </div>
        ) : null}

        {loading ? (
          <div className="empty-state">품목 목록을 불러오는 중입니다...</div>
        ) : activeTab === 'masters' ? (
          <MasterProductsTable
            filteredMasters={filteredMasters}
            pagedMasters={pagedRows as ProductMaster[]}
            currentPage={currentPage}
            pageSize={PRODUCT_PAGE_SIZE}
            expandedMasterIds={expandedMasterIds}
            productsByMasterId={productsByMasterId}
            onToggleMaster={toggleMasterAccordion}
            onCreateChild={openCreateProductModal}
            onEditMaster={openEditMasterModal}
            onDeleteMaster={(master) => void handleDeleteMaster(master)}
            onEditChild={openEditProductModal}
            onDeleteChild={(product) => void handleDeleteProduct(product)}
          />
        ) : activeTab === 'products' ? (
          <ProductsTable
            filteredProducts={filteredProducts}
            pagedProducts={pagedRows as Product[]}
            currentPage={currentPage}
            pageSize={PRODUCT_PAGE_SIZE}
            productPriceDrafts={productPriceDrafts}
            savingPriceProductId={savingPriceProductId}
            onUpdateProductPriceDraft={updateProductPriceDraft}
            onSaveProductPrices={(product) => void handleSaveProductPrices(product)}
            onEditProduct={openEditProductModal}
            onDeleteProduct={(product) => void handleDeleteProduct(product)}
          />
        ) : (
          <PriceChangePanel
            clients={clients}
            products={products}
            form={priceChangeForm}
            previewRows={priceChangePreviewRows}
            selectedItemIds={selectedPriceChangeItemIds}
            searched={priceChangeSearched}
            logs={priceChangeLogs}
            loadingPreview={priceChangeLoadingPreview}
            applying={priceChangeApplying}
            onUpdateForm={updatePriceChangeForm}
            onPreview={() => void handlePreviewPriceChange()}
            onTogglePreviewRow={togglePriceChangePreviewRow}
            onToggleAllPreviewRows={toggleAllPriceChangePreviewRows}
            onRemoveSelectedRow={removeSelectedPriceChangeRow}
            onApply={() => void handleApplyPriceChange()}
          />
        )}

        {activeTab !== 'price-change' ? (
          <Pagination
            currentPage={currentPage}
            totalItems={activeRows.length}
            pageSize={PRODUCT_PAGE_SIZE}
            onPageChange={setCurrentPage}
          />
        ) : null}
      </section>

      <ProductMasterModal
        open={masterModalOpen}
        editingMaster={editingMaster}
        masterForm={masterForm}
        masterFormError={masterFormError}
        saving={saving}
        linkedProductsCount={linkedProductsForEditingMaster.length}
        gubunChoices={GUBUN_CHOICES as unknown as string[]}
        onClose={closeMasterModal}
        onSubmit={handleMasterSubmit}
        onUpdateForm={updateMasterForm}
        formatNullableNumber={formatNullableNumber}
        parseNullableNumber={parseNullableNumber}
      />

      <ProductItemModal
        open={productModalOpen}
        editingProduct={editingProduct}
        productForm={productForm}
        productFormError={productFormError}
        saving={saving}
        showPricingFields={false}
        productMasters={productMasters}
        clients={clients}
        filteredFormClientOptions={filteredFormClientOptions}
        clientDropdownOpen={clientDropdownOpen}
        clientSearchBoxRef={clientSearchBoxRef}
        onClose={closeProductModal}
        onSubmit={handleProductSubmit}
        onUpdateForm={updateProductForm}
        onApplyMasterDefaults={applyProductMasterDefaults}
        onHandleClientSelect={handleClientSelect}
        onSetClientDropdownOpen={setClientDropdownOpen}
        formatNullableNumber={formatNullableNumber}
        parseNullableNumber={parseNullableNumber}
      />
    </div>
  );
}
