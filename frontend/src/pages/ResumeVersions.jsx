import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { History, Plus, Trash2, Download, RotateCcw, Loader2, FileText } from 'lucide-react';

export default function ResumeVersions() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const fetchVersions = () => {
    api.get('/versions').then(res => {
      setVersions(res.data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchVersions(); }, []);

  const handleSaveVersion = async (e) => {
    e.preventDefault();
    if (!versionName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const resumeRes = await api.get('/resume');
      const resumeData = resumeRes.data.data;
      await api.post('/versions', {
        version_name: versionName,
        target_role: targetRole,
        resume_data: resumeData,
      });
      setVersionName('');
      setTargetRole('');
      setShowForm(false);
      fetchVersions();
    } catch (err) {
      setError('Failed to save version.');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this version?')) return;
    await api.delete(`/versions/${id}`);
    fetchVersions();
  };

  const handleRestore = async (version) => {
    if (!window.confirm(`Restore "${version.version_name}" as your current resume?`)) return;
    await api.post('/resume', { data: version.resume_data });
    alert('Version restored! Go to the Editor to view it.');
  };

  const handleDownload = (version) => {
    const data = version.resume_data;
    const pi = data.personalInfo || {};
    const lines = [
      pi.name ? pi.name.toUpperCase() : 'YOUR NAME',
      [pi.email, pi.phone, pi.linkedin].filter(Boolean).join(' | '),
      '',
    ];
    if (data.summary) {
      lines.push('PROFESSIONAL SUMMARY');
      lines.push('─'.repeat(40));
      lines.push(data.summary);
      lines.push('');
    }
    if (data.skills) {
      lines.push('TECHNICAL SKILLS');
      lines.push('─'.repeat(40));
      lines.push(data.skills);
      lines.push('');
    }
    if (data.experience) {
      lines.push('EXPERIENCE');
      lines.push('─'.repeat(40));
      lines.push(data.experience);
      lines.push('');
    }
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${version.version_name.replace(/\s+/g, '_')}_resume.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCurrent = async () => {
    const res = await api.get('/resume');
    const data = res.data.data;
    const version = { version_name: 'current', resume_data: data };
    handleDownload(version);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Version History</h1>
            <p className="text-sm text-gray-500">Save snapshots, restore, and download any version</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadCurrent}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <Download className="w-4 h-4" />
            Download Current
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Save Version
          </button>
        </div>
      </div>

      {/* Save Version Form */}
      {showForm && (
        <form onSubmit={handleSaveVersion} className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Save Current Resume as a Version</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Version Name *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none transition"
                placeholder="e.g., Google Application v1"
                value={versionName}
                onChange={e => setVersionName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target Role</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none transition"
                placeholder="e.g., Senior Software Engineer"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Snapshot'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Version List */}
      {versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
          <FileText className="w-12 h-12" />
          <p className="text-sm text-gray-400">No saved versions yet.</p>
          <p className="text-xs text-gray-400">Click "Save Version" to create a snapshot of your current resume.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map(v => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-indigo-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{v.version_name}</h3>
                  {v.target_role && (
                    <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">{v.target_role}</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(v.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(v)}
                  title="Download as .txt"
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRestore(v)}
                  title="Restore this version"
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  title="Delete version"
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
