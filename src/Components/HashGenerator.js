import React, { useCallback, useMemo, useState } from 'react';

function ab2hex(buffer) {
  const bytes = new Uint8Array(buffer);
  const hex = [];
  for (let i = 0; i < bytes.length; i++) {
    const h = bytes[i].toString(16).padStart(2, '0');
    hex.push(h);
  }
  return hex.join('');
}

async function digestArrayBuffer(algorithm, data) {
  if (!window.crypto?.subtle) throw new Error('Web Crypto not available in this browser');
  const hash = await window.crypto.subtle.digest(algorithm, data);
  return ab2hex(hash);
}

async function hashText(algorithm, text) {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  return digestArrayBuffer(algorithm, data);
}

async function hashFile(algorithm, file) {
  const buf = await file.arrayBuffer();
  return digestArrayBuffer(algorithm, buf);
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(value || ''); setCopied(true); setTimeout(()=>setCopied(false), 1200); } catch {}
  };
  return (
    <button onClick={onCopy} className="text-xs px-2 py-1 rounded bg-slate-800 text-white hover:bg-slate-900">
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

const ALGOS = [
  { id: 'SHA-256', label: 'SHA-256' },
  { id: 'SHA-1', label: 'SHA-1' },
  { id: 'SHA-512', label: 'SHA-512' },
];

function TextHashCard() {
  const [text, setText] = useState('');
  const [algo, setAlgo] = useState('SHA-256');
  const [hash, setHash] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onHash = async () => {
    setErr(''); setLoading(true);
    try { setHash(await hashText(algo, text)); } catch (e) { setErr(e.message || 'Hash failed'); } finally { setLoading(false); }
  };

  return (
    <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Text Hash</h3>
        <div className="flex items-center gap-2">
          <select value={algo} onChange={(e)=>setAlgo(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1">
            {ALGOS.map(a => (<option key={a.id} value={a.id}>{a.label}</option>))}
          </select>
          <button onClick={onHash} disabled={loading} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">{loading ? 'Hashing…' : 'Generate'}</button>
        </div>
      </div>
      <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={4} placeholder="Enter text..."
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
      {err && <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">{err}</div>}
      {hash && (
        <div className="mt-3">
          <div className="text-xs text-gray-600 mb-1">{algo}:</div>
          <div className="flex items-center gap-2">
            <code className="text-[12px] break-all bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-1">{hash}</code>
            <CopyBtn value={hash} />
          </div>
        </div>
      )}
    </section>
  );
}

function FileHashCard() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onFile = (e) => setFile(e.target.files?.[0] || null);

  const onHash = async () => {
    setErr(''); setResults({}); if (!file) { setErr('Select a file first'); return; }
    if (file.size > 200 * 1024 * 1024) { setErr('Warning: large file (>200MB). This may be slow or fail in-browser.'); }
    setLoading(true);
    try {
      const out = {};
      for (const a of ALGOS) {
        out[a.id] = await hashFile(a.id, file);
      }
      setResults(out);
    } catch (e) {
      setErr(e.message || 'Hash failed');
    } finally { setLoading(false); }
  };

  return (
    <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">File Hash</h3>
        <button onClick={onHash} disabled={loading} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">{loading ? 'Hashing…' : 'Generate'}</button>
      </div>
      <input type="file" onChange={onFile} className="text-sm" />
      {file && <div className="mt-2 text-xs text-gray-600">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</div>}
      {err && <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">{err}</div>}
      {Object.keys(results).length > 0 && (
        <div className="mt-3 space-y-2">
          {ALGOS.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <div className="text-xs text-gray-600 w-24">{a.label}:</div>
              <code className="text-[12px] break-all bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-1">{results[a.id]}</code>
              <CopyBtn value={results[a.id]} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RandomHashCard() {
  const [len, setLen] = useState(32);
  const [useLetters, setUseLetters] = useState(true);
  const [useDigits, setUseDigits] = useState(true);
  const [useSymbols, setUseSymbols] = useState(false);
  const [value, setValue] = useState('');
  const [results, setResults] = useState({});

  const charset = useMemo(() => {
    let cs = '';
    if (useLetters) cs += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useDigits) cs += '0123456789';
    if (useSymbols) cs += '!@#$%^&*()-_=+[]{};:,.<>/?';
    return cs || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  }, [useLetters, useDigits, useSymbols]);

  const generate = useCallback(() => {
    const cs = charset;
    const arr = new Uint8Array(len);
    window.crypto.getRandomValues(arr);
    let s = '';
    for (let i = 0; i < arr.length; i++) {
      s += cs[arr[i] % cs.length];
    }
    setValue(s);
  }, [charset, len]);

  const compute = useCallback(async () => {
    if (!value) return setResults({});
    const out = {};
    for (const a of ALGOS) {
      out[a.id] = await hashText(a.id, value);
    }
    setResults(out);
  }, [value]);

  return (
    <section className="bg-white rounded-2xl p-4 border border-gray-200 shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Random Generator</h3>
        <div className="flex items-center gap-2">
          <button onClick={generate} className="px-3 py-1.5 text-sm rounded bg-slate-700 text-white hover:bg-slate-800">Generate</button>
          <button onClick={compute} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">Hash</button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="number" min={4} max={4096} value={len} onChange={(e)=>setLen(Number(e.target.value)||32)} className="w-20 border border-gray-300 rounded px-2 py-1"/> Length</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={useLetters} onChange={(e)=>setUseLetters(e.target.checked)} /> Letters</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={useDigits} onChange={(e)=>setUseDigits(e.target.checked)} /> Digits</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={useSymbols} onChange={(e)=>setUseSymbols(e.target.checked)} /> Symbols</label>
      </div>
      {value && (
        <div className="mt-3">
          <div className="text-xs text-gray-600 mb-1">Value:</div>
          <div className="flex items-center gap-2">
            <code className="text-[12px] break-all bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-1">{value}</code>
            <CopyBtn value={value} />
          </div>
        </div>
      )}
      {Object.keys(results).length > 0 && (
        <div className="mt-3 space-y-2">
          {ALGOS.map(a => (
            <div key={a.id} className="flex items-center gap-2">
              <div className="text-xs text-gray-600 w-24">{a.label}:</div>
              <code className="text-[12px] break-all bg-gray-50 border border-gray-200 rounded px-2 py-1 flex-1">{results[a.id]}</code>
              <CopyBtn value={results[a.id]} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function HashGenerator() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 isolate text-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 drop-shadow-md">Hash Generator</h1>
          <p className="mt-2 text-gray-700">Generate cryptographic hashes for text and files. Create random values and hash them too. Algorithms supported: SHA-1, SHA-256, SHA-512.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TextHashCard />
          <RandomHashCard />
          <div className="md:col-span-2"><FileHashCard /></div>
        </div>
      </div>
    </div>
  );
}
