import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Mail, 
  Copy, 
  Download, 
  Trash2, 
  Edit3, 
  Plus, 
  Sparkles, 
  Check, 
  Building, 
  Briefcase, 
  Calendar,
  Save,
  Printer
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function CoverLetters() {
  const [letters, setLetters] = useState([]);
  const [activeLetter, setActiveLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newCompany, setNewCompany] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/cover-letters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLetters(res.data || []);
      if (res.data?.length > 0) {
        selectLetter(res.data[0]);
      } else {
        setActiveLetter(null);
      }
    } catch (err) {
      console.error('Error fetching cover letters:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectLetter = (letter) => {
    setActiveLetter(letter);
    setEditTitle(letter.title);
    setEditContent(letter.content);
  };

  const handleSaveEdit = async () => {
    if (!activeLetter) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${API_BASE_URL}/api/cover-letters/${activeLetter.id}`,
        { title: editTitle, content: editContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast('Cover letter saved successfully!');
      setActiveLetter(res.data);
      // Update in list
      setLetters(letters.map(l => l.id === res.data.id ? res.data : l));
    } catch (err) {
      console.error('Error saving cover letter:', err);
      showToast('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cover letter?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/cover-letters/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Cover letter deleted.');
      const updated = letters.filter(l => l.id !== id);
      setLetters(updated);
      if (updated.length > 0) {
        selectLetter(updated[0]);
      } else {
        setActiveLetter(null);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete.');
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editContent);
    setCopied(true);
    showToast('Copied cover letter to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([editContent], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${(editTitle || 'Cover_Letter').replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${editTitle}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; color: #1e293b; max-width: 800px; margin: auto; }
            h1 { font-size: 20px; font-weight: bold; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 24px; }
            p { white-space: pre-wrap; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${editTitle}</h1>
          <p>${editContent.replace(/\n/g, '<br/>')}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full mb-2">
            <Mail className="w-3.5 h-3.5" />
            <span>Agno Cover Letter Studio</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cover Letters Studio</h1>
          <p className="text-slate-600 text-sm mt-1">
            Review, edit, and export tailored cover letters generated for your target roles.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Letter List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Saved Cover Letters ({letters.length})</span>
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500">Loading cover letters...</div>
            ) : letters.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No cover letters generated yet. Generate one from the Job Opportunities Hub or Bulk Engine!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {letters.map((letter) => (
                  <div
                    key={letter.id}
                    onClick={() => selectLetter(letter)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col gap-1 ${
                      activeLetter?.id === letter.id
                        ? 'bg-purple-50/70 border-purple-200 shadow-sm'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 line-clamp-1">{letter.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{letter.company}</span>
                      <span>•</span>
                      <span>{letter.target_role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Letter Editor */}
        <div className="lg:col-span-8">
          {activeLetter ? (
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-xl font-bold text-slate-900 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg px-2 py-1 bg-transparent hover:bg-slate-50"
                  />
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>Company: <strong className="text-slate-700">{activeLetter.company}</strong></span>
                    <span>Role: <strong className="text-slate-700">{activeLetter.target_role}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.txt</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>

                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(activeLetter.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition"
                    title="Delete cover letter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Letter Content Textarea */}
              <div>
                <textarea
                  rows="18"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white font-serif"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center h-full">
              <Mail className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Cover Letter Selected</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm">
                Select a letter from the left panel or generate one for any role in the Job Opportunities Hub.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
