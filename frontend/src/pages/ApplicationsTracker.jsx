import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckSquare, 
  Clock, 
  Send, 
  PhoneCall, 
  Award, 
  XCircle, 
  ExternalLink, 
  Trash2, 
  Sparkles, 
  FileText, 
  Mail, 
  Edit3, 
  Building, 
  MapPin,
  Calendar,
  Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const STATUS_STAGES = [
  { key: 'all', label: 'All Applications' },
  { key: 'ready_to_apply', label: 'Ready to Apply', color: 'bg-blue-100 text-blue-800' },
  { key: 'applied', label: 'Applied', color: 'bg-purple-100 text-purple-800' },
  { key: 'interviewing', label: 'Interviewing', color: 'bg-amber-100 text-amber-800' },
  { key: 'offered', label: 'Offered', color: 'bg-emerald-100 text-emerald-800' },
  { key: 'rejected', label: 'Archived / Rejected', color: 'bg-slate-200 text-slate-700' },
];

export default function ApplicationsTracker() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  // Edit Note Modal
  const [selectedApp, setSelectedApp] = useState(null);
  const [editStatus, setEditStatus] = useState('applied');
  const [editNotes, setEditNotes] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const res = await axios.get(`${API_BASE_URL}/api/applications`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(res.data || []);
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appId, newStatus, notes = null) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/applications/${appId}/status`,
        { status: newStatus, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Updated status to "${newStatus.replace(/_/g, ' ')}"`);
      fetchApplications();
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Failed to update status.');
    }
  };

  const handleDelete = async (appId) => {
    if (!window.confirm('Are you sure you want to remove this application?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/applications/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Application deleted.');
      fetchApplications();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete.');
    }
  };

  const openStatusModal = (app) => {
    setSelectedApp(app);
    setEditStatus(app.status);
    setEditNotes(app.notes || '');
    setModalOpen(true);
  };

  const saveStatusModal = async () => {
    if (!selectedApp) return;
    await handleUpdateStatus(selectedApp.id, editStatus, editNotes);
    setModalOpen(false);
  };

  // Stats calculation
  const totalApps = applications.length;
  const appliedCount = applications.filter(a => a.status === 'applied').length;
  const interviewingCount = applications.filter(a => a.status === 'interviewing').length;
  const offeredCount = applications.filter(a => a.status === 'offered').length;

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full mb-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Autonomous Application Pipeline</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Application Tracker</h1>
          <p className="text-slate-600 text-sm mt-1">Track interview stages, dispatch packages, and log confirmed career outcomes.</p>
        </div>

        <button
          onClick={() => navigate('/jobs')}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2"
        >
          <Layers className="w-4 h-4" />
          <span>Browse & Discover More Jobs</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tracked</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalApps}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-purple-600 uppercase tracking-wider">Applied</div>
            <div className="text-2xl font-black text-purple-900 mt-1">{appliedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Interviewing</div>
            <div className="text-2xl font-black text-amber-900 mt-1">{interviewingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Offers Received</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{offeredCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        {STATUS_STAGES.map((stage) => (
          <button
            key={stage.key}
            onClick={() => setActiveTab(stage.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === stage.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {stage.label}
          </button>
        ))}
      </div>

      {/* Application List */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Applications in this Stage</h3>
            <p className="text-slate-500 text-xs mt-1">
              Add jobs from the Job Opportunities Hub or launch a Bulk AI Run to populate your pipeline.
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
            >
              Browse Jobs Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-slate-900">
                      {app.job?.title || 'Target Role'}
                    </h3>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full capitalize ${
                      app.status === 'ready_to_apply' ? 'bg-blue-100 text-blue-800' :
                      app.status === 'applied' ? 'bg-purple-100 text-purple-800' :
                      app.status === 'interviewing' ? 'bg-amber-100 text-amber-800' :
                      app.status === 'offered' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {app.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {app.job?.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {app.job?.location}
                    </span>
                    {app.applied_at && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Applied: {new Date(app.applied_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {app.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                      <span className="font-semibold text-slate-700">Notes: </span>
                      {app.notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {app.job?.url && (
                    <a
                      href={app.job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-sm"
                    >
                      <span>Submit Application</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => openStatusModal(app)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Update Stage</span>
                  </button>

                  <button
                    onClick={() => handleDelete(app.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                    title="Delete tracking record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Stage Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 mb-1">
              Update Application Status
            </h3>
            <p className="text-xs text-slate-500 mb-4">{selectedApp?.job?.title} at {selectedApp?.job?.company}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Current Pipeline Stage
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="ready_to_apply">Ready to Apply</option>
                  <option value="applied">Applied / Submitted</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="offered">Offered</option>
                  <option value="rejected">Archived / Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Interview Notes / Next Steps
                </label>
                <textarea
                  rows="3"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Completed technical round 1 on Oct 12. Next: System design with VP of Engineering..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveStatusModal}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  Save Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
