import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useInspections } from '../hooks/useInspections';
import { useAuth } from '../context/AuthContext';
import { isManager } from '../utils/roles';

function qtyDiscrepancy(row) {
  const t = row.target_quantity;
  if (t == null) return null;
  return t - row.detected_quantity;
}

function formatUuid(id) {
  if (!id) return '—';
  const s = String(id);
  return s.length > 10 ? `${s.slice(0, 8)}…` : s;
}

function aggregateByShift(rows) {
  const map = new Map();
  for (const row of rows) {
    const shift = row.shift ?? 0;
    if (!map.has(shift)) {
      map.set(shift, { shift: `Shift ${shift}`, OK: 0, NG: 0 });
    }
    const bucket = map.get(shift);
    const st = String(row.status || '').toUpperCase();
    if (st === 'OK') bucket.OK += 1;
    else if (st === 'NG') bucket.NG += 1;
  }
  return Array.from(map.values()).sort((a, b) =>
    a.shift.localeCompare(b.shift, undefined, { numeric: true }),
  );
}

export default function PerformancePage() {
  const { rows, error, loading } = useInspections();
  const { user } = useAuth();
  const chartData = aggregateByShift(rows);
  const readOnlyNote = isManager(user?.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Performance overview
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          OK vs NG counts by shift, synced from live inspections.
          {readOnlyNote && (
            <span className="text-electric"> Manager view is read-only.</span>
          )}
        </p>
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Loading inspection data…</p>
      )}
      {error && (
        <p className="text-sm text-qc-ng">
          Could not load inspections. Is the API running at{' '}
          {process.env.REACT_APP_API_URL || 'http://localhost:8000'}?
        </p>
      )}

      <div className="rounded-xl border border-white/10 bg-charcoal-surface p-4 md:p-6">
        <h2 className="mb-4 text-sm font-medium text-gray-300">
          OK vs NG by shift
        </h2>
        <div className="h-80 w-full min-h-[280px]">
          {chartData.length === 0 && !loading ? (
            <p className="text-sm text-gray-500">No inspection data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey="shift"
                  stroke="#888"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  stroke="#888"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="OK" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NG" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {isManager(user?.role) && (
        <div className="rounded-xl border border-white/10 bg-charcoal-surface p-4 md:p-6">
          <h2 className="mb-4 text-sm font-medium text-gray-300">
            Inspection log (read-only)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-white/5">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-charcoal-elevated text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Part</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Weight</th>
                  <th className="px-3 py-2">Detected</th>
                  <th className="px-3 py-2">Target</th>
                  <th className="px-3 py-2">Δ qty</th>
                  <th className="px-3 py-2">Shift</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const d = qtyDiscrepancy(row);
                  const isNg = String(row.status || '').toUpperCase() === 'NG';
                  return (
                    <tr
                      key={row.id}
                      className={
                        isNg
                          ? 'border-b border-white/5 bg-qc-ng/[0.08]'
                          : 'border-b border-white/5'
                      }
                    >
                      <td className="px-3 py-2 font-mono text-xs text-gray-400">
                        {formatUuid(row.id)}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {row.part_id ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            String(row.status || '').toUpperCase() === 'OK'
                              ? 'font-medium text-qc-ok'
                              : 'font-medium text-qc-ng'
                          }
                        >
                          {row.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gray-300">
                        {row.actual_weight ?? '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gray-300">
                        {row.detected_quantity}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gray-300">
                        {row.target_quantity ?? '—'}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-electric">
                        {d == null ? '—' : d}
                      </td>
                      <td className="px-3 py-2 text-gray-300">
                        {row.shift ?? '—'}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-6 text-center text-sm text-gray-500"
                    >
                      No inspections.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
