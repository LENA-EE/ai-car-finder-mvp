import { SearchBox, SearchHistory, CarResults, useSearch } from "@/features/search";
import { CarModal } from "@/entities/car";

export function SearchPage() {
  const {
    loading,
    loadingMore,
    result,
    error,
    selectedCar,
    history,
    showHistory,
    search,
    loadMore,
    fetchCarDetails,
    setSelectedCar,
    setShowHistory,
    clearHistory,
  } = useSearch();

  return (
    <>
      <SearchBox
        onSearch={search}
        loading={loading}
        onFocus={() => history.length > 0 && setShowHistory(true)}
      />

      {showHistory && history.length > 0 && (
        <SearchHistory
          history={history}
          onSelect={search}
          onClear={clearHistory}
        />
      )}

      {error && <div className="error">{error}</div>}

      <CarResults
        result={result}
        onCarClick={fetchCarDetails}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
      />

      <CarModal car={selectedCar} onClose={() => setSelectedCar(null)} />
    </>
  );
}
