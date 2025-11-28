import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { api, API_BASE_URL } from "../utils/api";
import '../App.css';

export default function Container1() {
    const [news, setNews] = useState([]);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsError, setNewsError] = useState(null);
    const FALLBACK_IMG = (process.env.PUBLIC_URL || '') + '/cyber-fallback.svg';
    const [vulnSummary, setVulnSummary] = useState(null);
    const [kevUpdatedAt, setKevUpdatedAt] = useState(null);
    const [termLines, setTermLines] = useState([]);

    const resolveImage = (it) => {
        const raw = (it?.imageUrl || '').trim();
        if (!raw) return FALLBACK_IMG;
        if (raw.toLowerCase().startsWith('http')) {
            return `${API_BASE_URL}/api/news-image?src=${encodeURIComponent(raw)}`;
        }
        return raw;
    };

    const fetchNews = async () => {
        setNewsLoading(true);
        setNewsError(null);
        try {
            const { data } = await api.get(`/api/news?limit=9`);
            setNews(data?.items || []);
        } catch (e) {
            setNewsError(e.message || 'Failed to load news');
        } finally {
            setNewsLoading(false);
        }
    };

    const fetchVulnMeta = async () => {
        try {
            const [{ data: sum }, { data: kev }] = await Promise.all([
                api.get('/api/vuln/summary').catch(() => ({ data: null })),
                api.get('/api/vuln/known?limit=1').catch(() => ({ data: null })),
            ]);
            if (sum) setVulnSummary(sum);
            if (kev?.updatedAt) setKevUpdatedAt(kev.updatedAt);
        } catch (_) {
            // silent fail for homepage cosmetics
        }
    };

    useEffect(() => {
        fetchNews();
        fetchVulnMeta();
    }, []);

    // Cyber terminal animation lines
    useEffect(() => {
        const kevStr = kevUpdatedAt ? new Date(kevUpdatedAt).toLocaleDateString() : '—';
        const msgs = [
          `[${new Date().toLocaleTimeString()}] ▶ UF‑Xray initialized`,
          `[${new Date().toLocaleTimeString()}] ✓ Image proxy online`,
          `[${new Date().toLocaleTimeString()}] ✓ Aggregated feeds: 4`,
          `[${new Date().toLocaleTimeString()}] ✓ Headlines available: ${news?.length || 0}`,
          `[${new Date().toLocaleTimeString()}] ✓ Found vulnerabilities: ${vulnSummary?.totalFound ?? 0}`,
          `[${new Date().toLocaleTimeString()}] ✓ CISA KEV updated: ${kevStr}`,
          `[${new Date().toLocaleTimeString()}] ▶ Ready for analysis...`
        ];
        let i = 0;
        setTermLines([]);
        const timer = setInterval(() => {
            setTermLines(prev => {
                const next = (i < msgs.length) ? msgs[i] : `[${new Date().toLocaleTimeString()}] ▷ Idle`;
                i = Math.min(i + 1, msgs.length);
                const arr = prev.length >= 8 ? [...prev.slice(-7), next] : [...prev, next];
                return arr;
            });
        }, 1100);
        return () => clearInterval(timer);
    }, [vulnSummary?.totalFound, kevUpdatedAt, news?.length]);

    return (
        <>
            <section className="relative overflow-hidden z-0">
                <img
                  alt="A cyber-themed workstation with multiple security dashboards and code on screens"
                  className="w-full h-[560px] object-cover"
                  src="https://static.sitemantic.com/webbuilder/templates/images/information-technology/information-technology-1170-570-1.jpg"
                />
                {/* Cyber overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none"
                     style={{ backgroundImage: 'radial-gradient(600px 200px at 20% 0%, rgba(59,130,246,0.25), transparent), radial-gradient(600px 200px at 80% 0%, rgba(14,165,233,0.25), transparent)'}} />
                <div className="cyber-scanlines" />
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4">
                    <h1 className="hero-title text-4xl sm:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_6px_12px_rgba(0,0,0,0.6)] break-words wrap-anywhere">
                        <span className="text-sky-300">Defend</span> Your Digital Frontline
                    </h1>
                    <p className="text-base sm:text-xl mt-4 text-white/90 md:max-w-3xl">
                        Unified tools for threat intel, analysis, and response.
                    </p>
                    {/* Cyber chips */}
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <span className="chip-cyber">🛡️ <span>Found vulns:</span> <strong>{vulnSummary?.totalFound ?? 0}</strong></span>
                      <span className="chip-cyber">📅 <span>KEV:</span> <strong>{kevUpdatedAt ? new Date(kevUpdatedAt).toLocaleDateString() : '—'}</strong></span>
                      <span className="chip-cyber">📰 <span>Headlines:</span> <strong>{news?.length || 0}</strong></span>
                    </div>
                    <div className="neon-divider" />
                    {/* Terminal panel */}
                    <div className="mt-6 w-full max-w-3xl">
                      <div className="terminal-panel">
                        <pre className="terminal-pre">
{termLines.map((l, idx) => ` ${l}\n`).join('')}
<span className="caret-blink">▋</span>
                        </pre>
                      </div>
                    </div>
                </div>
            </section>
            <section id="news" className="news-section relative z-50 max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 bg-white rounded-2xl opacity-100 isolate">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-black drop-shadow-md break-words wrap-anywhere">Security News</h2>
                        <p className="text-base text-gray-900 break-words wrap-anywhere">Latest headlines from cybersecurity and threat intelligence.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Link to="/News" className="text-sm text-blue-700 hover:text-brand">View more</Link>
                      <button onClick={fetchNews} className="text-blue-700 hover:text-brand-dark">{newsLoading ? 'Refreshing…' : 'Refresh'}</button>
                    </div>
                </div>
                {newsError && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{newsError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(newsLoading && news.length === 0 ? Array.from({ length: 6 }) : news).map((item, idx) => (
                        <article key={idx} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow hover:shadow-lg transition text-black opacity-100 mix-blend-normal antialiased">
                            <div className="aspect-video w-full bg-gray-100 overflow-hidden -mb-px">
                                {item ? (
                                    <img
                                      src={resolveImage(item)}
                                      alt={item.title || 'news image'}
                                      className="block w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => { e.currentTarget.src = FALLBACK_IMG; }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-white" />
                                )}
                            </div>
                            <div className="p-5 bg-white text-black mix-blend-normal">
                                <h3 className="text-lg font-bold group-hover:text-brand transition text-black break-words wrap-anywhere">
                                    {newsLoading && !item ? 'Loading…' : (item?.title || '(no title)')}
                                </h3>
                                <p className="mt-2 text-[0.95rem] text-gray-900 line-clamp-3 break-words wrap-anywhere">
                                    {newsLoading && !item ? 'Fetching latest security headlines…' : (item?.summary || '')}
                                </p>
                                <div className="mt-4 flex items-center justify-between mix-blend-normal">
                                    <span className="text-xs font-medium text-gray-900">
                                        {newsLoading && !item ? '' : `${item?.source || ''} ${item?.publishedAt ? '· ' + new Date(item.publishedAt).toLocaleString() : ''}`}
                                    </span>
                                    {(!newsLoading && item?.link) ? (
                                        <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-brand hover:text-brand-dark">Read more</a>
                                    ) : (
                                        <span className="text-sm text-gray-400">…</span>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </>

    );
}
