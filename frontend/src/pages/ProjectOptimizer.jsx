import React, { useState } from 'react';
import api from '../lib/api';
import { Sparkles, Loader2, ArrowRight, Copy, Check } from 'lucide-react';

export default function ProjectOptimizer() {
  const [projectText, setProjectText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectText.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/ai/optimize-project', { project: projectText });
      setResult(res.data);
    } catch (err) {
      setError('Failed to optimize. Please try again.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (result?.improved) {
      navigator.clipboard.writeText(result.improved);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Optimizer</h1>
          <p className="text-sm text-gray-500">Let AI rewrite your project description to be more impactful and ATS-friendly</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Project Description</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 outline-none transition resize-none"
            rows="6"
            placeholder="Paste your project description here — e.g. 'Built a web app that tracks expenses using React and Node.js'"
            value={projectText}
            onChange={e => setProjectText(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-60 transition-colors shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Optimizing...' : 'Optimize Project'}
        </button>
      </form>

      {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {result && (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Original</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{result.original}</p>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-purple-400" />
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wide">AI-Improved</h3>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1 text-xs bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-800 font-medium leading-relaxed">{result.improved}</p>
          </div>
        </div>
      )}
    </div>
  );
}
