# StudyAI Frontend

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create `.env.local` file:
```env
VITE_API_URL=http://localhost:5001/api
VITE_API_ORIGIN=http://localhost:5001
```

### 3. Start Development Server
```bash
npm run dev
```

Visit: http://localhost:5173

## 🎯 Features

### ✅ Authentication
- Secure login/register
- JWT token management
- Protected routes

### ✅ Study Plans
- AI-generated daily content
- Interactive study sessions
- Progress tracking
- File upload support

### ✅ Quizzes
- AI-generated questions
- Manual quiz creation
- Private quiz codes
- Progress tracking

### ✅ Study Groups
- Real-time chat
- Video sessions
- Session scheduling
- Socket.IO integration

### ✅ Real-time Features
- Live video calls
- Group chat
- Session management
- Presence indicators

## 🔧 Components

### Core Components
- `DashboardView` - Main dashboard
- `StudyPlanView` - Study plan management
- `StudySession` - Interactive learning
- `QuizzesView` - Quiz management
- `StudyGroupsView` - Group collaboration

### UI Components
- Built with Radix UI + Tailwind CSS
- Responsive design
- Accessible components
- Modern animations

## 🐛 Troubleshooting

### API Connection Issues
1. Check backend is running on port 5001
2. Verify VITE_API_URL in environment
3. Check CORS configuration

### Socket.IO Issues
1. Verify VITE_API_ORIGIN is correct
2. Check backend Socket.IO setup
3. Ensure authentication tokens are valid

### Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📱 Mobile Support
- Responsive design
- Touch-friendly interface
- Mobile-optimized layouts
- Progressive Web App ready

Your StudyAI frontend is ready! 🎉