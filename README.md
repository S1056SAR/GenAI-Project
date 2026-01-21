<p align="center">
  <img src="https://img.shields.io/badge/EduSynth-AI%20Learning%20Platform-cyan?style=for-the-badge&logo=graduation-cap" alt="EduSynth Badge"/>
</p>

<h1 align="center">🎓 EduSynth AI</h1>

<p align="center">
  <strong>An Intelligent Multi-Agent Learning Platform</strong><br>
  <em>Powered by LangGraph, RAG, and Regional Language AI</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/Next.js-16+-black?logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/LangGraph-Agent%20Framework-green" alt="LangGraph"/>
  <img src="https://img.shields.io/badge/Sarvam%20AI-Regional%20TTS-orange" alt="Sarvam"/>
</p>

---

##  Overview

**EduSynth AI** is an intelligent educational platform that transforms how students learn. Upload your study materials and interact with three specialized AI agents:

| Mode | Description |
|------|-------------|
| 🎓 **Tutor Mode** | Interactive AI tutor with mindmaps, flashcards, and regional language audio |
| ❓ **Doubt Solver** | 3D Avatar teacher (Vidya Ma'am) for voice-based doubt resolution |
| 📝 **Examiner Mode** | Automated exam generation based on syllabus and question banks |
| 🗺️ **Pathfinder Mode** | Personalized learning journey generator with curriculum design |

---

##  Key Features

###  Multi-Agent Architecture
- **LangGraph-powered** workflow orchestration
- Intent detection for smart response generation
- Session-scoped RAG for isolated topic contexts

###  RAG-Powered Knowledge
- Upload PDFs, DOCX, TXT files
- ChromaDB vector storage with HuggingFace embeddings
- **Topic-based sessions** - no context mixing between subjects

###  Regional Language Support
- **Sarvam AI** Text-to-Speech integration
- Supports 11 Indian languages (Hindi, Tamil, Telugu, etc.)
- Auto-detects language from user queries

###  Interactive Learning Outputs
- **Mermaid.js Mindmaps** with zoom controls
- **Flashcard Decks** with flip animations
- **Content History** - browse all generated materials

---

##  Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### 1️ Clone the Repository
```bash
git clone https://github.com/yourusername/edusynth-ai.git
cd edusynth-ai
```

### 2️ Backend Setup
```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r backend/requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your API keys
```

### 3️ Frontend Setup
```bash
cd frontend
npm install
```

### 4️ Environment Variables
Create a `.env` file in the project root:
```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
SARVAM_API_KEY=your_sarvam_api_key
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

### 5️ Run the Application
```bash
# Terminal 1 - Backend
python -m uvicorn backend.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
edusynth-ai/
├── backend/
│   ├── agents/           # LangGraph agent definitions
│   │   ├── tutor_graph.py
│   │   ├── examiner_graph.py
│   │   └── journey_graph.py
│   ├── api/              # FastAPI routes
│   │   ├── routes_tutor.py
│   │   ├── routes_exam.py
│   │   └── routes_rag.py
│   ├── core/             # Config & LLM setup
│   ├── rag/              # RAG ingestion & retrieval
│   ├── services/         # External APIs (Sarvam TTS)
│   └── main.py           # FastAPI application
│
├── frontend/
│   ├── app/              # Next.js pages
│   │   └── dashboard/
│   │       ├── tutor/    # Tutor Mode UI
│   │       ├── examiner/ # Examiner Mode UI
│   │       └── journey/  # Pathfinder Mode UI
│   ├── components/       # React components
│   ├── lib/              # API client & utilities
│   └── store/            # Zustand state management
│
├── .env.example          # Environment template
├── .gitignore
└── README.md
```

---

## 🔧 Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | API framework |
| **LangGraph** | Agent orchestration |
| **LangChain** | LLM abstractions |
| **ChromaDB** | Vector database |
| **Groq** | LLM inference |
| **Gemini** | Reasoning (Doubt Solver) |
| **Sarvam AI** | Regional TTS |
| **Kokoro TTS** | Local Hindi TTS |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework |
| **Tailwind CSS** | Styling |
| **Framer Motion** | Animations |
| **Mermaid.js** | Diagram rendering |
| **Zustand** | State management |

---

## 📸 Screenshots

### Tutor Mode
*Interactive learning with mindmaps, flashcards, and audio*

### Examiner Mode  
*Automated exam paper generation*

### Pathfinder Mode
*Personalized curriculum journey*

---

##  Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

##  Acknowledgments

- [LangGraph](https://github.com/langchain-ai/langgraph) for agent framework
- [Groq](https://groq.com/) for fast LLM inference
- [Sarvam AI](https://www.sarvam.ai/) for Indian language TTS
- [Hugging Face](https://huggingface.co/) for embeddings

---

<p align="center">
  Made with ❤️ for Education
</p>

