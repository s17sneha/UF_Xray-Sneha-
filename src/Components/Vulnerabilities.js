import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../utils/api';

const SEV_COLORS = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-red-500 text-white',
  MEDIUM: 'bg-amber-500 text-white',
  LOW: 'bg-emerald-500 text-white',
  SAFE: 'bg-gray-400 text-white',
};

function SeverityBadge({ severity }) {
  const sev = String(severity || 'LOW').toUpperCase();
  const cls = SEV_COLORS[sev] || 'bg-slate-500 text-white';
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{sev}</span>
  );
}

function ListHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-extrabold text-gray-900 drop-shadow-sm">{title}</h2>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

function FoundList({ autoRefresh, setAutoRefresh }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: f }, { data: s }] = await Promise.all([
        api.get('/api/vuln/found?limit=200'),
        api.get('/api/vuln/summary'),
      ]);
      setItems(Array.isArray(f?.items) ? f.items : []);
      setSummary(s || null);
    } catch (e) {
      setError(e.message || 'Failed to load found vulnerabilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(fetchData, 15000);
      return () => timerRef.current && clearInterval(timerRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [autoRefresh]);

  return (
    <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow">
      <ListHeader
        title="Found Vulnerabilities (from scans)"
        right={(
          <>
            <label className="text-sm text-gray-700 flex items-center gap-2">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto-refresh
            </label>
            <button onClick={fetchData} disabled={loading} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </>
        )}
      />
      {error && <div className="mb-3 bg-red-50 border border-red-200 rounded p-3 text-red-700">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(loading && items.length === 0 ? Array.from({ length: 6 }) : items).map((it, i) => (
          <article key={i} className="group rounded-xl border border-gray-200 bg-white shadow hover:shadow-md transition p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-gray-900 text-base break-words pr-3">{it ? (it.title || 'Finding') : 'Loading…'}</h3>
              <SeverityBadge severity={it?.severity} />
            </div>
            <div className="mt-2 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">{it?.type || ''} · {it?.source || ''}</span>
                <span className="text-gray-500">{it?.timestamp ? new Date(it.timestamp).toLocaleString() : ''}</span>
              </div>
              {it?.reference && (
                <div className="mt-1"><span className="text-gray-500">Ref:</span> <span className="text-gray-800 break-all">{it.reference}</span></div>
              )}
              {it?.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-blue-700">Details</summary>
                  <pre className="mt-2 text-[12px] bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-48">{JSON.stringify(it.details, null, 2)}</pre>
                </details>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="mt-4 text-sm text-gray-700">
        <div className="flex flex-wrap items-center gap-3">
          <div>Total found: <span className="font-semibold">{summary?.totalFound ?? items.length}</span></div>
          <div className="flex items-center gap-2">
            <span>By severity:</span>
            {Object.entries(summary?.bySeverity || {}).map(([k,v]) => (
              <span key={k} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                <strong>{k}</strong> {v}
              </span>
            ))}
          </div>
          {summary?.latest && <div>Latest: {new Date(summary.latest).toLocaleString()}</div>}
        </div>
      </div>
    </section>
  );
}

function KnownList() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(50);
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchKnown = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query ? `&q=${encodeURIComponent(query)}` : '';
      const { data } = await api.get(`/api/vuln/known?limit=${limit}${q}`);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUpdatedAt(data?.updatedAt || null);
    } catch (e) {
      setError(e.message || 'Failed to load known vulnerabilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKnown(); }, []);

  return (
    <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow">
      <ListHeader
        title="Known Vulnerabilities (CISA KEV)"
        right={(
          <div className="flex items-center gap-2">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search CVE, vendor, product…"
                   className="text-sm border border-gray-300 rounded px-2 py-1"/>
            <select value={limit} onChange={(e)=>setLimit(parseInt(e.target.value,10))}
                    className="text-sm border border-gray-300 rounded px-2 py-1">
              {[25,50,100,200].map(n=> (<option key={n} value={n}>{n}</option>))}
            </select>
            <button onClick={fetchKnown} disabled={loading} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        )}
      />
      {updatedAt && <div className="mb-2 text-xs text-gray-500">Updated: {new Date(updatedAt).toLocaleString()}</div>}
      {error && <div className="mb-3 bg-red-50 border border-red-200 rounded p-3 text-red-700">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(loading && items.length === 0 ? Array.from({ length: 9 }) : items).map((it, i) => (
          <article key={i} className="group rounded-xl border border-gray-200 bg-white shadow hover:shadow-md transition p-4">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-gray-900 text-base break-words pr-3">{it ? (it.cve || it.name || 'Vulnerability') : 'Loading…'}</h3>
              <SeverityBadge severity={it?.severity || 'HIGH'} />
            </div>
            <div className="mt-1 text-sm text-gray-700">
              <div className="text-gray-600">{it?.vendor} {it?.product}</div>
              <p className="mt-1 line-clamp-3 text-gray-800">{it?.description}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <span>Date added: {it?.dateAdded || '—'}</span>
                <span>Due: {it?.dueDate || '—'}</span>
              </div>
              {Array.isArray(it?.references) && it.references.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="text-gray-600">References</div>
                  <ul className="list-disc ml-4">
                    {it.references.slice(0,3).map((r, idx) => (
                      <li key={idx} className="truncate"><a className="text-blue-700 hover:underline" href={r} target="_blank" rel="noreferrer">{r}</a></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Vulnerabilities() {
  const [tab, setTab] = useState('found');
  const [autoRefresh, setAutoRefresh] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 isolate text-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 drop-shadow-md">Vulnerabilities</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('found')} className={`px-3 py-1.5 text-sm rounded ${tab==='found' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300'}`}>Found</button>
            <button onClick={() => setTab('known')} className={`px-3 py-1.5 text-sm rounded ${tab==='known' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border border-gray-300'}`}>Known</button>
          </div>
        </div>

        <div className="space-y-6">
          {tab === 'found' && (
            <FoundList autoRefresh={autoRefresh} setAutoRefresh={setAutoRefresh} />
          )}
          {tab === 'known' && (
            <KnownList />
          )}
        </div>
      </div>
    </div>
  );
}
