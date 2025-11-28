import React, { useState } from "react";
import { api } from "../utils/api";
import { downloadFileScanPDF } from "../utils/pdf";

export default function AnalyzeFile() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleDownload = () => {
    if (!scanResults) return;
    const hint = scanResults.filename || selectedFile?.name || 'file-scan-report';
    downloadFileScanPDF(scanResults, hint);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setScanResults(null);
    setError(null);
    setSuccess(null);
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError("Please select a file to scan.");
      return;
    }

    setLoading(true);
    setError(null);
    setScanResults(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      console.log('Starting file scan for:', selectedFile.name);
      const response = await api.post("/api/scan-file", formData, true);
      console.log('File scan response:', response.data);
      setScanResults(response.data);
      setSuccess("File scan completed successfully! You can download the detailed report.");
    } catch (err) {
      console.error('File scan error:', err);
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || err.message || "Failed to scan file");
      }
    } finally {
      setLoading(false);
    }
  };

  const getThreatColor = (isMalicious) => {
    return isMalicious ? "text-red-600 bg-red-100" : "text-green-600 bg-green-100";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            File Security Scanner
          </h1>
          <p className="text-lg text-gray-600">
            Upload and analyze files for malware, suspicious content, and security threats
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select File to Scan
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <button
                  onClick={handleScan}
                  disabled={loading || !selectedFile}
                  className="px-8 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {loading ? "Scanning..." : "Scan File"}
                </button>
              </div>
            </div>


            {selectedFile && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Selected File</h3>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 break-words wrap-anywhere">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <span className="text-xs text-gray-500 truncate max-w-full">
                    {selectedFile.type || "Unknown type"}
                  </span>
                </div>
              </div>
            )}

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
                <div className={`px-4 py-2 rounded-full text-sm font-medium ${getThreatColor(scanResults.malicious)}`}>
                  {scanResults.malicious ? "MALICIOUS" : "SAFE"}
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
                <h3 className="font-semibold text-gray-900 mb-2">File Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600">Filename:</span>
                    <span className="font-medium text-right break-words wrap-anywhere">{scanResults.filename}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-600">SHA256:</span>
                    <span className="font-mono text-xs break-all">{scanResults.sha256}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Scan Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">YARA Scan:</span>
                    <span className={scanResults.yara?.matches?.length > 0 ? "text-red-600" : "text-green-600"}>
                      {scanResults.yara?.matches?.length > 0 ? "Threats Found" : "Clean"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ClamAV:</span>
                    <span className={scanResults.clamav?.status === 'infected' ? "text-red-600" : "text-green-600"}>
                      {scanResults.clamav?.status === 'infected' ? "Infected" : "Clean"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {scanResults.yara?.matches && scanResults.yara.matches.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">YARA Rule Matches</h3>
                <div className="space-y-2">
                  {scanResults.yara.matches.map((match, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800">{match}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scanResults.pe_analysis && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">PE File Analysis</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {Object.entries(scanResults.pe_analysis).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-gray-600 capitalize">{key.replace("_", " ")}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {scanResults.strings_sample && scanResults.strings_sample.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Extracted Strings (Sample)</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {scanResults.strings_sample.slice(0, 20).map((str, index) => (
                      <div key={index} className="text-xs font-mono text-gray-700 break-all">
                        {str}
                      </div>
                    ))}
                  </div>
                  {scanResults.strings_sample.length > 20 && (
                    <p className="text-xs text-gray-500 mt-2">
                      ... and {scanResults.strings_sample.length - 20} more strings
                    </p>
                  )}
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
