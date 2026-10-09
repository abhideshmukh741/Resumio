import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Briefcase, 
  Sparkles, 
  Zap, 
  Search, 
  Layers, 
  CheckSquare, 
  Mail, 
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import api from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ 
    versions: 0,
    jobs: 0,
    applications: 0,
    coverLetters: 0
  });

  useEffect(() => {
    Promise.allSettled([
      api.get('/versions'),
      api.get('/api/jobs'),
      api.get('/api/applications'),
      api.get('/api/cover-letters')
    ]).then(([vRes, jRes, aRes, cRes]) => {
      setStats({
        versions: vRes.status === 'fulfilled' ? vRes.value.data.length : 0,
        jobs: jRes.status === 'fulfilled' ? jRes.value.data.length : 0,
        applications: aRes.status === 'fulfilled' ? aRes.value.data.length : 0,
        coverLetters: cRes.status === 'fulfilled' ? cRes.value.data.length : 0,
      });
    });
  }, []);

  return (
    <div className="p-6 md:p-10 font-sans max-w-7xl mx-auto space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold rounded-full mb-4">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>Powered by Agno Multi-Agent Intelligence</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
            AI-Powered Bulk Job Application Platform
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Discover matching job listings, generate ATS-tailored resumes and cover letters with autonomous agents, and track every application to interview stage.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/bulk-processing"
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch Bulk AI Run</span>
            </Link>
            <Link
              to="/jobs"
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Discover Jobs</span>
            </Link>
          </div>
        </div>
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Resume Versions</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.versions}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Available Jobs</p>
            <p className="text-3xl font-black text-indigo-950 mt-1">{stats.jobs}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Search className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Applications Tracked</p>
            <p className="text-3xl font-black text-emerald-950 mt-1">{stats.applications}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/90 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Cover Letters</p>
            <p className="text-3xl font-black text-purple-950 mt-1">{stats.coverLetters}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Mail className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Matrix */}
      <div>
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <span>AI & Career Studio Modules</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="/editor" className="group p-6 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-blue-500 hover:shadow-md transition-all text-left block">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Master Resume Editor</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Edit your master profile, select from 4 ATS templates, and export crisp single-page A4 PDFs.</p>
          </Link>

          <Link to="/jobs" className="group p-6 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-blue-500 hover:shadow-md transition-all text-left block">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Job Discovery & Match</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Search listings, calculate instant ATS match scores, and create tailored resumes with 1-click.</p>
          </Link>
          
          <Link to="/bulk-processing" className="group p-6 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-blue-500 hover:shadow-md transition-all text-left block">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Bulk AI Application Hub</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Run autonomous Agno multi-agent pipelines on batches of 10-50 jobs with live progress monitoring.</p>
          </Link>

          <Link to="/applications" className="group p-6 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-blue-500 hover:shadow-md transition-all text-left block">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Application Tracker</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Organize job pipeline stages from 'Ready to Apply' through 'Interviewing' and 'Offer Received'.</p>
          </Link>

          <Link to="/cover-letters" className="group p-6 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-blue-500 hover:shadow-md transition-all text-left block">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-pink-50 text-pink-600 rounded-xl group-hover:bg-pink-600 group-hover:text-white transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Cover Letters Studio</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Review, edit, copy to clipboard, and export individualized cover letters tailored to your target companies.</p>
          </Link>
          
          <Link to="/optimize-job" className="group p-6 bg-white rounded-2xl shadow-sm border border-slate-200/90 hover:border-blue-500 hover:shadow-md transition-all text-left block">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">Job ATS Optimizer</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">Paste any custom JD and optimize project bullets with Google XYZ formula and keyword injection.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
