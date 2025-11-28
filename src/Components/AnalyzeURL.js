import React, { useState } from "react";
import { api } from "../utils/api";
import { downloadUrlScanPDF } from "../utils/pdf";

export default function AnalyzeURL() {
  const [url, setUrl] = useState("");
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleDownload = () => {
    if (!scanResults) return;
    downloadUrlScanPDF(scanResults, scanResults.url || url || 'url-scan-report');
  };

  const handleScan = async () => {
    if (!url.trim()) {
      setError("Please enter a URL to scan.");
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL (including http:// or https://)");
      return;
    }

    setLoading(true);
    setError(null);
    setScanResults(null);
    setSuccess(null);

    try {
      console.log('Starting URL scan for:', url);
      const response = await api.post("/api/scan-url", { url });
      console.log('URL scan response:', response.data);
      setScanResults(response.data);
      setSuccess("URL scan completed successfully! You can download the detailed report.");
    } catch (err) {
      console.error('URL scan error:', err);
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || err.message || "Failed to scan URL");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  const getThreatColor = (level) => {
    switch (level) {
      case "HIGH":
        return "text-red-600 bg-red-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "LOW":
        return "text-blue-600 bg-blue-100";
      case "SAFE":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            URL Security Scanner
          </h1>
          <p className="text-lg text-gray-600">
            Analyze URLs for malicious content, phishing attempts, and security threats
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter URL to Scan
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com"
                  className="flex-1 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent break-all"
                />
                <button
                  onClick={handleScan}
                  disabled={loading || !url.trim()}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? "Scanning..." : "Scan URL"}
                </button>
              </div>
            </div>


            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-700">{success}</p>
              </div>
            )}
          </div>
        </div>

        {scanResults && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Scan Results</h2>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${getThreatColor(scanResults.threat_level)}`}>
                  {scanResults.threat_level || "UNKNOWN"}
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
                <h3 className="font-semibold text-gray-900 mb-2">Risk Score</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        (scanResults.risk_score || 0) >= 80
                          ? "bg-red-500"
                          : (scanResults.risk_score || 0) >= 50
                          ? "bg-yellow-500"
                          : (scanResults.risk_score || 0) >= 20
                          ? "bg-blue-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${scanResults.risk_score || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {scanResults.risk_score || 0}/100
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">URL Status</h3>
                <p className={`text-sm ${scanResults.liveness_check?.is_live ? "text-green-600" : "text-red-600"}`}>
                  {scanResults.liveness_check?.is_live ? "✓ Live" : "✗ Not accessible"}
                </p>
                {scanResults.liveness_check?.status_code && (
                  <p className="text-xs text-gray-500 mt-1">
                    Status: {scanResults.liveness_check.status_code}
                  </p>
                )}
                {Array.isArray(scanResults.resolved_ips) && scanResults.resolved_ips.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">Resolved IPs:</p>
                    <p className="text-xs text-gray-700 break-all">
                      {scanResults.resolved_ips.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {scanResults.pattern_detection && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Threat Detection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(scanResults.pattern_detection).map(([category, result]) => (
                    <div
                      key={category}
                      className={`p-4 rounded-lg border-2 ${
                        result.detected
                          ? "border-red-200 bg-red-50"
                          : "border-green-200 bg-green-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900 capitalize">
                          {category.replace("_", " ")}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            result.detected ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {result.detected ? "Detected" : "Clean"}
                        </span>
                      </div>
                      {result.detected && result.count > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          {result.count} pattern(s) found
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scanResults.recommendations && scanResults.recommendations.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Recommendations</h3>
                <div className="space-y-2">
                  {scanResults.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-yellow-500 mt-0.5">⚠️</span>
                      <p className="text-sm text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Detailed Analysis</h3>
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(scanResults, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
