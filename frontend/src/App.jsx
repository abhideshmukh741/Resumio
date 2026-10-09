import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ResumeEditor from './pages/ResumeEditor';
import KeywordOptimizer from './pages/KeywordOptimizer';
import ProjectOptimizer from './pages/ProjectOptimizer';
import QuickEdit from './pages/QuickEdit';
import ResumeVersions from './pages/ResumeVersions';
import JobsDiscovery from './pages/JobsDiscovery';
import BulkProcessing from './pages/BulkProcessing';
import ApplicationsTracker from './pages/ApplicationsTracker';
import CoverLetters from './pages/CoverLetters';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="editor" element={<ResumeEditor />} />
          <Route path="jobs" element={<JobsDiscovery />} />
          <Route path="bulk-processing" element={<BulkProcessing />} />
          <Route path="applications" element={<ApplicationsTracker />} />
          <Route path="cover-letters" element={<CoverLetters />} />
          <Route path="optimize-job" element={<KeywordOptimizer />} />
          <Route path="optimize-project" element={<ProjectOptimizer />} />
          <Route path="quick-edit" element={<QuickEdit />} />
          <Route path="versions" element={<ResumeVersions />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
