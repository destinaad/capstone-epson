import { useState } from 'react';
import { Camera, Pencil, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useInspections } from '../hooks/useInspections';
import { useParts } from '../hooks/useParts';
import {
  canEditInspection,
  canLogInspection,
  canValidateNg,
} from '../utils/roles';

function qtyDiscrepancy(row) {
  const t = row.target_quantity;
  if (t == null) return null;
  return t - row.detected_quantity;
}

function formatConfidence(raw) {
  if (raw == null) return '—';
  const n = Number(raw);
  if (Number.isNaN(n)) return '—';
  const pct = n <= 1 && n >= 0 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function formatUuid(id) {
  if (!id) return '—';
  const s = String(id);
  return s.length > 10 ? `${s.slice(0, 8)}…` : s;
}

function LiveFeedCard({ row }) {
  if (!row) {
    return (
      <div className="rounded-xl border border-white/10 bg-charcoal-surface p-8 text-center text-sm text-gray-500">
        No inspections yet. The live feed will show the latest image and AI
        score when data arrives.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-electric/25 bg-charcoal-surface shadow-lg shadow-black/30">
      <div className="grid gap-0 md:grid-cols-5">
        <div className="relative flex min-h-[200px] items-center justify-center bg-black/50 md:col-span-2">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt="Latest inspection"
              className="max-h-72 w-full object-contain md:max-h-none md:h-full md:min-h-[220px]"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 p-8 text-gray-600">
              <Camera className="h-14 w-14" />
              <span className="text-xs">No image URL</span>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center space-y-4 p-5 md:col-span-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                String(row.status || '').toUpperCase() === 'OK'
                  ? 'rounded-full bg-qc-ok/20 px-2.5 py-0.5 text-xs font-semibold text-qc-ok'
                  : 'rounded-full bg-qc-ng/20 px-2.5 py-0.5 text-xs font-semibold text-qc-ng'
              }
            >
              {row.status || '—'}
            </span>
            <span className="text-xs text-gray-500">
              {row.created_at
                ? new Date(row.created_at).toLocaleString()
                : ''}
            </span>
            <span className="text-xs text-gray-500">
              Shift {row.shift ?? '—'}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              AI confidence score
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-electric">
              {formatConfidence(row.ai_confidence_score)}
            </p>
          </div>
          <p className="text-xs text-gray-500">
            Showing the most recent inspection by timestamp (live polling).
          </p>
        </div>
      </div>
    </div>
  );
}

function LogInspectionForm({ user, parts, onCreated }) {
  const [partId, setPartId] = useState(parts[0]?.id ?? '');
  const [detected, setDetected] = useState('');
  const [weight, setWeight] = useState('');
  const [shift, setShift] = useState('1');
  const [imageUrl, setImageUrl] = useState('');
  const [aiScore, setAiScore] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      await api.post('/inspections/', {
        part_id: Number(partId),
        operator_id: user.id,
        detected_quantity: Number(detected),
        actual_weight: Number(weight),
        shift: Number(shift),
        image_url: imageUrl || null,
        ai_confidence_score:
          aiScore === '' ? null : Number(aiScore),
      });
      setDetected('');
      setWeight('');
      setImageUrl('');
      setAiScore('');
      setMsg('Inspection logged.');
      onCreated();
    } catch (err) {
      const d = err.response?.data?.detail;
      setMsg(typeof d === 'string' ? d : 'Failed to log inspection.');
    } finally {
      setBusy(false);
    }
  }

  if (!parts.length) {
    return (
      <p className="text-sm text-gray-500">
        No parts in database — add parts before logging inspections.
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-xl border border-white/10 bg-charcoal-surface p-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <div className="md:col-span-2 lg:col-span-3">
        <h2 className="text-sm font-semibold text-white">Log inspection</h2>
        <p className="text-xs text-gray-500">
          Operators and supervisors can create new inspection records.
        </p>
      </div>
      <label className="text-xs text-gray-400">
        Part
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
        >
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.part_code} — {p.part_name} (target {p.target_quantity})
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-gray-400">
        Detected quantity
        <input
          type="number"
          required
          className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
          value={detected}
          onChange={(e) => setDetected(e.target.value)}
        />
      </label>
      <label className="text-xs text-gray-400">
        Actual weight
        <input
          type="number"
          step="any"
          required
          className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </label>
      <label className="text-xs text-gray-400">
        Shift
        <input
          type="number"
          required
          className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
          value={shift}
          onChange={(e) => setShift(e.target.value)}
        />
      </label>
      <label className="text-xs text-gray-400">
        Image URL (optional)
        <input
          className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://…"
        />
      </label>
      <label className="text-xs text-gray-400">
        AI confidence (optional, 0–1 or %)
        <input
          type="number"
          step="any"
          className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
          value={aiScore}
          onChange={(e) => setAiScore(e.target.value)}
        />
      </label>
      <div className="flex items-end md:col-span-2 lg:col-span-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-charcoal hover:bg-electric-dim disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Submit inspection'}
        </button>
        {msg && (
          <span className="ml-3 text-xs text-gray-400">{msg}</span>
        )}
      </div>
    </form>
  );
}

function EditModal({ row, user, onClose, onSaved }) {
  const [detected, setDetected] = useState(String(row.detected_quantity));
  const [weight, setWeight] = useState(String(row.actual_weight));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.patch(`/inspections/${row.id}`, {
        detected_quantity: Number(detected),
        actual_weight: Number(weight),
        updated_by: user.id,
      });
      onSaved();
      onClose();
    } catch (ex) {
      const d = ex.response?.data?.detail;
      setErr(typeof d === 'string' ? d : 'Update failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-charcoal-surface p-5 shadow-xl">
        <h3 className="text-sm font-semibold text-white">Edit inspection</h3>
        <p className="text-xs text-gray-500">{formatUuid(row.id)}</p>
        {err && <p className="mt-2 text-xs text-qc-ng">{err}</p>}
        <form onSubmit={save} className="mt-4 space-y-3">
          <label className="block text-xs text-gray-400">
            Detected quantity
            <input
              type="number"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
              value={detected}
              onChange={(e) => setDetected(e.target.value)}
            />
          </label>
          <label className="block text-xs text-gray-400">
            Actual weight
            <input
              type="number"
              step="any"
              required
              className="mt-1 w-full rounded-lg border border-white/10 bg-charcoal-elevated px-3 py-2 text-sm text-white"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-electric px-3 py-1.5 text-sm font-medium text-charcoal disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { rows, error, loading, reload } = useInspections();
  const { parts } = useParts();
  const [editing, setEditing] = useState(null);

  const latest = rows[0] ?? null;
  const showLog = canLogInspection(user);

  async function validateNg(row) {
    try {
      await api.patch(`/inspections/${row.id}`, {
        status: 'OK',
        updated_by: user.id,
      });
      reload();
    } catch {
      /* refresh on manual retry */
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Live operations
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Monitor the latest inspection, review all records, and act by role.
        </p>
      </div>

      {showLog && (
        <LogInspectionForm user={user} parts={parts} onCreated={reload} />
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-gray-300">Live feed</h2>
        <LiveFeedCard row={latest} />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-300">
            All inspections
          </h2>
          {loading && (
            <span className="text-xs text-gray-500">Refreshing…</span>
          )}
        </div>
        {error && (
          <p className="mb-2 text-sm text-qc-ng">
            Failed to load inspections. Ensure the API is running.
          </p>
        )}
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[900px] text-left text-sm">
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
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Actions</th>
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
                        : 'border-b border-white/5 hover:bg-white/[0.02]'
                    }
                  >
                    <td className="px-3 py-2 font-mono text-xs text-gray-400">
                      {formatUuid(row.id)}
                    </td>
                    <td className="px-3 py-2 text-gray-300">{row.part_id ?? '—'}</td>
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
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {canValidateNg(user) && isNg && (
                          <button
                            type="button"
                            onClick={() => validateNg(row)}
                            className="inline-flex items-center gap-1 rounded-md bg-qc-ok/20 px-2 py-1 text-xs font-medium text-qc-ok hover:bg-qc-ok/30"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Validate OK
                          </button>
                        )}
                        {canEditInspection(user, row) && (
                          <button
                            type="button"
                            onClick={() => setEditing(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/5"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-sm text-gray-500"
                  >
                    No rows yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Δ qty is{' '}
          <span className="text-electric">target_quantity − detected_quantity</span>{' '}
          (dashboard calculation). NG rows use a soft red background.
        </p>
      </section>

      {editing && (
        <EditModal
          row={editing}
          user={user}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
