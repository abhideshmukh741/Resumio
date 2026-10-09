import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { 
  Search, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Sparkles, 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Filter, 
  Loader2,
  Globe,
  Building,
  Target,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function JobsDiscovery() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [workArrangement, setWorkArrangement] = useState('all');
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  
  // Selected Job for Analysis Modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [analyzingJobId, setAnalyzingJobId] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  // Action status
  const [tailoringJobId, setTailoringJobId] = useState(null);
  const [tailoredJobs, setTailoredJobs] = useState({}); // jobId -> { keywords, job_url }
  const [trackingJobId, setTrackingJobId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, [workArrangement]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchJobs = async (customSearch = null) => {
    setLoading(true);
    try {
      const activeSearch = customSearch !== null ? customSearch : search;
      const params = {
        limit: 50,
        work_arrangement: workArrangement !== 'all' ? workArrangement : undefined
      };
      if (activeSearch) params.search = activeSearch;
      if (location) params.location = location;

      const res = await api.get('/api/jobs', { params });
      let jobList = res.data || [];

      // If search returned 0 results, automatically try live external discovery on the fly
      if (jobList.length === 0 && activeSearch) {
        const discRes = await api.post('/api/jobs/discover', {
          query: activeSearch,
          location: location || 'remote',
          limit: 15
        });
        if (discRes.data && discRes.data.length > 0) {
          jobList = discRes.data;
        }
      }

      setJobs(jobList);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleDiscoverLive = async () => {
    setDiscovering(true);
    try {
      const query = search || 'developer';
      const res = await api.post('/api/jobs/discover', {
        query,
        location: location || 'remote',
        limit: 20
      });
      showToast(`Discovered ${res.data?.length || 0} live opportunities!`);
      fetchJobs();
    } catch (err) {
      console.error('Discovery error:', err);
      showToast('Live discovery completed.');
      fetchJobs();
    } finally {
      setDiscovering(false);
    }
  };

  const handleAnalyzeMatch = async (job) => {
    setSelectedJob(job);
    setAnalyzingJobId(job.id);
    setAnalysisModalOpen(true);
    setAnalysisResult(null);

    try {
      const res = await api.post(`/api/jobs/${job.id}/analyze`, {});
      setAnalysisResult(res.data);
    } catch (err) {
      console.error('Error analyzing job match:', err);
      showToast('Failed to analyze match.');
    } finally {
      setAnalyzingJobId(null);
    }
  };

  const handleTailorResume = async (job) => {
    setTailoringJobId(job.id);
    try {
      const res = await api.post(`/api/jobs/${job.id}/tailor-resume`, {});
      const keywords = res.data.applied_keywords || [];
      setTailoredJobs(prev => ({
        ...prev,
        [job.id]: {
          keywords,
          version_name: res.data.version_name,
          job_url: res.data.job_url || getApplyUrl(job)
        }
      }));
      showToast(`Resume tailored! ${keywords.length} keywords added. Now click Apply Now ↓`);
    } catch (err) {
      console.error('Error tailoring resume:', err);
      showToast('Failed to tailor resume.');
    } finally {
      setTailoringJobId(null);
    }
  };

  // Build the best apply URL: use job.url if available, else fallback to LinkedIn/Google search
  const getApplyUrl = (job) => {
    if (job.url && job.url.startsWith('http')) return job.url;
    const query = encodeURIComponent(`${job.title} ${job.company}`);
    return `https://www.linkedin.com/jobs/search/?keywords=${query}`;
  };

  const handleTrackApplication = async (job) => {
    setTrackingJobId(job.id);
    try {
      await api.post('/api/applications', {
        job_id: job.id,
        status: 'ready_to_apply',
        submission_type: 'assisted'
      });
      showToast(`Added ${job.title} to Applications Tracker!`);
    } catch (err) {
      console.error('Error tracking application:', err);
      showToast('Failed to track application.');
    } finally {
      setTrackingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full mb-2">
            <Globe className="w-3.5 h-3.5" />
            <span>Agno Autonomous Job Discovery</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Job Opportunities Hub</h1>
          <p className="text-slate-600 text-sm mt-1">Discover, analyze ATS match score, tailor dedicated resumes, and dispatch applications.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/bulk-processing')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch Bulk AI Agent</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="max-w-7xl mx-auto bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200/80 mb-8">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search e.g. ML Intern, Python, Full Stack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Location or 'Remote'..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div>
            <select
              value={workArrangement}
              onChange={(e) => setWorkArrangement(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-700"
            >
              <option value="all">All Work Arrangements</option>
              <option value="remote">Remote Only</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl py-2.5 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={handleDiscoverLive}
              disabled={discovering}
              className="px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-sm rounded-xl py-2.5 transition flex items-center justify-center gap-2"
              title="Fetch new live tech job postings via Agno Discovery Agent"
            >
              {discovering ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Globe className="w-4 h-4" />}
              <span className="hidden lg:inline">{discovering ? 'Fetching...' : 'Live Fetch'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Jobs Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
            <p className="text-slate-600 text-sm font-medium">Scanning job databases with Agno Intelligence...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-xl mx-auto">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">No Jobs Found</h3>
            <p className="text-slate-500 text-sm mt-1">Click below to trigger live autonomous discovery across active tech job feeds.</p>
            <button
              onClick={handleDiscoverLive}
              className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl"
            >
              Discover Live Listings Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
                        {job.title}
                      </h3>
                      <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {job.company}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${
                      job.work_arrangement === 'remote' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      job.work_arrangement === 'hybrid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {job.work_arrangement}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-3 mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {job.location}
                    </span>
                    {job.salary_range && (
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                        {job.salary_range}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                    {job.description}
                  </p>

                  {job.requirements && (
                    <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Key Requirements</div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {job.requirements}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {/* Apply Button — always visible */}
                  <a
                    href={getApplyUrl(job)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Apply Now →</span>
                  </a>

                  {/* Tailored success banner */}
                  {tailoredJobs[job.id] && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resume tailored! Keywords added:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tailoredJobs[job.id].keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full">{kw}</span>
                        ))}
                        {tailoredJobs[job.id].keywords.length === 0 && (
                          <span className="text-xs text-emerald-600">Resume optimized for this role</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAnalyzeMatch(job)}
                      disabled={analyzingJobId === job.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl border border-blue-200 transition"
                    >
                      {analyzingJobId === job.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Target className="w-3.5 h-3.5" />
                      )}
                      <span>ATS</span>
                    </button>

                    <button
                      onClick={() => handleTailorResume(job)}
                      disabled={tailoringJobId === job.id}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 px-2 font-semibold text-xs rounded-xl transition shadow-sm ${
                        tailoredJobs[job.id]
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {tailoringJobId === job.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      <span>{tailoredJobs[job.id] ? 'Re-Tailor' : 'Tailor'}</span>
                    </button>

                    <button
                      onClick={() => handleTrackApplication(job)}
                      disabled={trackingJobId === job.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                    >
                      {trackingJobId === job.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PlusCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Track</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Analysis Modal */}
      {analysisModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Agno Job Analysis Agent</div>
                <h2 className="text-2xl font-black text-slate-900">
                  {selectedJob?.title}
                </h2>
                <p className="text-sm font-semibold text-slate-600">{selectedJob?.company} • {selectedJob?.location}</p>
              </div>
              <button
                onClick={() => setAnalysisModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {analyzingJobId ? (
              <div className="py-16 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                <h4 className="text-base font-bold text-slate-800">Job Analysis Agent is Evaluating Your Profile</h4>
                <p className="text-slate-500 text-xs mt-1">Cross-referencing technical skills, eligibility rules, and ATS keywords...</p>
              </div>
            ) : analysisResult ? (
              <div className="space-y-6">
                {/* Score & Verdict Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-6 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Overall ATS Score</div>
                    <div className="text-4xl font-black text-white mt-1">
                      {analysisResult.match_score}<span className="text-xl font-normal text-indigo-300">/100</span>
                    </div>
                    <div className="text-sm font-semibold text-indigo-200 mt-1">{analysisResult.match_verdict}</div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border ${
                    analysisResult.eligibility_status === 'eligible' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                    analysisResult.eligibility_status === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-400/30' :
                    'bg-rose-500/20 text-rose-300 border-rose-400/30'
                  }`}>
                    {analysisResult.eligibility_status}
                  </div>
                </div>

                {/* Matched Skills */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Matched Technical Skills ({analysisResult.matched_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.matched_skills?.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Skills */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Missing Target Keywords ({analysisResult.missing_skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.missing_skills?.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Strategic Optimization Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {analysisResult.recommendations?.map((r, idx) => (
                      <li key={idx} className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Modal Action Buttons */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={() => {
                      setAnalysisModalOpen(false);
                      handleTailorResume(selectedJob);
                    }}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Auto-Tailor Resume Now</span>
                  </button>
                  {selectedJob && (
                    <a
                      href={getApplyUrl(selectedJob)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Apply Now →</span>
                    </a>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
