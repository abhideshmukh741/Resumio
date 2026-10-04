import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { 
  Bot, PencilLine, Send, Loader2, Sparkles, CheckCircle, 
  Printer, Download, Grid, Plus, Trash2, Layers, Eye, X, Check,
  ZoomIn, ZoomOut, RotateCcw, Upload, FileUp
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

// ─── AI Chat Message Component ───────────────────────────────────────────────
function ChatMessage({ msg }) {
  const isAI = msg.role === 'assistant';
  return (
    <div className={`flex gap-3 ${isAI ? 'items-start' : 'items-start flex-row-reverse'}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
        isAI ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : 'bg-blue-100 text-blue-700'
      }`}>
        {isAI ? <Bot className="w-4 h-4" /> : 'You'}
      </div>
      <div className={`max-w-[85%] sm:max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
        isAI
          ? 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-none'
          : 'bg-blue-600 text-white rounded-tr-none'
      }`}>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {msg.applied && (
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle className="w-3 h-3" /> Applied to resume
          </div>
        )}
      </div>
    </div>
  );
}

const DEFAULT_FRESHER_RESUME = {
  personalInfo: {
    name: 'Abhinav Deshmukh',
    phone: '+91 7448085615',
    email: 'abhideshmukh741@gmail.com',
    linkedin: 'LinkedIn',
    github: 'GitHub'
  },
  summary: "Final-year CSE student who got into tech by building things — started with AI/ML through YouTube and a friend's course, completed formal ML coursework, and kept going from there. Currently building AI/ML projects while working through DSA problem-solving. Comfortable across the stack, from building models to shipping a live web app, and looking for a place where I can keep building things that actually matter.",
  education: [
    {
      degree: 'Bachelor of Technology (B.Tech.) – Computer Science & Engineering',
      college: 'Maharashtra Institute of Technology, Chhatrapati Sambhajinagar',
      university: 'Dr. Babasaheb Ambedkar Technological University (BATU)',
      cgpa: '8.14 / 10',
      graduationYear: 'Expected Graduation: 2027'
    }
  ],
  technicalSkills: [
    { id: 'languages', category: 'Programming Languages', skills: 'C, Java, Python' },
    { id: 'webTech', category: 'Web Technologies', skills: 'HTML5, CSS, JavaScript, Node.js, Streamlit, Fast API' },
    { id: 'database', category: 'Database', skills: 'MySQL' },
    { id: 'problemSolving', category: 'Problem Solving', skills: 'Data Structures and Algorithms (DSA)' },
    { id: 'tools', category: 'Tools & Platforms', skills: 'Microsoft Office Suite, GitHub, VS Code, Antigravity' }
  ],
  projects: [
    {
      title: 'DuoAttend',
      technologies: 'Streamlit ,Supabase, dlib /face_recognition , Resemblyzer, Python',
      bullets: [
        'Face & voice based AI attendance',
        'Teacher & student login/registration',
        'Subject management with QR code sharing',
        'Attendance tracking & summaries'
      ]
    },
    {
      title: 'StyleForge',
      technologies: 'Python, Flask, PyTorch, VGG16, Pillow, NumPy',
      bullets: [
        'Upload a content image and a style image',
        'AI merges them using a pretrained VGG16 CNN to create stylized artwork',
        'Style intensity slider to control how much style is applied (0–100%)',
        'Real-time processing with PyTorch',
        'Download the generated image in high resolution'
      ]
    }
  ],
  certifications: [
    'Angela Yu – Full-Stack Web Development Bootcamp (Udemy)',
    'Abdul Bari – Mastering Data Structures & Algorithms (Udemy)'
  ],
  strengths: ['Team Collaboration', 'Analytical Thinking', 'Time Management', 'Problem-solving', 'Willingness to learn'],
  languages: 'English, Hindi, Marathi',
  hobbies: ['Car Enthusiast', 'Cooking', 'Walking'],
  experience: [],
  enabledSections: {
    summary: true,
    education: true,
    technicalSkills: true,
    projects: true,
    certifications: false,
    strengths: true,
    hobbies: false,
    experience: false
  },
  customSections: [
    {
      id: 'custom-1',
      title: 'Academic Achievements',
      content: '• Top 5% in National Coding Olympiad 2025\n• Winner of University TechFest Project Expo'
    }
  ]
};

const normalizeSkillsList = (skillsData) => {
  if (!skillsData) return [];
  if (Array.isArray(skillsData)) return skillsData;
  const categoryMap = {
    languages: 'Programming Languages',
    webTech: 'Web Technologies',
    database: 'Database',
    problemSolving: 'Problem Solving',
    tools: 'Tools & Platforms'
  };
  return Object.entries(skillsData).map(([key, val]) => ({
    id: key,
    category: categoryMap[key] || key,
    skills: typeof val === 'string' ? val : (Array.isArray(val) ? val.join(', ') : '')
  }));
};

export default function ResumeEditor() {
  const [resume, setResume] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('manual');
  const [mobileView, setMobileView] = useState('edit');
  const [template, setTemplate] = useState('fresher');
  const [zoom, setZoom] = useState(0.85);
  const [customHtmlTemplate, setCustomHtmlTemplate] = useState('');

  // Core Reactive Data State
  const [personalInfo, setPersonalInfo] = useState(DEFAULT_FRESHER_RESUME.personalInfo);
  const [summary, setSummary] = useState(DEFAULT_FRESHER_RESUME.summary);
  const [education, setEducation] = useState(DEFAULT_FRESHER_RESUME.education);
  const [technicalSkills, setTechnicalSkills] = useState(normalizeSkillsList(DEFAULT_FRESHER_RESUME.technicalSkills));
  const [projects, setProjects] = useState(DEFAULT_FRESHER_RESUME.projects);
  const [experience, setExperience] = useState(DEFAULT_FRESHER_RESUME.experience || []);
  const [certifications, setCertifications] = useState(DEFAULT_FRESHER_RESUME.certifications);
  const [strengths, setStrengths] = useState(DEFAULT_FRESHER_RESUME.strengths);
  const [languages, setLanguages] = useState(DEFAULT_FRESHER_RESUME.languages);
  const [hobbies, setHobbies] = useState(DEFAULT_FRESHER_RESUME.hobbies);
  const [enabledSections, setEnabledSections] = useState(DEFAULT_FRESHER_RESUME.enabledSections);
  const [customSections, setCustomSections] = useState(DEFAULT_FRESHER_RESUME.customSections || []);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [organizingSkills, setOrganizingSkills] = useState(false);
  const [parsingHtml, setParsingHtml] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 640) {
      setZoom(0.48);
    } else if (window.innerWidth < 1024) {
      setZoom(0.65);
    }
  }, []);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: '🎓 Hi! I\'m your AI Resume Assistant. Tell me what to edit — for example:\n\n• "Make my summary more impactful"\n• "Add React and Node.js to my skills"\n• "Remove the Hobbies section"' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    api.get('/resume').then(res => {
      const data = res.data.data;
      if (data && Object.keys(data).length > 0) {
        setResume(data);
        if (data.personalInfo) setPersonalInfo(data.personalInfo);
        if (data.summary !== undefined) setSummary(data.summary);
        if (data.education) setEducation(data.education);
        if (data.technicalSkills) setTechnicalSkills(normalizeSkillsList(data.technicalSkills));
        if (data.projects) setProjects(data.projects);
        if (data.experience) setExperience(data.experience);
        if (data.certifications) setCertifications(data.certifications);
        if (data.strengths) setStrengths(data.strengths);
        if (data.languages) setLanguages(data.languages);
        if (data.hobbies) setHobbies(data.hobbies);
        if (data.enabledSections) setEnabledSections(data.enabledSections);
        if (data.customSections) setCustomSections(data.customSections);
      } else {
        setResume(DEFAULT_FRESHER_RESUME);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const currentResumeData = () => ({
    ...resume,
    personalInfo,
    summary,
    education,
    technicalSkills,
    projects,
    experience,
    certifications,
    strengths,
    languages,
    hobbies,
    enabledSections,
    customSections
  });

  const handleSave = async () => {
    setSaving(true);
    const updated = currentResumeData();
    try {
      await api.post('/resume', { data: updated });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const toggleSection = (key) => {
    setEnabledSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Sub-section item management
  const handleAddEducation = () => {
    setEducation([
      ...(education || []),
      { degree: '', college: '', university: '', cgpa: '', graduationYear: '' }
    ]);
  };

  const handleRemoveEducation = (idx) => {
    setEducation((education || []).filter((_, i) => i !== idx));
  };

  const handleAddProject = () => {
    setProjects([
      ...(projects || []),
      { title: '', technologies: '', bullets: [''] }
    ]);
  };

  const handleRemoveProject = (idx) => {
    setProjects((projects || []).filter((_, i) => i !== idx));
  };

  const handleAddExperience = () => {
    setExperience([
      ...(experience || []),
      { company: '', role: '', duration: '', bullets: [''] }
    ]);
  };

  const handleRemoveExperience = (idx) => {
    setExperience((experience || []).filter((_, i) => i !== idx));
  };

  const handleAddSkillCategory = () => {
    const newCat = {
      id: `skill-${Date.now()}`,
      category: 'New Skill Category',
      skills: 'Skill 1, Skill 2'
    };
    setTechnicalSkills([
      ...(Array.isArray(technicalSkills) ? technicalSkills : normalizeSkillsList(technicalSkills)),
      newCat
    ]);
  };

  const handleRemoveSkillCategory = (idx) => {
    const currentList = Array.isArray(technicalSkills) ? technicalSkills : normalizeSkillsList(technicalSkills);
    setTechnicalSkills(currentList.filter((_, i) => i !== idx));
  };

  const handleUpdateSkillCategory = (idx, field, value) => {
    const currentList = Array.isArray(technicalSkills) ? technicalSkills : normalizeSkillsList(technicalSkills);
    setTechnicalSkills(currentList.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleOrganizeSkills = async () => {
    setOrganizingSkills(true);
    const currentList = Array.isArray(technicalSkills) ? technicalSkills : normalizeSkillsList(technicalSkills);

    try {
      const res = await api.post('/ai/organize-skills', { technical_skills: currentList });
      if (res.data?.organized_skills && Array.isArray(res.data.organized_skills) && res.data.organized_skills.length > 0) {
        setTechnicalSkills(res.data.organized_skills);
        setOrganizingSkills(false);
        return;
      }
    } catch (err) {
      console.warn('AI organize skills endpoint error, using smart fallback', err);
    }

    // Smart client-side fallback
    const allSkills = [];
    currentList.forEach(c => {
      if (c.skills) {
        c.skills.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed && !allSkills.some(x => x.toLowerCase() === trimmed.toLowerCase())) {
            allSkills.push(trimmed);
          }
        });
      }
    });

    const groups = {
      'Programming Languages': [],
      'Web Technologies & Frameworks': [],
      'Machine Learning & AI': [],
      'Databases': [],
      'Cloud & DevOps': [],
      'Tools & Platforms': []
    };

    allSkills.forEach(skill => {
      const s = skill.toLowerCase();
      if (/^(c|c\+\+|java|python|javascript|typescript|golang|go|rust|ruby|php|kotlin|swift|r|scala)$/i.test(s)) {
        groups['Programming Languages'].push(skill);
      } else if (/html|css|react|node|express|flask|django|fastapi|streamlit|angular|vue|next\.js|tailwind|rest|api|graphql|redux/i.test(s)) {
        groups['Web Technologies & Frameworks'].push(skill);
      } else if (/machine learning|deep learning|ml|nlp|computer vision|tensorflow|pytorch|scikit|pandas|numpy|llm|generative ai|data preprocessing|feature engineering|model evaluation|statistics|mlflow|bert|keras|opencv/i.test(s)) {
        groups['Machine Learning & AI'].push(skill);
      } else if (/sql|mysql|postgres|postgresql|mongodb|redis|supabase|firebase|sqlite|oracle|cassandra|dynamodb/i.test(s)) {
        groups['Databases'].push(skill);
      } else if (/docker|kubernetes|aws|gcp|azure|ci\/cd|devops|cloud|terraform|jenkins|linux|deployment/i.test(s)) {
        groups['Cloud & DevOps'].push(skill);
      } else {
        groups['Tools & Platforms'].push(skill);
      }
    });

    const formatted = Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([cat, items], idx) => ({
        id: `cat-${idx + 1}`,
        category: cat,
        skills: items.join(', ')
      }));

    if (formatted.length > 0) {
      setTechnicalSkills(formatted);
    }
    setOrganizingSkills(false);
  };

  const handleAddCustomSection = () => {
    const newSec = {
      id: `custom-${Date.now()}`,
      title: 'New Custom Section',
      content: '• Add details here'
    };
    setCustomSections([...(customSections || []), newSec]);
  };

  const handleRemoveCustomSection = (id) => {
    setCustomSections((customSections || []).filter(s => s.id !== id));
  };

  const handleUpdateCustomSection = (id, key, value) => {
    setCustomSections((customSections || []).map(s => s.id === id ? { ...s, [key]: value } : s));
  };

  const handleAISubmit = async (e) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMsg = { role: 'user', content: aiInput };
    setMessages(prev => [...prev, userMsg]);
    const instruction = aiInput;
    setAiInput('');
    setAiLoading(true);

    try {
      const updated = await api.post('/ai/quick-edit', {
        instruction,
        resume_data: currentResumeData(),
      });

      const newData = updated.data;

      if (newData.personalInfo) setPersonalInfo(newData.personalInfo);
      if (newData.summary !== undefined) setSummary(newData.summary);
      if (newData.education) setEducation(newData.education);
      if (newData.technicalSkills) setTechnicalSkills(newData.technicalSkills);
      if (newData.projects) setProjects(newData.projects);
      if (newData.certifications) setCertifications(newData.certifications);
      if (newData.strengths) setStrengths(newData.strengths);
      if (newData.languages !== undefined) setLanguages(newData.languages);
      if (newData.hobbies) setHobbies(newData.hobbies);
      if (newData.enabledSections) setEnabledSections(newData.enabledSections);
      if (newData.customSections) setCustomSections(newData.customSections);

      setResume(newData);
      await api.post('/resume', { data: newData });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ Done! Updated resume: "${instruction}"`,
        applied: true,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, something went wrong. Please try again.',
      }]);
    }
    setAiLoading(false);
  };

  const handleDownloadPdf = async () => {
    const previewEl = document.getElementById('resume-preview');
    if (!previewEl) return;

    try {
      setIsExportingPdf(true);
      const filename = `${(personalInfo.name || 'Resume').trim().replace(/\s+/g, '_')}_Resume.pdf`;

      const opt = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      await html2pdf().set(opt).from(previewEl).save();
    } catch (err) {
      console.error('Error exporting PDF:', err);
      // Fallback to print
      handlePrint();
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const previewEl = document.getElementById('resume-preview');
    if (!previewEl) {
      window.print();
      return;
    }

    // Clean up any existing print iframe
    const oldIframe = document.getElementById('resume-print-frame');
    if (oldIframe && oldIframe.parentNode) {
      try { oldIframe.parentNode.removeChild(oldIframe); } catch(e) {}
    }

    // Create a temporary hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.id = 'resume-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;

    // Collect all stylesheets & font links from main document
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(s => s.outerHTML)
      .join('\n');

    const title = `${(personalInfo.name || 'Resume').trim().replace(/\s+/g, '_')}_Resume`;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    ${styles}
    <style>
      @page {
        size: A4;
        margin: 0;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        width: 100% !important;
        height: auto !important;
        display: block !important;
        visibility: visible !important;
      }
      #print-wrapper {
        width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        box-sizing: border-box !important;
        display: block !important;
        visibility: visible !important;
      }
      #resume-preview {
        box-shadow: none !important;
        border: none !important;
        margin: 0 auto !important;
        transform: none !important;
        width: 210mm !important;
        min-width: 210mm !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        display: block !important;
        visibility: visible !important;
        background: #ffffff !important;
      }
      #resume-preview * {
        visibility: visible !important;
      }
    </style>
  </head>
  <body>
    <div id="print-wrapper">
      ${previewEl.outerHTML}
    </div>
  </body>
</html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.print();
      }
      setTimeout(() => {
        try {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        } catch(e) {}
      }, 60000);
    }, 500);
  };

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.4));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.35));
  const resetZoom = () => setZoom(window.innerWidth < 640 ? 0.48 : 0.85);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target.result;
        setCustomHtmlTemplate(content);
        setTemplate('custom');
      };
      reader.readAsText(file);
    }
  };

  const handleParseUploadedHtml = async () => {
    if (!customHtmlTemplate) return;
    try {
      setParsingHtml(true);
      const res = await api.post('/ai/parse-resume', { content: customHtmlTemplate });
      const data = res.data;
      if (data) {
        if (data.personalInfo) setPersonalInfo(data.personalInfo);
        if (data.summary) setSummary(data.summary);
        if (data.education?.length) setEducation(data.education);
        if (data.technicalSkills?.length) setTechnicalSkills(data.technicalSkills);
        if (data.projects?.length) setProjects(data.projects);
        if (data.experience?.length) setExperience(data.experience);
        if (data.certifications?.length) setCertifications(data.certifications);
        if (data.strengths) setStrengths(data.strengths);
        if (data.languages) setLanguages(data.languages);
        if (data.customSections?.length) setCustomSections(data.customSections);
        setParseSuccess(true);
        setTimeout(() => setParseSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Error parsing HTML resume with AI:', err);
    } finally {
      setParsingHtml(false);
    }
  };

  const downloadSampleTemplate = () => {
    const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{{name}} - Resume</title>
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      color: #111827;
      line-height: 1.45;
      padding: 24px;
      font-size: 13px;
    }
    .header { text-align: center; margin-bottom: 12px; }
    .name { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
    .contact-info { font-size: 12px; color: #374151; }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #4b5563;
      padding-bottom: 2px;
      margin: 14px 0 6px 0;
      color: #111827;
    }
    .edu-item, .proj-item, .exp-item { margin-bottom: 8px; }
    .item-header { font-weight: bold; }
    .item-sub { font-style: italic; color: #374151; }
    ul { margin: 4px 0 0 16px; padding: 0; }
    li { margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">{{name}}</div>
    <div class="contact-info">{{phone}} &bull; {{email}} &bull; {{linkedin}} &bull; {{github}}</div>
  </div>

  <div class="section-title">Professional Summary</div>
  <p>{{summary}}</p>

  <div class="section-title">Education</div>
  {{education}}

  <div class="section-title">Technical Skills</div>
  {{skills}}

  <div class="section-title">Projects</div>
  {{projects}}

  <div class="section-title">Academic Achievements</div>
  {{academicAchievements}}

  <div class="section-title">Strengths</div>
  <p>{{strengths}}</p>

  <div class="section-title">Languages</div>
  <p>{{languages}}</p>
</body>
</html>`;

    const blob = new Blob([sampleHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_resume_template.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const populateCustomTemplate = (html) => {
    if (!html) return '';
    let populated = html;

    // Replace Personal Info
    populated = populated.replace(/{{name}}/gi, personalInfo.name || '');
    populated = populated.replace(/{{email}}/gi, personalInfo.email || '');
    populated = populated.replace(/{{phone}}/gi, personalInfo.phone || '');
    populated = populated.replace(/{{linkedin}}/gi, personalInfo.linkedin || '');
    populated = populated.replace(/{{github}}/gi, personalInfo.github || '');

    // Replace Summary
    populated = populated.replace(/{{summary}}/gi, enabledSections.summary ? (summary || '') : '');

    // Replace Skills
    const skillsList = Array.isArray(technicalSkills) ? technicalSkills : normalizeSkillsList(technicalSkills);
    
    // 1. Full skills block
    let skillsHtml = '';
    if (enabledSections.technicalSkills && skillsList.length > 0) {
      skillsHtml = '<div class="custom-skills-list" style="display: flex; flex-direction: column; gap: 4px;">';
      skillsList.forEach(sk => {
        skillsHtml += `<div class="skill-category-row" style="margin-bottom: 2px;">
          <strong class="skill-cat-title" style="font-weight: 700;">${sk.category}:</strong> <span class="skill-cat-items">${sk.skills}</span>
        </div>`;
      });
      skillsHtml += '</div>';
    }
    populated = populated.replace(/{{skills}}/gi, skillsHtml);
    populated = populated.replace(/{{technicalSkills}}/gi, skillsHtml);

    // 2. Individual skill categories
    skillsList.forEach(sk => {
      const catKey = (sk.category || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const val = sk.skills || '';
      populated = populated.replace(new RegExp(`{{skills\\.${sk.category}}}`, 'gi'), val);
      if (catKey.includes('prog') || catKey.includes('lang')) {
        populated = populated.replace(/{{skills\.languages}}/gi, val);
      }
      if (catKey.includes('web')) {
        populated = populated.replace(/{{skills\.webTech}}/gi, val);
      }
      if (catKey.includes('data') && !catKey.includes('struct')) {
        populated = populated.replace(/{{skills\.database}}/gi, val);
      }
      if (catKey.includes('tool')) {
        populated = populated.replace(/{{skills\.tools}}/gi, val);
      }
      if (catKey.includes('problem') || catKey.includes('dsa')) {
        populated = populated.replace(/{{skills\.problemSolving}}/gi, val);
      }
    });

    // Create Education HTML
    let eduHtml = '';
    if (enabledSections.education && education && education.length > 0) {
      education.forEach(edu => {
        eduHtml += `<div class="edu-item" style="margin-bottom: 8px;">
          <div class="edu-degree" style="font-weight: 700;">${edu.degree || ''}</div>
          <div class="edu-college" style="font-style: italic;">${edu.college || ''}</div>
          ${edu.university ? `<div class="edu-uni" style="font-style: italic;">${edu.university}</div>` : ''}
          <div class="edu-meta" style="font-size: 12px; font-weight: 600; margin-top: 2px;">
            ${edu.cgpa ? 'CGPA: ' + edu.cgpa : ''} ${edu.cgpa && edu.graduationYear ? '—' : ''} ${edu.graduationYear || ''}
          </div>
        </div>`;
      });
    }
    populated = populated.replace(/{{education}}/gi, eduHtml);

    // Create Projects HTML
    let projHtml = '';
    if (enabledSections.projects && projects && projects.length > 0) {
      projects.forEach(proj => {
        let bulletsHtml = '';
        if (proj.bullets && proj.bullets.length > 0) {
          bulletsHtml = '<ul style="margin: 4px 0 0 16px; padding: 0; list-style-type: disc;">' + 
            proj.bullets.map(b => b.trim() ? `<li style="margin-bottom: 2px;">${b}</li>` : '').join('') + 
            '</ul>';
        }
        projHtml += `<div class="proj-item" style="margin-bottom: 12px;">
          <div class="proj-title" style="font-weight: 700;">${proj.title || ''}</div>
          ${proj.technologies ? `<div class="proj-tech" style="font-style: italic; font-size: 12px; color: #4b5563;">Technologies: ${proj.technologies}</div>` : ''}
          <div class="proj-bullets">${bulletsHtml}</div>
        </div>`;
      });
    }
    populated = populated.replace(/{{projects}}/gi, projHtml);

    // Create Experience HTML
    let expHtml = '';
    if (enabledSections.experience && experience && experience.length > 0) {
      experience.forEach(exp => {
        let expBulletsHtml = '';
        if (exp.bullets && exp.bullets.length > 0) {
          expBulletsHtml = '<ul style="margin: 4px 0 0 16px; padding: 0; list-style-type: disc;">' +
            exp.bullets.map(b => b.trim() ? `<li style="margin-bottom: 2px;">${b}</li>` : '').join('') + 
            '</ul>';
        }
        expHtml += `<div class="exp-item" style="margin-bottom: 12px;">
          <div class="exp-role" style="font-weight: 700; display: flex; justify-content: space-between;">
            <span>${exp.role || ''} ${exp.company ? '— ' + exp.company : ''}</span>
            <span style="font-weight: normal; font-size: 12px;">${exp.duration || ''}</span>
          </div>
          <div class="exp-bullets">${expBulletsHtml}</div>
        </div>`;
      });
    }
    populated = populated.replace(/{{experience}}/gi, expHtml);

    // Custom Sections
    let customHtml = '';
    if (customSections && customSections.length > 0) {
      customSections.forEach(sec => {
        customHtml += `<div class="custom-section" style="margin-bottom: 12px;">
          <h3 class="custom-title" style="font-weight: 700; border-bottom: 1px solid #9ca3af; margin-bottom: 4px;">${sec.title || ''}</h3>
          <div class="custom-content" style="white-space: pre-wrap;">${sec.content || ''}</div>
        </div>`;
      });
    }
    populated = populated.replace(/{{customSections}}/gi, customHtml);
    populated = populated.replace(/{{academicAchievements}}/gi, customSections?.[0]?.content || '');

    // Certifications, Strengths, Languages
    populated = populated.replace(/{{certifications}}/gi, (certifications || []).join(', '));
    populated = populated.replace(/{{strengths}}/gi, Array.isArray(strengths) ? strengths.join(' — ') : (strengths || ''));
    populated = populated.replace(/{{languages}}/gi, languages || '');

    return populated;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm">Loading your resume...</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col font-sans">
      {/* Top Mobile View Toggle + Tab Bar */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-3 pb-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'manual'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <PencilLine className="w-4 h-4" />
            Fresher Editor
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'ai'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Assistant
          </button>
        </div>

        {/* Mobile View Toggle Switcher */}
        <div className="lg:hidden ml-auto flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setMobileView('edit')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition ${
              mobileView === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            <PencilLine className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={() => setMobileView('preview')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition ${
              mobileView === 'preview' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>

        {/* Save Button */}
        <div className="hidden sm:flex ml-auto items-center gap-3">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Saving...' : 'Save Resume'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Form Panel */}
        <div className={`w-full lg:w-1/2 border-r border-gray-200 bg-white flex flex-col overflow-hidden ${
          mobileView === 'preview' ? 'hidden lg:flex' : 'flex'
        }`}>
          {activeTab === 'manual' && (
            <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Section Manager Toggle Toolbar */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Toggle / Delete Sections
                  </h3>
                  <button
                    onClick={handleAddCustomSection}
                    className="text-xs bg-white text-purple-700 px-2.5 py-1 rounded-md border border-purple-200 font-bold hover:bg-purple-50 transition"
                  >
                    + Add Custom
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'summary', label: 'Objective / Summary' },
                    { key: 'education', label: 'Education' },
                    { key: 'technicalSkills', label: 'Skills' },
                    { key: 'projects', label: 'Projects' },
                    { key: 'certifications', label: 'Certifications' },
                    { key: 'strengths', label: 'Strengths' },
                    { key: 'hobbies', label: 'Hobbies' },
                    { key: 'experience', label: 'Experience' },
                  ].map(sec => (
                    <button
                      key={sec.key}
                      onClick={() => toggleSection(sec.key)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
                        enabledSections[sec.key]
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-400 border-gray-300 line-through hover:bg-gray-100'
                      }`}
                    >
                      {enabledSections[sec.key] ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      {sec.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Info */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="font-bold text-xs uppercase tracking-wider text-gray-600">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={personalInfo.name || ''}
                      onChange={e => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Phone</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={personalInfo.phone || ''}
                      onChange={e => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Email</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={personalInfo.email || ''}
                      onChange={e => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">LinkedIn</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={personalInfo.linkedin || ''}
                      onChange={e => setPersonalInfo({ ...personalInfo, linkedin: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1 font-medium">GitHub / Portfolio</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      value={personalInfo.github || ''}
                      onChange={e => setPersonalInfo({ ...personalInfo, github: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Summary */}
              {enabledSections.summary && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Career Objective / Summary</label>
                    <button onClick={() => toggleSection('summary')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    rows="3"
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                  />
                </div>
              )}

              {/* Education */}
              {enabledSections.education && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-600">Education Details</label>
                    <button onClick={() => toggleSection('education')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Section
                    </button>
                  </div>
                  {(education || []).map((edu, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2 relative">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">Education #{idx + 1}</span>
                        {(education || []).length > 1 && (
                          <button
                            onClick={() => handleRemoveEducation(idx)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Degree & Branch</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          value={edu.degree || ''}
                          onChange={e => {
                            const copy = [...education];
                            copy[idx].degree = e.target.value;
                            setEducation(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">Institute / College</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          value={edu.college || ''}
                          onChange={e => {
                            const copy = [...education];
                            copy[idx].college = e.target.value;
                            setEducation(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-medium">University</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          value={edu.university || ''}
                          onChange={e => {
                            const copy = [...education];
                            copy[idx].university = e.target.value;
                            setEducation(copy);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-medium">CGPA / Marks</label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                            value={edu.cgpa || ''}
                            onChange={e => {
                              const copy = [...education];
                              copy[idx].cgpa = e.target.value;
                              setEducation(copy);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1 font-medium">Graduation Year</label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                            value={edu.graduationYear || ''}
                            onChange={e => {
                              const copy = [...education];
                              copy[idx].graduationYear = e.target.value;
                              setEducation(copy);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddEducation}
                    className="w-full py-2 border border-dashed border-blue-400 text-blue-600 font-semibold text-xs rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Education Entry
                  </button>
                </div>
              )}

              {/* Work Experience */}
              {enabledSections.experience && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-600">Work Experience</h3>
                    <button onClick={() => toggleSection('experience')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Section
                    </button>
                  </div>
                  {(experience || []).map((exp, expIdx) => (
                    <div key={expIdx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">Experience #{expIdx + 1}</span>
                        <button
                          onClick={() => handleRemoveExperience(expIdx)}
                          className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Company / Organization</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          value={exp.company || ''}
                          onChange={e => {
                            const copy = [...(experience || [])];
                            copy[expIdx].company = e.target.value;
                            setExperience(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Job Title / Role</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-semibold"
                          value={exp.role || ''}
                          onChange={e => {
                            const copy = [...(experience || [])];
                            copy[expIdx].role = e.target.value;
                            setExperience(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Duration (e.g. Jun 2024 - Present)</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          value={exp.duration || ''}
                          onChange={e => {
                            const copy = [...(experience || [])];
                            copy[expIdx].duration = e.target.value;
                            setExperience(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Bullet Points (one per line)</label>
                        <textarea
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          rows="3"
                          value={(exp.bullets || []).join('\n')}
                          onChange={e => {
                            const copy = [...(experience || [])];
                            copy[expIdx].bullets = e.target.value.split('\n');
                            setExperience(copy);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddExperience}
                    className="w-full py-2 border border-dashed border-blue-400 text-blue-600 font-semibold text-xs rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Experience Entry
                  </button>
                </div>
              )}

              {/* Technical Skills */}
              {enabledSections.technicalSkills && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-gray-600">Technical Skills</h3>
                      <button
                        type="button"
                        onClick={handleOrganizeSkills}
                        disabled={organizingSkills}
                        className="flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md transition shadow-xs"
                        title="AI will categorize, clean up duplicates, and format all skills into standard ATS categories"
                      >
                        {organizingSkills ? (
                          <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-purple-600" />
                        )}
                        <span>{organizingSkills ? 'Organizing...' : '✨ AI Clean & Organize'}</span>
                      </button>
                    </div>
                    <button onClick={() => toggleSection('technicalSkills')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Section
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(Array.isArray(technicalSkills) ? technicalSkills : normalizeSkillsList(technicalSkills)).map((sk, skIdx) => (
                      <div key={sk.id || skIdx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            className="font-bold text-xs text-blue-900 bg-gray-50 border border-gray-300 rounded px-2.5 py-1 w-2/3 outline-none"
                            value={sk.category || ''}
                            onChange={e => handleUpdateSkillCategory(skIdx, 'category', e.target.value)}
                            placeholder="Category (e.g. Programming Languages)"
                          />
                          <button
                            onClick={() => handleRemoveSkillCategory(skIdx)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Skills (comma separated)</label>
                          <input
                            type="text"
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                            value={sk.skills || ''}
                            onChange={e => handleUpdateSkillCategory(skIdx, 'skills', e.target.value)}
                            placeholder="e.g. C, Java, Python"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleAddSkillCategory}
                    className="w-full py-2 border border-dashed border-blue-400 text-blue-600 font-semibold text-xs rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Skill Category / Sub-Section
                  </button>
                </div>
              )}

              {/* Projects */}
              {enabledSections.projects && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-600">Projects</h3>
                    <button onClick={() => toggleSection('projects')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete Section
                    </button>
                  </div>
                  {(projects || []).map((proj, pIdx) => (
                    <div key={pIdx} className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500">Project #{pIdx + 1}</span>
                        {(projects || []).length > 1 && (
                          <button
                            onClick={() => handleRemoveProject(pIdx)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Project Title</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-semibold"
                          value={proj.title || ''}
                          onChange={e => {
                            const copy = [...projects];
                            copy[pIdx].title = e.target.value;
                            setProjects(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Technologies Used</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          value={proj.technologies || ''}
                          onChange={e => {
                            const copy = [...projects];
                            copy[pIdx].technologies = e.target.value;
                            setProjects(copy);
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Bullet Points (one per line)</label>
                        <textarea
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                          rows="3"
                          value={(proj.bullets || []).join('\n')}
                          onChange={e => {
                            const copy = [...projects];
                            copy[pIdx].bullets = e.target.value.split('\n');
                            setProjects(copy);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleAddProject}
                    className="w-full py-2 border border-dashed border-blue-400 text-blue-600 font-semibold text-xs rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add Project Entry
                  </button>
                </div>
              )}

              {/* Certifications */}
              {enabledSections.certifications && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Certifications (one per line)</label>
                    <button onClick={() => toggleSection('certifications')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    rows="3"
                    value={Array.isArray(certifications) ? certifications.join('\n') : certifications}
                    onChange={e => setCertifications(e.target.value.split('\n'))}
                  />
                </div>
              )}

              {/* Strengths & Languages */}
              {enabledSections.strengths && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-gray-600">Strengths & Languages</h3>
                    <button onClick={() => toggleSection('strengths')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Strengths (comma separated)</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                      value={Array.isArray(strengths) ? strengths.join(', ') : strengths}
                      onChange={e => setStrengths(e.target.value.split(',').map(s => s.trim()))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Languages</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                      value={languages}
                      onChange={e => setLanguages(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Hobbies */}
              {enabledSections.hobbies && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600">Hobbies (comma separated)</label>
                    <button onClick={() => toggleSection('hobbies')} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                  <input
                    type="text"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                    value={Array.isArray(hobbies) ? hobbies.join(', ') : hobbies}
                    onChange={e => setHobbies(e.target.value.split(',').map(h => h.trim()))}
                  />
                </div>
              )}

              {/* DYNAMIC CUSTOM SECTIONS */}
              {(customSections || []).length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    Custom Sections
                  </h3>
                  {(customSections || []).map((sec) => (
                    <div key={sec.id} className="bg-purple-50/50 border border-purple-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          className="font-bold text-sm text-purple-900 bg-white border border-purple-300 rounded px-2.5 py-1 w-2/3 outline-none"
                          value={sec.title}
                          onChange={e => handleUpdateCustomSection(sec.id, 'title', e.target.value)}
                          placeholder="Section Title"
                        />
                        <button
                          onClick={() => handleRemoveCustomSection(sec.id)}
                          className="text-red-500 hover:text-red-700 p-1 text-xs flex items-center gap-1 font-medium"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Section
                        </button>
                      </div>
                      <div>
                        <textarea
                          className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white outline-none"
                          rows="3"
                          value={sec.content}
                          onChange={e => handleUpdateCustomSection(sec.id, 'content', e.target.value)}
                          placeholder="Section details..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleAddCustomSection}
                  className="w-full py-3 border-2 border-dashed border-purple-300 text-purple-700 font-semibold text-sm rounded-xl hover:bg-purple-50 transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  + Add Custom Section
                </button>
              </div>

              {/* Mobile Save Floating Button */}
              <div className="sm:hidden pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 sm:px-6 pt-5 pb-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 text-sm">AI Resume Assistant</h2>
                    <p className="text-xs text-gray-500">Live Auto Edit & Save</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, i) => (
                  <ChatMessage key={i} msg={msg} />
                ))}
                {aiLoading && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-white border rounded-xl p-3 text-xs text-gray-500">AI is updating your resume...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleAISubmit} className="p-3 bg-white border-t border-gray-100">
                <div className="flex gap-2 items-end">
                  <textarea
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none resize-none"
                    rows="2"
                    placeholder="Tell the AI what to change..."
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    disabled={aiLoading}
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim() || aiLoading}
                    className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Live Preview Panel */}
        <div className={`w-full lg:w-1/2 p-3 sm:p-6 bg-gray-200 overflow-y-auto flex flex-col items-center ${
          mobileView === 'edit' ? 'hidden lg:flex' : 'flex'
        }`}>
          {/* Template Selector & ZOOM CONTROLS BAR */}
          <div className="w-full max-w-[794px] flex flex-wrap items-center justify-between gap-2 mb-3 bg-white px-3 sm:px-4 py-2.5 rounded-xl shadow-sm border border-gray-300">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-purple-600" />
              <select
                value={template}
                onChange={e => setTemplate(e.target.value)}
                className="text-xs font-bold bg-purple-50 border border-purple-300 text-purple-900 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="fresher">🎓 Fresher / Student (ATS Standard)</option>
                <option value="academic">📄 LaTeX Classic (Academic)</option>
                <option value="modern">⚡ Modern Clean (Minimalist)</option>
                <option value="executive">💼 Executive Slate (Navy Bar)</option>
                <option value="twocolumn">🎨 Creative Sidebar (Two Column)</option>
                <option value="custom">📤 Upload Custom HTML Template</option>
              </select>
            </div>

            {/* INTERACTIVE ZOOM CONTROLS */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
              <button
                onClick={zoomOut}
                title="Zoom Out"
                className="p-1 text-gray-700 hover:bg-white rounded transition"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-gray-700 px-1 min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={zoomIn}
                title="Zoom In"
                className="p-1 text-gray-700 hover:bg-white rounded transition"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                title="Fit Screen"
                className="p-1 text-blue-600 hover:bg-white rounded transition ml-1"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition shadow-sm"
                title="Directly download PDF file"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-sm"
                title="Open browser print dialog"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </div>
          </div>

          {/* RESUME A4 SCALABLE ZOOM CONTAINER */}
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                marginBottom: zoom < 1 ? `-${(1 - zoom) * 1123}px` : '0px'
              }}
              className="transition-transform duration-150 ease-out print-no-transform"
            >
              <div
                id="resume-preview"
                className="bg-white shadow-2xl min-h-[1123px] w-[794px] min-w-[794px] p-8 sm:p-10 text-gray-900 border border-gray-300 text-sm leading-normal relative"
              >
                {/* TEMPLATE CUSTOM: HEADER / TOOLBAR */}
                {template === 'custom' && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs no-print">
                    <div className="flex items-center gap-2 text-purple-900 font-bold">
                      <FileUp className="w-4 h-4 text-purple-600" />
                      <span>{customHtmlTemplate ? 'Custom HTML Template Active' : 'Custom HTML Template Mode'}</span>
                    </div>
                    <div className="flex items-center flex-wrap gap-2">
                      <label className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer transition flex items-center gap-1 shadow-xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{customHtmlTemplate ? 'Change HTML File' : 'Select HTML File'}</span>
                        <input type="file" accept=".html,.htm,.txt" className="hidden" onChange={handleFileUpload} />
                      </label>
                      {customHtmlTemplate && (
                        <button
                          type="button"
                          onClick={handleParseUploadedHtml}
                          disabled={parsingHtml}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                          title="Extract contact info, education, skills, and projects from the uploaded HTML into the editor form"
                        >
                          {parsingHtml ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>{parseSuccess ? '✅ Imported into Form!' : parsingHtml ? 'Parsing HTML...' : '✨ AI Parse into Form'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={downloadSampleTemplate}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-purple-700 border border-purple-300 font-bold rounded-lg transition flex items-center gap-1"
                        title="Download sample HTML template with placeholders"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Sample Template</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TEMPLATE UPLOAD UI (if no template loaded yet) */}
                {template === 'custom' && !customHtmlTemplate && (
                  <div className="flex flex-col items-center justify-center h-[700px] border-4 border-dashed border-gray-300 rounded-3xl bg-gray-50 text-gray-500 space-y-6">
                    <FileUp className="w-20 h-20 text-purple-400" />
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-700 mb-2">Upload Custom HTML Template or Resume</h3>
                      <p className="text-sm max-w-md mx-auto text-gray-600">
                        Upload any HTML template with placeholders like <code className="bg-gray-200 px-1 rounded text-gray-800 font-mono">{'{{name}}'}</code>, <code className="bg-gray-200 px-1 rounded text-gray-800 font-mono">{'{{skills}}'}</code>, <code className="bg-gray-200 px-1 rounded text-gray-800 font-mono">{'{{projects}}'}</code>, or a full HTML resume.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl cursor-pointer shadow-lg transition flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Select HTML File (.html, .htm)
                        <input type="file" accept=".html,.htm,.txt" className="hidden" onChange={handleFileUpload} />
                      </label>
                      <button
                        type="button"
                        onClick={downloadSampleTemplate}
                        className="bg-white border border-purple-300 hover:bg-purple-50 text-purple-700 font-bold py-3 px-5 rounded-xl transition flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Sample Template
                      </button>
                    </div>
                  </div>
                )}

                {/* TEMPLATE CUSTOM RENDER */}
                {template === 'custom' && customHtmlTemplate && (
                  <div
                    className="custom-template-container w-full"
                    dangerouslySetInnerHTML={{ __html: populateCustomTemplate(customHtmlTemplate) }}
                  />
                )}

                {/* TEMPLATE 1: FRESHER / ACADEMIC LATEX (SERIF) */}
                {(template === 'fresher' || template === 'academic') && (
                  <div className="font-serif space-y-4 text-[13px] leading-snug">
                    {/* Header */}
                    <div className="text-center pb-1">
                      <h1 className="text-2xl font-bold tracking-wide text-gray-900 mb-1">{personalInfo.name || 'Your Name'}</h1>
                      <div className="text-gray-800 text-xs flex items-center justify-center flex-wrap gap-2">
                        {personalInfo.phone && <span>{personalInfo.phone}</span>}
                        {personalInfo.phone && personalInfo.email && <span>—</span>}
                        {personalInfo.email && <a href={`mailto:${personalInfo.email}`} className="text-gray-900 underline">{personalInfo.email}</a>}
                      </div>
                      <div className="text-gray-800 text-xs flex items-center justify-center gap-3 mt-1">
                        {personalInfo.linkedin && <span className="font-medium text-gray-900">{personalInfo.linkedin}</span>}
                        {personalInfo.linkedin && personalInfo.github && <span>—</span>}
                        {personalInfo.github && <span className="font-medium text-gray-900">{personalInfo.github}</span>}
                      </div>
                    </div>

                    {/* Summary */}
                    {enabledSections.summary && summary && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-1.5">Professional Summary</h2>
                        <p className="text-gray-800 text-justify leading-relaxed">{summary}</p>
                      </div>
                    )}

                    {/* Education */}
                    {enabledSections.education && education && education.length > 0 && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-2">Education</h2>
                        {education.map((edu, idx) => (
                          <div key={idx} className="space-y-0.5 mb-2">
                            <div className="font-bold text-gray-900">{edu.degree}</div>
                            {edu.college && <div className="italic text-gray-800">{edu.college}</div>}
                            {edu.university && <div className="italic text-gray-800">{edu.university}</div>}
                            <div className="flex items-center gap-4 text-xs font-semibold text-gray-900 mt-1">
                              {edu.cgpa && <span>CGPA: {edu.cgpa}</span>}
                              {edu.graduationYear && <span>{edu.graduationYear}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Work Experience */}
                    {enabledSections.experience && experience && experience.length > 0 && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-2">Work Experience</h2>
                        {experience.map((exp, idx) => (
                          <div key={idx} className="mb-2 space-y-0.5">
                            <div className="font-bold text-gray-900 flex justify-between">
                              <span>{exp.role} {exp.company ? `— ${exp.company}` : ''}</span>
                              {exp.duration && <span className="font-normal text-xs text-gray-700">{exp.duration}</span>}
                            </div>
                            {exp.bullets && (
                              <ul className="list-disc list-inside text-xs text-gray-800 space-y-0.5 pl-1">
                                {exp.bullets.map((b, bIdx) => b.trim() && <li key={bIdx}>{b}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Technical Skills */}
                    {enabledSections.technicalSkills && technicalSkills && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-2">Technical Skills</h2>
                        <div className="space-y-1 text-xs">
                          {normalizeSkillsList(technicalSkills).map((item, idx) => (
                            item.skills ? (
                              <div key={idx}>
                                <strong className="text-gray-900 font-bold">{item.category || 'Skills'}:</strong> {item.skills}
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects */}
                    {enabledSections.projects && projects && projects.length > 0 && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-2">Projects</h2>
                        {projects.map((proj, idx) => (
                          <div key={idx} className="mb-3 space-y-1">
                            <div className="font-bold text-gray-900">{proj.title}</div>
                            {proj.technologies && <div className="italic text-xs text-gray-800">Technologies: {proj.technologies}</div>}
                            {proj.bullets && (
                              <ul className="list-disc list-inside text-xs text-gray-800 space-y-1 pl-1">
                                {proj.bullets.map((b, bIdx) => b.trim() && <li key={bIdx}>{b}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Certifications */}
                    {enabledSections.certifications && certifications && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-1.5">Certifications</h2>
                        <ul className="list-disc list-inside text-xs text-gray-800 space-y-1 pl-1">
                          {(Array.isArray(certifications) ? certifications : certifications.split('\n')).map((cert, cIdx) => cert.trim() && <li key={cIdx}>{cert}</li>)}
                        </ul>
                      </div>
                    )}

                    {/* Custom Sections */}
                    {(customSections || []).map(sec => (
                      <div key={sec.id}>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-1.5">{sec.title}</h2>
                        <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{sec.content}</div>
                      </div>
                    ))}

                    {/* Strengths */}
                    {enabledSections.strengths && strengths && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-1.5">Strengths</h2>
                        <div className="text-xs text-gray-900">{(Array.isArray(strengths) ? strengths : strengths.split(',')).join(' — ')}</div>
                        {languages && <div className="text-xs text-gray-900 mt-1"><strong className="font-bold">Languages:</strong> {languages}</div>}
                      </div>
                    )}

                    {/* Hobbies */}
                    {enabledSections.hobbies && hobbies && (
                      <div>
                        <h2 className="text-sm font-bold text-gray-900 border-b border-gray-400 pb-0.5 mb-1.5">Hobbies</h2>
                        <div className="text-xs text-gray-900">{(Array.isArray(hobbies) ? hobbies : hobbies.split(',')).join(' — ')}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TEMPLATE 2: MODERN MINIMAL */}
                {template === 'modern' && (
                  <div className="font-sans space-y-5">
                    <div className="border-b-2 border-blue-600 pb-4">
                      <h1 className="text-3xl font-bold text-gray-900">{personalInfo.name || 'Your Name'}</h1>
                      <p className="text-xs text-blue-600 font-semibold mt-1 flex gap-3">
                        {[personalInfo.email, personalInfo.phone, personalInfo.linkedin, personalInfo.github].filter(Boolean).join(' | ')}
                      </p>
                    </div>
                    {enabledSections.summary && summary && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Summary</h2>
                        <p className="text-gray-700 text-xs leading-relaxed">{summary}</p>
                      </div>
                    )}
                    {enabledSections.education && education && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Education</h2>
                        {education.map((e, idx) => (
                          <div key={idx} className="text-xs mb-1">
                            <div className="font-bold text-gray-900">{e.degree}</div>
                            <div className="text-gray-600">{e.college} • CGPA: {e.cgpa}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {enabledSections.experience && experience && experience.length > 0 && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Work Experience</h2>
                        {experience.map((exp, idx) => (
                          <div key={idx} className="text-xs mb-2">
                            <div className="font-bold text-gray-900 flex justify-between">
                              <span>{exp.role} {exp.company ? `- ${exp.company}` : ''}</span>
                              <span className="text-gray-500 font-normal">{exp.duration}</span>
                            </div>
                            {exp.bullets && (
                              <ul className="list-disc list-inside text-gray-600 mt-0.5">
                                {exp.bullets.map((b, bIdx) => b.trim() && <li key={bIdx}>{b}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {enabledSections.technicalSkills && technicalSkills && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Technical Skills</h2>
                        <div className="text-xs text-gray-700 space-y-0.5">
                          {normalizeSkillsList(technicalSkills).map((item, idx) => (
                            item.skills ? (
                              <div key={idx}>
                                <strong>{item.category || 'Skills'}:</strong> {item.skills}
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                    {enabledSections.projects && projects && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Projects</h2>
                        {projects.map((p, idx) => (
                          <div key={idx} className="text-xs mb-2">
                            <div className="font-bold text-gray-900">{p.title}</div>
                            <div className="text-gray-500 italic mb-1">{p.technologies}</div>
                            {p.bullets && (
                              <ul className="list-disc list-inside text-gray-600">
                                {p.bullets.map((b, bIdx) => b.trim() && <li key={bIdx}>{b}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {enabledSections.certifications && certifications && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Certifications</h2>
                        <ul className="list-disc list-inside text-xs text-gray-700">
                          {(Array.isArray(certifications) ? certifications : certifications.split('\n')).map((c, i) => c.trim() && <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                    {(customSections || []).map(sec => (
                      <div key={sec.id}>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">{sec.title}</h2>
                        <div className="text-xs text-gray-700 whitespace-pre-wrap">{sec.content}</div>
                      </div>
                    ))}
                    {enabledSections.strengths && strengths && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Strengths & Languages</h2>
                        <div className="text-xs text-gray-700">{(Array.isArray(strengths) ? strengths : strengths.split(',')).join(' • ')}</div>
                        {languages && <div className="text-xs text-gray-700 mt-0.5">Languages: {languages}</div>}
                      </div>
                    )}
                    {enabledSections.hobbies && hobbies && (
                      <div>
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Hobbies</h2>
                        <div className="text-xs text-gray-700">{(Array.isArray(hobbies) ? hobbies : hobbies.split(',')).join(' • ')}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TEMPLATE 3: EXECUTIVE SLATE */}
                {template === 'executive' && (
                  <div className="font-sans space-y-5">
                    <div className="bg-slate-900 text-white p-6 -mx-10 -mt-10 rounded-t-sm">
                      <h1 className="text-3xl font-extrabold tracking-wide uppercase">{personalInfo.name}</h1>
                      <p className="text-slate-300 text-xs mt-2 flex gap-3 flex-wrap">
                        <span>{personalInfo.email}</span> • <span>{personalInfo.phone}</span> • <span>{personalInfo.linkedin}</span>
                      </p>
                    </div>
                    {enabledSections.summary && summary && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Summary</h2>
                        <p className="text-gray-700 text-xs leading-relaxed">{summary}</p>
                      </div>
                    )}
                    {enabledSections.education && education && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Education</h2>
                        {education.map((e, idx) => (
                          <div key={idx} className="text-xs mb-1">
                            <div className="font-bold text-slate-900">{e.degree}</div>
                            <div className="text-slate-600">{e.college} • CGPA: {e.cgpa}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {enabledSections.experience && experience && experience.length > 0 && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Work Experience</h2>
                        {experience.map((exp, idx) => (
                          <div key={idx} className="mb-2 text-xs">
                            <div className="font-bold text-slate-900 flex justify-between">
                              <span>{exp.role} {exp.company ? `— ${exp.company}` : ''}</span>
                              <span className="text-slate-500 font-normal">{exp.duration}</span>
                            </div>
                            {exp.bullets && (
                              <ul className="list-disc list-inside text-gray-700 mt-0.5">
                                {exp.bullets.map((b, i) => b.trim() && <li key={i}>{b}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {enabledSections.technicalSkills && technicalSkills && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Technical Skills</h2>
                        <div className="text-xs text-gray-700 space-y-0.5">
                          {normalizeSkillsList(technicalSkills).map((item, idx) => (
                            item.skills ? (
                              <div key={idx}>
                                <strong>{item.category || 'Skills'}:</strong> {item.skills}
                              </div>
                            ) : null
                          ))}
                        </div>
                      </div>
                    )}
                    {enabledSections.projects && projects && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Projects</h2>
                        {projects.map((p, idx) => (
                          <div key={idx} className="mb-2 text-xs">
                            <div className="font-bold text-slate-900">{p.title}</div>
                            <div className="text-slate-500 italic mb-1">{p.technologies}</div>
                            {p.bullets && (
                              <ul className="list-disc list-inside text-gray-700">
                                {p.bullets.map((b, i) => b.trim() && <li key={i}>{b}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {enabledSections.certifications && certifications && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Certifications</h2>
                        <ul className="list-disc list-inside text-xs text-gray-700">
                          {(Array.isArray(certifications) ? certifications : certifications.split('\n')).map((c, i) => c.trim() && <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                    {(customSections || []).map(sec => (
                      <div key={sec.id}>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">{sec.title}</h2>
                        <div className="text-xs text-gray-700 whitespace-pre-wrap">{sec.content}</div>
                      </div>
                    ))}
                    {enabledSections.strengths && strengths && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Strengths & Languages</h2>
                        <div className="text-xs text-gray-700">{(Array.isArray(strengths) ? strengths : strengths.split(',')).join(' • ')}</div>
                        {languages && <div className="text-xs text-gray-700 mt-0.5">Languages: {languages}</div>}
                      </div>
                    )}
                    {enabledSections.hobbies && hobbies && (
                      <div>
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1 mb-2">Hobbies</h2>
                        <div className="text-xs text-gray-700">{(Array.isArray(hobbies) ? hobbies : hobbies.split(',')).join(' • ')}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* TEMPLATE 4: CREATIVE SIDEBAR */}
                {template === 'twocolumn' && (
                  <div className="font-sans flex -m-10 min-h-[1123px]">
                    <div className="w-1/3 bg-gray-900 text-white p-6 space-y-5">
                      <div>
                        <h1 className="text-xl font-extrabold text-white uppercase">{personalInfo.name}</h1>
                        <p className="text-xs text-purple-400 mt-1 font-semibold">{personalInfo.email}</p>
                        <p className="text-xs text-gray-300">{personalInfo.phone}</p>
                        {personalInfo.github && <p className="text-xs text-gray-300 mt-0.5">{personalInfo.github}</p>}
                      </div>
                      {enabledSections.technicalSkills && technicalSkills && (
                        <div className="space-y-2 text-xs">
                          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-gray-700 pb-1">Skills</h3>
                          {normalizeSkillsList(technicalSkills).map((item, idx) => (
                            item.skills ? (
                              <p key={idx} className="text-gray-300">
                                <strong>{item.category || 'Skills'}:</strong> {item.skills}
                              </p>
                            ) : null
                          ))}
                        </div>
                      )}
                      {enabledSections.strengths && strengths && (
                        <div className="text-xs">
                          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-gray-700 pb-1 mb-2">Strengths</h3>
                          <div className="space-y-1 text-gray-300">
                            {(Array.isArray(strengths) ? strengths : strengths.split(',')).map((s, i) => (
                              <div key={i}>• {s.trim()}</div>
                            ))}
                          </div>
                          {languages && <div className="mt-2 text-gray-400">Languages: {languages}</div>}
                        </div>
                      )}
                      {enabledSections.hobbies && hobbies && (
                        <div className="text-xs">
                          <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-gray-700 pb-1 mb-2">Hobbies</h3>
                          <p className="text-gray-300">{(Array.isArray(hobbies) ? hobbies : hobbies.split(',')).join(', ')}</p>
                        </div>
                      )}
                    </div>
                    <div className="w-2/3 p-8 space-y-5 bg-white">
                      {enabledSections.summary && summary && (
                        <div>
                          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1 mb-2">Summary</h2>
                          <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
                        </div>
                      )}
                      {enabledSections.education && education && (
                        <div>
                          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1 mb-2">Education</h2>
                          {education.map((e, idx) => (
                            <div key={idx} className="text-xs mb-2">
                              <div className="font-bold text-gray-900">{e.degree}</div>
                              <div className="text-gray-600">{e.college} • CGPA: {e.cgpa}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {enabledSections.experience && experience && experience.length > 0 && (
                        <div>
                          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1 mb-2">Work Experience</h2>
                          {experience.map((exp, idx) => (
                            <div key={idx} className="text-xs mb-2">
                              <div className="font-bold text-gray-900 flex justify-between">
                                <span>{exp.role} {exp.company ? `— ${exp.company}` : ''}</span>
                                <span className="text-gray-500 font-normal">{exp.duration}</span>
                              </div>
                              {exp.bullets && (
                                <ul className="list-disc list-inside text-gray-600 mt-0.5">
                                  {exp.bullets.map((b, bIdx) => b.trim() && <li key={bIdx}>{b}</li>)}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {enabledSections.projects && projects && (
                        <div>
                          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1 mb-2">Projects</h2>
                          {projects.map((p, idx) => (
                            <div key={idx} className="text-xs mb-2">
                              <div className="font-bold text-gray-900">{p.title}</div>
                              <div className="text-gray-500 italic mb-1">{p.technologies}</div>
                              {p.bullets && (
                                <ul className="list-disc list-inside text-gray-600">
                                  {p.bullets.map((b, bIdx) => b.trim() && <li key={bIdx}>{b}</li>)}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {enabledSections.certifications && certifications && (
                        <div>
                          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1 mb-2">Certifications</h2>
                          <ul className="list-disc list-inside text-xs text-gray-700">
                            {(Array.isArray(certifications) ? certifications : certifications.split('\n')).map((c, i) => c.trim() && <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                      {(customSections || []).map(sec => (
                        <div key={sec.id}>
                          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b-2 border-purple-600 pb-1 mb-2">{sec.title}</h2>
                          <div className="text-xs text-gray-700 whitespace-pre-wrap">{sec.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
