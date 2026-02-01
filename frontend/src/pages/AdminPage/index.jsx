import { StatsGrid, TopBrands, AgentsStatus, useAnalytics } from "@/features/analytics";

export function AdminPage() {
  const { analytics, loading, refresh } = useAnalytics();

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      <StatsGrid analytics={analytics} />
      <AgentsStatus agents={analytics?.agents} />
      <TopBrands brands={analytics?.top_brands} />
      <button className="refresh-btn" onClick={refresh}>
        Обновить
      </button>
    </div>
  );
}
