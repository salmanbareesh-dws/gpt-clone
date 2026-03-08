import type { Stats } from "../types";

type StatsGridProps = {
  stats: Stats;
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-value">{stats.total}</div>
        <div className="stat-label">Total Users</div>
      </div>
      <div className="stat-card pending">
        <div className="stat-value">{stats.pending}</div>
        <div className="stat-label">Pending</div>
      </div>
      <div className="stat-card approved">
        <div className="stat-value">{stats.approved}</div>
        <div className="stat-label">Approved</div>
      </div>
    </div>
  );
}
