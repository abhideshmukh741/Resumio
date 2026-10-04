import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Zap, Loader2, CheckCircle } from 'lucide-react';

export default function QuickEdit() {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    api.get('/resume').then(res => setResumeData(res.data.data));
  }, []);

  const examples = [
    'Make my professional summary 2 sentences shorter',
    'Convert all experience bullet points to start with action verbs',
    'Add communication skills to my skills section',
    'Make the tone more confident and assertive throughout',
    'Quantify any achievements that lack numbers',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!instruction.trim() || !resumeData) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/ai/quick-edit', {
        instruction,
        resume_data: resumeData,
      });
      const newData = res.data;
      await api.post('/resume', { data: newData });
      setResumeData(newData);
      setSuccess(`✅ Done! Applied: "${instruction}" — Changes saved.`);
      setInstruction('');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quick Edit</h1>
          <p className="text-sm text-gray-500">Tell the AI what to change in plain English. Changes are saved automatically.</p>
        </div>
      </div>

      {/* Example prompts */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Try these examples</p>
        <div className="flex flex-wrap gap-2">
          {examples.map(ex => (
            <button
              key={ex}
              onClick={() => setInstruction(ex)}
              className="px-3 py-1.5 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full hover:bg-yellow-100 transition-all font-medium"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your Instruction</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition resize-none"
            rows="4"
            placeholder="e.g., Make my summary more concise and impactful..."
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !resumeData}
          className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 text-white text-sm font-medium rounded-lg hover:bg-yellow-600 disabled:opacity-60 transition-colors shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Editing...' : 'Apply Change'}
        </button>
      </form>

      {success && (
        <div className="mt-6 flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{error}</div>
      )}
    </div>
  );
}
