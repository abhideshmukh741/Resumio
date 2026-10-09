import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  Sparkles, 
  Layers, 
  Play, 
  Pause, 
  XCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Mail, 
  ArrowRight, 
  Sliders, 
  RotateCw,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BulkProcessing() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeRunDetail, setActiveRunDetail] = useState(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [launching, setLaunching] = useState(false);

  // Form State
  const [runName, setRunName] = useState('Full Stack & Python AI Batch');
  const [targetRoles, setTargetRoles] = useState('Full Stack Engineer, Python Developer, ML Engineer');
  const [targetLocations, setTargetLocations] = useState('Remote, United States');
  const [minMatchScore, setMinMatchScore] = useState(60);
  const [maxJobs, setMaxJobs] = useState(10);
  const [autoCoverLetters, setAutoCoverLetters] = useState(true);

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    let interval;
    if (activeRunId) {
      fetchRunDetail(activeRunId);
      interval = setInterval(() => {
        fetchRunDetail(activeRunId);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [activeRunId]);

  const fetchRuns = async () => {
    setLoadingRuns(true);
    try {
      const res = await api.get('/api/bulk/runs');
      setRuns(res.data || []);
      if (res.data?.length > 0 && !activeRunId) {
        setActiveRunId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching bulk runs:', err);
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchRunDetail = async (runId) => {
    try {
      const res = await api.get(`/api/bulk/runs/${runId}`);
      setActiveRunDetail(res.data);
    } catch (err) {
      console.error('Error fetching run detail:', err);
    }
  };

  const handleStartBulkRun = async (e) => {
    e.preventDefault();
    setLaunching(true);
    try {
      const payload = {
        run_name: runName,
        target_roles: targetRoles.split(',').map(r => r.trim()).filter(Boolean),
        target_locations: targetLocations.split(',').map(l => l.trim()).filter(Boolean),
        min_match_score: Number(minMatchScore),
        max_jobs: Number(maxJobs),
        auto_generate_cover_letters: autoCoverLetters
      };

      const res = await api.post('/api/bulk/start', payload);
      showToast(`Bulk AI Run "${res.data.run_name}" launched!`);
      setActiveRunId(res.data.id);
      fetchRuns();
    } catch (err) {
      console.error('Error starting bulk run:', err);
      const detailMsg = err.response?.data?.detail || 'Failed to start bulk run. Please ensure you are signed in.';
      showToast(detailMsg);
    } finally {
      setLaunching(false);
    }
  };

  const handlePause = async (runId) => {
    try {
      await api.post(`/api/bulk/runs/${runId}/pause`, {});
      showToast('Run paused.');
      fetchRunDetail(runId);
      fetchRuns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResume = async (runId) => {
    try {
      await api.post(`/api/bulk/runs/${runId}/resume`, {});
      showToast('Run resumed.');
      fetchRunDetail(runId);
      fetchRuns();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (runId) => {
    try {
      await api.post(`/api/bulk/runs/${runId}/cancel`, {});
      showToast('Run cancelled.');
      fetchRunDetail(runId);
      fetchRuns();
    } catch (err) {
      console.error(err);
    }
  };

  const progressPercent = activeRunDetail && activeRunDetail.total_jobs > 0
    ? Math.round((activeRunDetail.processed_jobs / activeRunDetail.total_jobs) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full mb-2">
          <Cpu className="w-3.5 h-3.5" />
          <span>Agno Autonomous Multi-Agent Orchestrator</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bulk AI Job Application Engine</h1>
        <p className="text-slate-600 text-sm mt-1">
          Orchestrate autonomous Job Discovery, ATS Match Analysis, Role-Specific Resume Tailoring, and Cover Letter Generation at scale.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Launcher Form & Past Runs List */}
        <div className="lg:col-span-5 space-y-6">
          {/* Launcher Form Card */}
          <div className="bg-white rounded-3xl p-6 md:p-7 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Launch New Bulk Run</span>
            </h2>

            <form onSubmit={handleStartBulkRun} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Batch Run Name
                </label>
                <input
                  type="text"
                  value={runName}
                  onChange={(e) => setRunName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Roles (comma-separated)
                </label>
                <input
                  type="text"
                  value={targetRoles}
                  onChange={(e) => setTargetRoles(e.target.value)}
                  placeholder="e.g. Full Stack, Python, ML Engineer"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Locations
                </label>
                <input
                  type="text"
                  value={targetLocations}
                  onChange={(e) => setTargetLocations(e.target.value)}
                  placeholder="e.g. Remote, San Francisco, London"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Min ATS Match: {minMatchScore}%
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="90"
                    value={minMatchScore}
                    onChange={(e) => setMinMatchScore(e.target.value)}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Batch Size
                  </label>
                  <select
                    value={maxJobs}
                    onChange={(e) => setMaxJobs(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="5">5 Jobs (Fast)</option>
                    <option value="10">10 Jobs (Standard)</option>
                    <option value="25">25 Jobs (Large)</option>
                    <option value="50">50 Jobs (Maximum)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoCover"
                  checked={autoCoverLetters}
                  onChange={(e) => setAutoCoverLetters(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="autoCover" className="text-xs font-medium text-slate-700 select-none">
                  Auto-generate tailored Cover Letters for matching jobs
                </label>
              </div>

              <button
                type="submit"
                disabled={launching}
                className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{launching ? 'Initializing Pipeline...' : 'Start Autonomous Bulk Run'}</span>
              </button>
            </form>
          </div>

          {/* Past Runs Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Bulk Runs History</span>
              <button onClick={fetchRuns} className="text-slate-400 hover:text-slate-700">
                <RotateCw className="w-4 h-4" />
              </button>
            </h3>

            {loadingRuns ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading history...</div>
            ) : runs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">No bulk runs launched yet.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {runs.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setActiveRunId(r.id)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      activeRunId === r.id
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{r.run_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {r.processed_jobs}/{r.total_jobs} processed • {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      r.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'running' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                      r.status === 'paused' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'cancelled' ? 'bg-slate-200 text-slate-700' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Pipeline Monitor & Generated Items */}
        <div className="lg:col-span-7 space-y-6">
          {activeRunDetail ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Active Run Status Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Active Pipeline Run</div>
                  <h2 className="text-2xl font-black text-slate-900 mt-0.5">{activeRunDetail.run_name}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Target Roles: {activeRunDetail.target_roles?.join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeRunDetail.status === 'running' && (
                    <button
                      onClick={() => handlePause(activeRunDetail.id)}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  )}
                  {activeRunDetail.status === 'paused' && (
                    <button
                      onClick={() => handleResume(activeRunDetail.id)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </button>
                  )}
                  {['running', 'paused', 'pending'].includes(activeRunDetail.status) && (
                    <button
                      onClick={() => handleCancel(activeRunDetail.id)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar & Counters */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Batch Completion Progress</span>
                  <span className="text-indigo-600">{progressPercent}% ({activeRunDetail.processed_jobs}/{activeRunDetail.total_jobs} Jobs)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-3 mt-4 text-center">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Total</div>
                    <div className="text-xl font-black text-slate-900 mt-0.5">{activeRunDetail.total_jobs}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100">
                    <div className="text-[11px] font-bold text-blue-600 uppercase">Processed</div>
                    <div className="text-xl font-black text-blue-900 mt-0.5">{activeRunDetail.processed_jobs}</div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase">Successful</div>
                    <div className="text-xl font-black text-emerald-900 mt-0.5">{activeRunDetail.successful_jobs}</div>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100">
                    <div className="text-[11px] font-bold text-rose-600 uppercase">Failed/Skip</div>
                    <div className="text-xl font-black text-rose-900 mt-0.5">{activeRunDetail.failed_jobs}</div>
                  </div>
                </div>
              </div>

              {/* Processed Items Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Generated Documents & Job Items ({activeRunDetail.items?.length || 0})
                </h3>

                {activeRunDetail.items?.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">No items found for this batch.</div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {activeRunDetail.items?.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50/70 hover:bg-slate-100/80 rounded-2xl p-4 border border-slate-200/90 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{item.job?.title || 'Job Opportunity'}</span>
                            {item.match_score > 0 && (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-md">
                                {item.match_score}% Match
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {item.job?.company} • {item.job?.location}
                          </div>
                          {item.error_message && (
                            <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              <span>{item.error_message}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {item.resume_version_id && (
                            <button
                              onClick={() => navigate('/versions')}
                              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition flex items-center gap-1"
                              title="View and download tailored resume"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Resume</span>
                            </button>
                          )}
                          {item.cover_letter_id && (
                            <button
                              onClick={() => navigate('/cover-letters')}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition flex items-center gap-1"
                              title="View and edit tailored cover letter"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span>Letter</span>
                            </button>
                          )}
                          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg capitalize ${
                            item.status === 'ready_for_review' || item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                            item.status === 'pending' ? 'bg-slate-200 text-slate-700' :
                            item.status === 'skipped' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center h-full">
              <Layers className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Bulk Run Selected</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                Launch a new bulk batch on the left or select an existing run to monitor real-time Agno agent execution.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
