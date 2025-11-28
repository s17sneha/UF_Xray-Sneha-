import React, { useState } from "react";
import { api } from "../utils/api";
import { downloadJSON } from "../utils/download";
import { downloadLogScanPDF } from "../utils/pdf";

export default function AnalyzeLog() {
  const [logText, setLogText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setScanResults(null);
    setError(null);
    setSuccess(null);
  };

  const handleDownload = () => {
    if (!scanResults) return;
    const hint = selectedFile?.name || 'log-scan-report';
    try {
      downloadLogScanPDF(scanResults, hint);
    } catch (e) {
      // Fallback to JSON if PDF fails for any reason
      downloadJSON(scanResults, ['log-scan', hint]);
    }
  };

  const handleScan = async () => {
    if (!selectedFile && !logText.trim()) {
      setError("Please paste logs or upload a log file.");
      return;
    }

    setLoading(true);
    setError(null);
    setScanResults(null);
    setSuccess(null);

    try {
      let response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        response = await api.post("/api/scan-log", formData, true);
      } else {
        response = await api.post("/api/scan-log", { text: logText }, false);
      }
      setScanResults(response.data);
      setSuccess("Log analysis completed successfully! You can download the detailed report.");
    } catch (err) {
      setError(err.message || "Failed to analyze log");
    } finally {
      setLoading(false);
    }
  };

  const renderPairs = (obj) => {
    if (!obj || typeof obj !== 'object') return null;
    return Object.entries(obj).map(([k, v]) => (
      <div key={k} className="flex justify-between text-sm">
        <span className="text-gray-600 capitalize">{k.replaceAll('_', ' ')}:</span>
        <span className="font-medium break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Log Analyzer</h1>
          <p className="text-lg text-gray-600">Analyze logs to detect anomalies, suspicious patterns, and failures</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paste Logs</label>
              <textarea
                rows={10}
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="Paste raw log text here"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload Log File</label>
              <input
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
              />
              <p className="text-xs text-gray-500 mt-2">Supported: plain text logs; archives are not auto-extracted.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={handleScan}
              disabled={loading || (!selectedFile && !logText.trim())}
              className="px-8 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? "Analyzing..." : "Analyze Logs"}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-700">{success}</p>
            </div>
          )}
        </div>

        {scanResults && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                  (scanResults.threat_level === 'HIGH') ? 'text-red-700 bg-red-100' :
                  (scanResults.threat_level === 'MEDIUM') ? 'text-yellow-700 bg-yellow-100' :
                  (scanResults.threat_level === 'LOW') ? 'text-blue-700 bg-blue-100' : 'text-green-700 bg-green-100'
                }`}>
                  {scanResults.threat_level || 'SAFE'}
                </div>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                >
                  Download Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                {renderPairs(scanResults.summary)}
                <div className="mt-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Risk Score:</span><span className="font-medium">{scanResults.risk_score ?? '-'}/100</span></div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Counts</h3>
                <div className="mb-2">
                  <p className="text-sm font-medium text-gray-700">By Level</p>
                  {renderPairs(scanResults.counts?.by_level)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status Codes</p>
                  {renderPairs(scanResults.counts?.status_codes)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Top IPs</h3>
                <ul className="text-sm space-y-1">
                  {(scanResults.top?.ips || []).map(([ip, count], idx) => (
                    <li key={idx} className="flex justify-between"><span className="text-gray-700">{ip}</span><span className="text-gray-600">{count}</span></li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Top URLs</h3>
                <ul className="text-sm space-y-1">
                  {(scanResults.top?.urls || []).map(([u, count], idx) => (
                    <li key={idx} className="flex justify-between"><span className="text-gray-700 break-all">{u}</span><span className="text-gray-600">{count}</span></li>
                  ))}
                </ul>
              </div>
            </div>

            {Array.isArray(scanResults.detections?.suspicious_patterns) && scanResults.detections.suspicious_patterns.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Suspicious Patterns</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scanResults.detections.suspicious_patterns.slice(0, 100).map((hit, idx) => (
                    <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800"><span className="font-semibold">{hit.pattern}</span> — {hit.line}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scanResults.timeline && Object.keys(scanResults.timeline).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Events Timeline (per minute)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm max-h-64 overflow-y-auto">
                  {Object.entries(scanResults.timeline).map(([ts, c]) => (
                    <div key={ts} className="flex justify-between"><span className="text-gray-700">{ts}</span><span className="text-gray-600">{c}</span></div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-gray-900 mb-2">Raw JSON</h3>
              <pre className="text-xs text-gray-600 overflow-x-auto">{JSON.stringify(scanResults, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
