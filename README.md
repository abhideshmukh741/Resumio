# Resumio - AI Resume Builder 🚀

Resumio is an intelligent, full-stack resume builder designed to help job seekers create professional, ATS-friendly resumes in minutes. It features a live-updating interactive editor, multiple dynamic templates, and an AI-powered assistant that can automatically rewrite your bullet points and optimize your resume for specific job descriptions.

## ✨ Features

- **Live Interactive Editor**: See your changes reflected instantly on the resume preview.
- **Multiple ATS-Friendly Templates**: Choose from Fresher, Academic, Modern Clean, Executive, and Creative layouts.
- **AI Resume Assistant**: Use the built-in chat to say *"make my summary more impactful"* or *"add Python to my skills"* and watch the AI update your resume instantly.
- **Job Keyword Optimizer**: Paste a job description, and the AI will scan your resume to find missing keywords and optionally auto-insert them for you.
- **Custom HTML Templates**: Upload your own custom HTML layout with dynamic placeholders (`{{name}}`, `{{education}}`) and the app will populate it.
- **Mobile Responsive**: Fully editable and previewable on mobile devices.
- **Export to PDF**: Generate crisp, perfectly scaled A4 PDFs ready for job applications.

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS
- Lucide React (Icons)
- Axios

**Backend:**
- Python & FastAPI
- SQLAlchemy
- Supabase (PostgreSQL Database)
- OpenAI API (for AI Resume generation & optimization)
- Bcrypt (for secure password hashing)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A Supabase account (or local PostgreSQL)
- An OpenAI API Key

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install dependencies:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   pip install -r requirements.txt
   ```
3. Set up your environment variables by creating a `.env` file in the `backend/` directory:
   ```env
   DATABASE_URL=postgresql+psycopg2://your_supabase_user:your_password@db.supabase.co:5432/postgres
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables by creating a `.env` file in the `frontend/` directory:
   ```env
   VITE_API_URL=http://127.0.0.1:8000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```

## 🌐 Deployment
- **Frontend** can be deployed easily on [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).
- **Backend** can be deployed on [Render](https://render.com/) or [Railway](https://railway.app/).
- Don't forget to update the CORS origins in `main.py` and environment variables on your hosting platforms!

## 📄 License
This project is licensed under the MIT License.
# Resumio
