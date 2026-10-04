import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Loader2, CheckCircle, XCircle, ArrowRight, Lightbulb, Sparkles, Wand2, FileCheck } from 'lucide-react';

export default function KeywordOptimizer() {
  const navigate = useNavigate();
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState({});
  const [applying, setApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  useEffect(() => {
    api.get('/resume').then(res => setResumeData(res.data.data || {}));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetRole || !jobDescription) return;
    setLoading(true);
    setError('');
    setResult(null);
    setAppliedSuccess(false);
    try {
      const res = await api.post('/ai/optimize-job', {
        target_role: targetRole,
        job_description: jobDescription,
        resume_data: resumeData,
      });
      setResult(res.data);
    } catch (err) {
      setError('Failed to analyze. Please try again.');
    }
    setLoading(false);
  };

  const handleApplyToResume = async () => {
    if (!result) return;
    setApplying(true);

    const updated = { ...resumeData };

    // 1. Append missing keywords to technical skills
    if (result.missing_but_relevant?.length > 0) {
      const missingStr = result.missing_but_relevant.join(', ');
      if (Array.isArray(updated.technicalSkills)) {
        const toolsIndex = updated.technicalSkills.findIndex(s => s.category && s.category.toLowerCase().includes('tool'));
        if (toolsIndex >= 0) {
          const curr = updated.technicalSkills[toolsIndex].skills;
          updated.technicalSkills[toolsIndex].skills = curr ? `${curr}, ${missingStr}` : missingStr;
        } else {
          updated.technicalSkills.push({ id: `tools-${Date.now()}`, category: 'Tools & Platforms', skills: missingStr });
        }
      } else if (typeof updated.technicalSkills === 'object' && updated.technicalSkills !== null) {
        const currentTools = updated.technicalSkills.tools || '';
        updated.technicalSkills.tools = currentTools ? `${currentTools}, ${missingStr}` : missingStr;
      } else if (typeof updated.skills === 'string') {
        updated.skills = updated.skills ? `${updated.skills}, ${missingStr}` : missingStr;
      } else {
        updated.technicalSkills = [{ id: 'tools', category: 'Tools & Platforms', skills: missingStr }];
      }
    }

    // 2. Apply suggested rewrites to summary or projects/experience
    if (result.suggested_changes?.length > 0) {
      let summaryText = updated.summary || '';
      result.suggested_changes.forEach(change => {
        if (change.original && summaryText.includes(change.original)) {
          summaryText = summaryText.replace(change.original, change.suggested);
        } else if (change.suggested) {
          // Add to summary
          summaryText += ` ${change.suggested}`;
        }
      });
      updated.summary = summaryText;
    }

    try {
      // Save updated resume to Supabase
      await api.post('/resume', { data: updated });
      
      // Also save a version history snapshot
      await api.post('/versions', {
        version_name: `Optimized for ${targetRole}`,
        target_role: targetRole,
        resume_data: updated
      });

      setResumeData(updated);
      setAppliedSuccess(true);
    } catch (err) {
      console.error(err);
      setError('Failed to update resume automatically. Please try again.');
    }
    setApplying(false);
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center shadow-sm">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Job Keyword Optimizer</h1>
          <p className="text-xs sm:text-sm text-gray-500">Compare your resume against a job description and auto-apply missing keywords</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 mb-8 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Target Role / Job Title</label>
          <input
            type="text"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            placeholder="e.g., Software Engineer, Backend Developer, Data Analyst"
            value={targetRole}
            onChange={e => setTargetRole(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Job Description</label>
          <textarea
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition resize-none"
            rows="6"
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-60 transition shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
          {loading ? 'Analyzing Keywords...' : 'Analyze & Optimize'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 p-4 rounded-xl mb-6">{error}</p>}

      {result && (
        <div className="space-y-6">
          {/* AUTO-APPLY BANNER BUTTON */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-emerald-300" />
                Automatic Resume Update Ready
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                Instantly insert all {result.missing_but_relevant?.length || 0} missing keywords & AI rewrites into your resume!
              </p>
            </div>
            
            <button
              onClick={handleApplyToResume}
              disabled={applying || appliedSuccess}
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-white text-emerald-800 text-sm font-bold rounded-xl hover:bg-emerald-50 disabled:opacity-80 transition shadow-md"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> : <Sparkles className="w-4 h-4 text-emerald-600" />}
              {appliedSuccess ? '✅ Resume Updated!' : applying ? 'Updating Resume...' : 'Auto-Update My Resume'}
            </button>
          </div>

          {appliedSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FileCheck className="w-5 h-5 text-green-600" />
                Your resume has been updated and saved to Supabase!
              </div>
              <button
                onClick={() => navigate('/editor')}
                className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition"
              >
                Open in Editor →
              </button>
            </div>
          )}

          {/* Already Present */}
          {result.already_present?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-green-800 text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" /> Already in Your Resume ({result.already_present.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.already_present.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-white border border-green-300 text-green-800 rounded-full text-xs font-semibold">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing but Relevant */}
          {result.missing_but_relevant?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-red-800 text-sm mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" /> Missing Keywords ({result.missing_but_relevant.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.missing_but_relevant.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-white border border-red-300 text-red-700 rounded-full text-xs font-semibold">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Changes */}
          {result.suggested_changes?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-blue-900 text-sm mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-blue-600" /> Suggested AI Rewrites
              </h3>
              <div className="space-y-3">
                {result.suggested_changes.map((change, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border border-blue-200 space-y-2 shadow-sm">
                    {change.original && <p className="text-xs text-gray-400 line-through">{change.original}</p>}
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-800 font-semibold">{change.suggested}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
