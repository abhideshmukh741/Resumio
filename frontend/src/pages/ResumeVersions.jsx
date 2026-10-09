import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  History, Plus, Trash2, Download, Loader2, FileText, Edit3, CheckCircle2
} from 'lucide-react';

function buildResumeHTML(data) {
  const pi = data.personalInfo || {};
  const links = [pi.email, pi.phone, pi.linkedin, pi.github].filter(Boolean).join('  |  ');
  const skillsHTML = Array.isArray(data.technicalSkills)
    ? data.technicalSkills.map(s => '<div><strong>' + s.category + ':</strong> ' + s.skills + '</div>').join('')
    : '<div>' + (data.skills || '') + '</div>';
  const projectsHTML = Array.isArray(data.projects)
    ? data.projects.map(p => {
        const bullets = Array.isArray(p.bullets) ? p.bullets.map(b => '<li>' + b + '</li>').join('') : '';
        return '<div style="margin-bottom:8px"><strong>' + (p.title || '') + '</strong>' + (p.technologies ? ' <span style="color:#555">\u2014 ' + p.technologies + '</span>' : '') + '<ul style="margin:3px 0 0 16px;padding:0">' + bullets + '</ul></div>';
      }).join('')
    : '';
  const expHTML = Array.isArray(data.experience)
    ? data.experience.map(e => {
        const bullets = Array.isArray(e.responsibilities) ? e.responsibilities.map(b => '<li>' + b + '</li>').join('') : '';
        return '<div style="margin-bottom:8px"><strong>' + (e.role || e.title || '') + '</strong> at ' + (e.company || '') + ' <span style="color:#666;font-size:10px">(' + (e.duration || '') + ')</span><ul style="margin:3px 0 0 16px;padding:0">' + bullets + '</ul></div>';
      }).join('')
    : '';
  const eduHTML = Array.isArray(data.education)
    ? data.education.map(e => '<div><strong>' + (e.degree || '') + '</strong> \u2014 ' + (e.institution || '') + ' (' + (e.year || '') + ')</div>').join('')
    : '';
  const certHTML = Array.isArray(data.certifications)
    ? data.certifications.map(c => '<div>\u2022 ' + (typeof c === 'string' ? c : (c.name || '')) + '</div>').join('')
    : '';
  const section = (title, content) => content
    ? '<div style="margin-bottom:14px"><div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-bottom:1.5px solid #222;padding-bottom:2px;margin-bottom:6px">' + title + '</div><div style="font-size:10.5px;line-height:1.55">' + content + '</div></div>'
    : '';
  return '<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:28px;color:#111">'
    + '<div style="text-align:center;margin-bottom:16px">'
    + '<div style="font-size:18px;font-weight:700;letter-spacing:1px">' + (pi.name || 'YOUR NAME').toUpperCase() + '</div>'
    + '<div style="font-size:10px;color:#444;margin-top:3px">' + links + '</div></div>'
    + section('Professional Summary', data.summary || '')
    + section('Technical Skills', skillsHTML)
    + section('Projects', projectsHTML)
    + section('Experience', expHTML)
    + section('Education', eduHTML)
    + (certHTML ? section('Certifications', certHTML) : '')
    + '</div>';
}

async function downloadAsPDF(version) {
  const html2pdf = (await import('html2pdf.js')).default;
  const container = document.createElement('div');
  container.innerHTML = buildResumeHTML(version.resume_data);
  document.body.appendChild(container);
  const filename = (version.version_name || 'resume').replace(/[^a-z0-9]/gi, '_') + '.pdf';
  await html2pdf().set({
    margin: 0, filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(container).save();
  document.body.removeChild(container);
}

export default function ResumeVersions() {
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchVersions = () => {
    api.get('/versions').then(res => { setVersions(res.data); setLoading(false); });
  };

  useEffect(() => { fetchVersions(); }, []);

  const handleSaveVersion = async (e) => {
    e.preventDefault();
    if (!versionName.trim()) return;
    setSaving(true); setError('');
    try {
      const resumeRes = await api.get('/resume');
      await api.post('/versions', { version_name: versionName, target_role: targetRole, resume_data: resumeRes.data.data });
      setVersionName(''); setTargetRole(''); setShowForm(false);
      fetchVersions(); showToast('Version saved!');
    } catch { setError('Failed to save version.'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this version?')) return;
    await api.delete('/versions/' + id);
    fetchVersions(); showToast('Version deleted.', 'info');
  };

  const handleLoadInEditor = async (version) => {
    if (!window.confirm('Load "' + version.version_name + '" into the Resume Editor?\nYour current resume will be updated.')) return;
    setRestoringId(version.id);
    try {
      await api.post('/resume', { data: version.resume_data });
      showToast('Resume loaded! Redirecting to editor...');
      setTimeout(() => navigate('/editor'), 1200);
    } catch { showToast('Failed to load version.', 'error'); }
    finally { setRestoringId(null); }
  };

  const handleDownload = async (version) => {
    setDownloadingId(version.id);
    try { await downloadAsPDF(version); showToast('PDF downloaded!'); }
    catch (err) { console.error(err); showToast('PDF export failed.', 'error'); }
    finally { setDownloadingId(null); }
  };

  const handleDownloadCurrent = async () => {
    setDownloadingId('current');
    try {
      const res = await api.get('/resume');
      await downloadAsPDF({ version_name: 'My_Resume', resume_data: res.data.data });
      showToast('PDF downloaded!');
    } catch { showToast('PDF export failed.', 'error'); }
    finally { setDownloadingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {toast && (
        <div className={'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2 ' + (toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-slate-700' : 'bg-emerald-600')}>
          <CheckCircle2 className="w-4 h-4" />{toast.msg}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Version History</h1>
            <p className="text-sm text-gray-500">Save snapshots, load into editor, and download as PDF</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadCurrent} disabled={downloadingId === 'current'}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-60">
            {downloadingId === 'current' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Current PDF
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">
            <Plus className="w-4 h-4" />Save Version
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSaveVersion} className="mb-6 bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-gray-800 text-sm">Save Current Resume as a Version</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Version Name *</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="e.g., Google Application v1" value={versionName} onChange={e => setVersionName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target Role</label>
              <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="e.g., ML Engineer" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Snapshot'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          </div>
        </form>
      )}

      {versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <FileText className="w-12 h-12 text-gray-300" />
          <p className="text-sm text-gray-400">No saved versions yet.</p>
          <p className="text-xs text-gray-400">Tailor a resume from a job listing or click Save Version.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map(v => (
            <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-indigo-200 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 truncate">{v.version_name}</h3>
                  {v.target_role && <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full font-medium">{v.target_role}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(v.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 items-center">
                <button onClick={() => handleLoadInEditor(v)} disabled={restoringId === v.id}
                  title="Load into Resume Editor"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition">
                  {restoringId === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                  Load in Editor
                </button>
                <button onClick={() => handleDownload(v)} disabled={downloadingId === v.id}
                  title="Download as PDF"
                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                  {downloadingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                <button onClick={() => handleDelete(v.id)} title="Delete version"
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
