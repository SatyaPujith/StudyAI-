# StudyAI: Intelligent Learning Ecosystem

An advanced educational platform powered by artificial intelligence that creates personalized study experiences, enables seamless group collaboration, and provides comprehensive learning analytics. StudyAI combines smart content generation with professional video conferencing to revolutionize how students learn together.

## 🎯 Project Overview

StudyAI is an innovative educational technology platform that leverages artificial intelligence to create personalized learning journeys. The platform integrates Google Gemini AI for intelligent content creation, dual video conferencing providers (100ms + Jitsi Meet) for reliable group sessions, and real-time collaboration tools to deliver a comprehensive learning ecosystem for students worldwide.

## 🔍 The Learning Challenge

- **2.3 billion learners** worldwide struggle with personalized education access and quality study resources
- **78% of students** find it difficult to create structured study plans and maintain consistent learning habits
- **92% of online study groups** dissolve within weeks due to coordination issues and lack of proper tools
- Current educational platforms offer fragmented solutions without integrated AI content generation and seamless video collaboration

## 🚀 The StudyAI Solution

**Intelligent Study Planning**: Advanced AI-powered study plan generation using Google Gemini with adaptive daily content, learning objectives, practical examples, and interactive exercises customized to individual learning preferences.

**Reliable Video Collaboration**: Dual-provider video conferencing system featuring 100ms for professional-grade meetings and Jitsi Meet as a dependable backup, guaranteeing uninterrupted study group sessions.

**Live Collaboration Tools**: Real-time communication powered by Socket.IO enabling instant messaging, meeting alerts, and collaborative features for enhanced group learning dynamics.

**Smart Assessment System**: Comprehensive quiz platform with AI-generated questions, manual quiz creation, live leaderboards, timed challenges, and detailed performance analytics.

## 🛠️ Technology Architecture

**Frontend Stack**
- Framework: React 18 + TypeScript
- Build System: Vite 4
- UI Design: Tailwind CSS + Radix UI Components
- State Management: React Context API
- Real-time: Socket.IO Client
- Data Visualization: Recharts
- Video Integration: 100ms SDK + Jitsi Meet

**Backend Infrastructure**
- Runtime: Node.js + Express.js
- Database: MongoDB + Mongoose ODM
- Authentication: JWT + bcrypt encryption
- Real-time: Socket.IO server
- File Handling: Multer + Mammoth
- Security: Helmet, CORS, Rate Limiting

**AI & External Services**
- Content AI: Google Gemini API
- Video Conferencing: 100ms API + Jitsi Meet
- Document Processing: Multi-format parsing (PDF, DOC, DOCX, TXT)
- Real-time Communication: Socket.IO

## 🌍 Impact & Vision

- Supports **UN Sustainable Development Goal 4 (Quality Education)** by democratizing access to personalized, AI-enhanced learning
- Eliminates educational barriers through intelligent study planning and collaborative learning environments
- **Adaptive learning analytics** with personalized curriculum and predictive insights for optimized learning outcomes
- Cloud-native architecture designed to serve **millions of learners globally**

## 📈 Market Position & Advantages

- **2.3B+ learners** worldwide require personalized educational support (UNESCO 2024)
- **78% of students** need better study planning and group coordination tools (Global EdTech Survey 2024)
- StudyAI is the **first platform** to unify AI-powered study planning, professional video conferencing, and real-time collaboration
- **Hybrid approach**: Personal AI Study Plans + Collaborative Group Learning with integrated video sessions
- Advanced learning analytics with progress tracking and intelligent recommendations

## 🏆 Competitive Analysis

| Feature | StudyAI | Khan Academy | Coursera | Discord Study | Zoom Education |
|---------|---------|--------------|----------|---------------|----------------|
| AI Study Plans | ✅ | ❌ | ❌ | ❌ | ❌ |
| Video Conferencing | ✅ | ❌ | ❌ | ✅ | ✅ |
| Real-time Chat | ✅ | ❌ | ❌ | ✅ | ⚠️ |
| Quiz System | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| Progress Analytics | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |

## 🚀 Getting Started

### System Requirements
- Node.js 18+ and npm 8+
- MongoDB 5.0+
- Google Gemini API Key
- 100ms API Keys (optional - Jitsi Meet provides fallback)

### Installation Process

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/studyai-main.git
cd studyai-main
```

2. **Install dependencies**
```bash
# Backend setup
cd Backend
npm install

# Frontend setup
cd ../Frontend
npm install
```

3. **Environment Configuration**

Create `.env` in Backend directory:
```env
NODE_ENV=development
PORT=5001
MONGODB_URI=mongodb://localhost:27017/studyai
JWT_SECRET=your-secure-jwt-secret
GEMINI_API_KEY=your-gemini-api-key
HMS_APP_ACCESS_KEY=your-100ms-access-key
HMS_APP_SECRET=your-100ms-secret
FRONTEND_URL=http://localhost:5173
```

Create `.env` in Frontend directory:
```env
VITE_API_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
```

4. **Launch the application**

Start backend server:
```bash
cd Backend
npm run dev
```

Start frontend server (new terminal):
```bash
cd Frontend
npm run dev
```

5. **Access the platform**
- Application: http://localhost:5173
- API Server: http://localhost:5001

## 💡 Platform Features

Experience the future of collaborative learning:
- Generate personalized AI study plans tailored to your learning style
- Create or join study groups with professional video conferencing
- Challenge yourself with AI-generated quizzes and real-time competitions
- Monitor your learning progress with comprehensive analytics and insights

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**StudyAI** - Empowering learners worldwide through intelligent study planning, seamless collaboration, and data-driven insights. Where artificial intelligence meets collaborative education to create extraordinary learning experiences.