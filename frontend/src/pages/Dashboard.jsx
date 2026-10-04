import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Briefcase, Sparkles, Zap } from 'lucide-react';
import api from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ versions: 0 });

  useEffect(() => {
    api.get('/versions').then(res => setStats({ versions: res.data.length }));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Resume Versions</p>
            <p className="text-3xl font-bold text-gray-900">{stats.versions}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/editor" className="group p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-500 transition-all text-left block">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Edit Resume</h3>
          </div>
          <p className="text-sm text-gray-500">Update your core master resume information directly.</p>
        </Link>
        
        <Link to="/optimize-job" className="group p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-500 transition-all text-left block">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Optimize for Job</h3>
          </div>
          <p className="text-sm text-gray-500">Tailor your resume for a specific job description with AI.</p>
        </Link>
        
        <Link to="/quick-edit" className="group p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-blue-500 transition-all text-left block">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg group-hover:bg-yellow-600 group-hover:text-white transition-colors">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900">Quick Edit</h3>
          </div>
          <p className="text-sm text-gray-500">Use natural language to tell AI to make quick updates.</p>
        </Link>
      </div>
    </div>
  );
}
