import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { 
  Briefcase, Loader2, CheckCircle, XCircle, ArrowRight, 
  Lightbulb, Sparkles, Wand2, FileCheck, Target, Layers, Code, FileText
} from 'lucide-react';

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

    // 1. Apply Tailored Summary
    if (result.tailored_summary) {
      updated.summary = result.tailored_summary;
    }

    // 2. Apply Tailored Technical Skills
    if (result.tailored_technical_skills && Array.isArray(result.tailored_technical_skills) && result.tailored_technical_skills.length > 0) {
      updated.technicalSkills = result.tailored_technical_skills;
    } else if (result.optimized_technical_skills && Array.isArray(result.optimized_technical_skills)) {
      updated.technicalSkills = result.optimized_technical_skills;
    }

    // 3. Apply Tailored Projects
    if (result.tailored_projects && Array.isArray(result.tailored_projects) && result.tailored_projects.length > 0) {
      const currentProjects = Array.isArray(updated.projects) ? [...updated.projects] : [];
      result.tailored_projects.forEach((tp, idx) => {
        if (currentProjects[idx]) {
          currentProjects[idx] = {
            ...currentProjects[idx],
            title: tp.title || currentProjects[idx].title,
            technologies: tp.technologies || currentProjects[idx].technologies,
            bullets: tp.improved_bullets || tp.bullets || currentProjects[idx].bullets
          };
        } else {
          currentProjects.push({
            title: tp.title,
            technologies: tp.technologies || '',
            bullets: tp.improved_bullets || tp.bullets || []
          });
        }
      });
      updated.projects = currentProjects;
    }

    // 4. Apply Tailored Experience
    if (result.tailored_experience && Array.isArray(result.tailored_experience) && result.tailored_experience.length > 0) {
      const currentExp = Array.isArray(updated.experience) ? [...updated.experience] : [];
      result.tailored_experience.forEach((te, idx) => {
        if (currentExp[idx]) {
          currentExp[idx] = {
            ...currentExp[idx],
            role: te.role || currentExp[idx].role,
            company: te.company || currentExp[idx].company,
            duration: te.duration || currentExp[idx].duration,
            bullets: te.improved_bullets || te.bullets || currentExp[idx].bullets
          };
        }
      });
      updated.experience = currentExp;
    }

    try {
      // Save updated resume to Supabase
      await api.post('/resume', { data: updated });
      
      // Also save a version history snapshot
      await api.post('/versions', {
        version_name: `Tailored for ${targetRole}`,
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
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
          <Target className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ATS Resume & Job Tailor</h1>
          <p className="text-xs sm:text-sm text-gray-500">Tailor your summary, skills, and project bullet points to match any job description</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 mb-8 bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">Target Role / Job Title</label>
          <input
            type="text"
            className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            placeholder="e.g., Software Engineer, Machine Learning Engineer, Backend Developer"
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
            placeholder="Paste the target job description here..."
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Tailoring Resume to Job...' : 'Analyze & Tailor Resume'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 p-4 rounded-xl mb-6">{error}</p>}

      {result && (
        <div className="space-y-6">
          {/* ATS SCORE & ACTION BANNER */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 rounded-full text-xs font-bold uppercase tracking-wider">
                  {result.match_score || 85}% ATS Match Score
                </span>
                <span className="text-sm font-semibold text-emerald-100">
                  {result.match_verdict || `Optimized for ${targetRole}`}
                </span>
              </div>
              <h3 className="font-extrabold text-lg sm:text-xl">
                Ready to Tailor Your Resume
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl">
                Applies context-aware summary, cleanly structured technical skill categories, and enhanced project bullets directly into your resume.
              </p>
            </div>
            
            <button
              onClick={handleApplyToResume}
              disabled={applying || appliedSuccess}
              className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-emerald-900 text-sm font-extrabold rounded-xl hover:bg-emerald-50 disabled:opacity-80 transition shadow-lg"
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin text-emerald-700" /> : <Wand2 className="w-4 h-4 text-emerald-600" />}
              {appliedSuccess ? '✅ Resume Tailored & Saved!' : applying ? 'Applying Tailored Resume...' : 'Apply Tailored Resume'}
            </button>
          </div>

          {appliedSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-900 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold">
                <FileCheck className="w-5 h-5 text-green-600" />
                Your resume has been completely tailored and saved to Supabase!
              </div>
              <button
                onClick={() => navigate('/editor')}
                className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition shadow-xs"
              >
                Open in Editor →
              </button>
            </div>
          )}

          {/* KEY OPTIMIZATIONS */}
          {result.key_optimizations?.length > 0 && (
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs">
              <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Strategic Optimizations Included
              </h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-gray-700">
                {result.key_optimizations.map((opt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <span>{opt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* TAILORED SUMMARY COMPARISON */}
          {result.tailored_summary && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" /> Tailored Professional Summary
              </h4>
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-sm text-gray-800 leading-relaxed font-medium">
                {result.tailored_summary}
              </div>
            </div>
          )}

          {/* TAILORED TECHNICAL SKILLS BREAKDOWN */}
          {result.tailored_technical_skills?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-purple-600" /> Structured ATS Technical Skills ({result.tailored_technical_skills.length} Categories)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.tailored_technical_skills.map((cat, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1">
                    <div className="font-bold text-xs text-purple-900">{cat.category}</div>
                    <div className="text-xs text-gray-700 leading-relaxed">{cat.skills}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAILORED PROJECT BULLETS */}
          {result.tailored_projects?.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-gray-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" /> Enhanced Project Bullet Points (Natural Keyword Integration)
              </h4>
              <div className="space-y-4">
                {result.tailored_projects.map((proj, i) => (
                  <div key={i} className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-4 space-y-2">
                    <div className="font-bold text-sm text-indigo-950 flex items-center justify-between">
                      <span>{proj.title}</span>
                      {proj.technologies && (
                        <span className="text-xs font-normal text-indigo-700">{proj.technologies}</span>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-gray-800 list-disc list-inside">
                      {(proj.improved_bullets || proj.bullets || []).map((b, bIdx) => (
                        <li key={bIdx} className="leading-relaxed">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ALREADY PRESENT & MISSING KEYWORDS TAGS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.already_present?.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-xs">
                <h4 className="font-bold text-green-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" /> Matched Keywords ({result.already_present.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.already_present.map(k => (
                    <span key={k} className="px-2.5 py-0.5 bg-white border border-green-300 text-green-800 rounded-md text-xs font-medium">{k}</span>
                  ))}
                </div>
              </div>
            )}

            {result.missing_but_relevant?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
                <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Recommended Additions ({result.missing_but_relevant.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.missing_but_relevant.map(k => (
                    <span key={k} className="px-2.5 py-0.5 bg-white border border-amber-300 text-amber-900 rounded-md text-xs font-medium">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

