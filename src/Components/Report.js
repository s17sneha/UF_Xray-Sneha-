import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import { api } from "../utils/api";

export default function Report() {
  const { currentUser, isAuthenticated } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReports, setExpandedReports] = useState(new Set());
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isAuthenticated()) {
      fetchReports();
    }
  }, [isAuthenticated]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching reports...');
      const response = await api.get("/api/reports");
      console.log('Reports response:', response.data);
      setReports(response.data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
      if (err.response?.status !== 401) {
        setError("Failed to fetch reports: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (reportId) => {
    try {
      setDeletingId(reportId);
      await api.delete(`/api/reports/${reportId}`);
      setReports(reports.filter((r) => r._id !== reportId));
      setExpandedReports((prev) => {
        const ns = new Set(prev);
        ns.delete(reportId);
        return ns;
      });
    } catch (err) {
      console.error('Error deleting report:', err);
      if (err.response?.status !== 401) {
        setError("Failed to delete report: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Please log in to view reports</h2>
          <p>You need to be authenticated to access this page.</p>
        </div>
      </div>
    );
  }

  const toggleReport = (reportId) => {
    setExpandedReports((prev) => {
      const ns = new Set(prev);
      if (ns.has(reportId)) ns.delete(reportId);
      else ns.add(reportId);
      return ns;
    });
  };

  const downloadReport = (report) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report.type}_scan_${new Date(report.timestamp).toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getThreatColor = (report) => {
    if (report.type === "url") {
      const level = report.result?.threat_level;
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
    } else {
      return report.result?.malicious ? "text-red-600 bg-red-100" : "text-green-600 bg-green-100";
    }
  };

  const getThreatText = (report) => {
    if (report.type === "url") {
      return report.result?.threat_level || "UNKNOWN";
    } else {
      return report.result?.malicious ? "MALICIOUS" : "SAFE";
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleString();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Scan Reports</h1>
          <p className="text-lg text-gray-600">View and manage your security scan results</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {(!reports || reports.length === 0) ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
            <p className="text-gray-600">Start by scanning a URL or file to see your reports here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report._id} className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${report.type === "url" ? "bg-blue-100" : "bg-purple-100"}`}>
                        {report.type === "url" ? (
                          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        ) : (
                          <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{report.type === "url" ? "URL Scan" : "File Scan"}</h3>
                        <p className="text-sm text-gray-600 truncate max-w-md">{report.target}</p>
                        <p className="text-xs text-gray-500">{formatDate(report.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getThreatColor(report)}`}>{getThreatText(report)}</div>
                      <button onClick={() => toggleReport(report._id)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className={`h-5 w-5 transform transition-transform ${expandedReports.has(report._id) ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {expandedReports.has(report._id) && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Scan Summary</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Type:</span><span className="font-medium capitalize">{report.type}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Target:</span><span className="font-medium truncate max-w-xs">{report.target}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Timestamp:</span><span className="font-medium">{formatDate(report.timestamp)}</span></div>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3">Actions</h4>
                          <div className="space-y-2">
                            <button onClick={() => downloadReport(report)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Download Report</button>
                            <button onClick={() => deleteReport(report._id)} disabled={deletingId === report._id} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium">{deletingId === report._id ? "Deleting..." : "Delete Report"}</button>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Detailed Results</h4>
                        <pre className="text-xs text-gray-600 overflow-x-auto bg-gray-50 p-3 rounded">{JSON.stringify(report.result, null, 2)}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
