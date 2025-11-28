import React, { useEffect, useState } from "react";
import { api, API_BASE_URL } from "../utils/api";

const FALLBACK_IMG = (process.env.PUBLIC_URL || '') + '/cyber-fallback.svg';

export default function News() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(24);
  const [failed, setFailed] = useState({}); // map of raw imageUrl -> true

  const fetchNews = async (lim = limit, force = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/api/news?limit=${lim}${force ? '&nocache=1' : ''}`);
      setItems(data?.items || []);
      // reset failed map on new data to avoid stale flags
      setFailed({});
    } catch (e) {
      setError(e.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const resolveImageSrc = (it) => {
    const raw = (it?.imageUrl || '').trim();
    if (!raw) return FALLBACK_IMG;
    if (failed[raw]) return FALLBACK_IMG;
    if (raw.startsWith('http')) {
      return `${API_BASE_URL}/api/news-image?src=${encodeURIComponent(raw)}`;
    }
    return raw || FALLBACK_IMG;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 isolate text-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 drop-shadow-md">Security News</h1>
            <p className="mt-2 text-lg font-medium text-gray-900">Latest headlines from cybersecurity and threat intelligence.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
            >
              {[12, 24, 36, 48].map(n => (
                <option key={n} value={n}>{n} items</option>
              ))}
            </select>
            <button
              onClick={() => fetchNews(limit, true)}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(loading && items.length === 0 ? Array.from({ length: 12 }) : items).map((it, i) => (
            <article key={i} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow hover:shadow-lg transition text-black opacity-100 mix-blend-normal">
              <div className="aspect-video w-full bg-gray-100 overflow-hidden -mb-px rounded-t-2xl">
                {it ? (
                  <img
                    src={resolveImageSrc(it)}
                    alt={it.title || 'news image'}
                    className="block w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    data-raw={(it.imageUrl || '').trim()}
                    onError={(e) => {
                      const raw = e.currentTarget.getAttribute('data-raw') || '';
                      e.currentTarget.src = FALLBACK_IMG;
                      if (raw) setFailed(prev => ({ ...prev, [raw]: true }));
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-white" />
                )}
              </div>
              <div className="p-5 bg-white text-black rounded-b-2xl">
                <h3 className="text-lg font-bold group-hover:text-brand transition">
                  {it ? (it.title || '(no title)') : 'Loading…'}
                </h3>
                <p className="mt-2 text-[0.95rem] text-gray-900 line-clamp-3">
                  {it ? (it.summary || '') : 'Fetching latest security headlines…'}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-900">
                    {it ? `${it.source || ''} ${it.publishedAt ? '· ' + new Date(it.publishedAt).toLocaleString() : ''}` : ''}
                  </span>
                  {it?.link ? (
                    <a href={it.link} target="_blank" rel="noreferrer" className="text-sm text-brand hover:text-brand-dark">Read more</a>
                  ) : (
                    <span className="text-sm text-gray-400">…</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
