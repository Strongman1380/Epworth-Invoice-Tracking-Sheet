# Pathways Companion – Daily Reflection Journal

A trauma-informed mobile app for tracking daily reflections, emotions, and personal growth. Built with React Native (Expo) and FastAPI, with support for Supabase authentication and PostgreSQL persistence.

## 🎯 Features

- **Daily Reflection Prompts** - Guided journaling with trauma-informed prompts
- **Emotion Tagging** - Track up to 3 emotions per reflection
- **Trend Visualization** - See your emotional patterns over time
- **Offline Support** - Queue reflections when offline, auto-sync when connected
- **Voice Notes** - Record spoken reflections (coming soon)
- **Privacy-First** - All reflections are private with end-to-end encryption

## 📁 Project Structure

```
.
├── mobile/              # React Native (Expo) mobile app
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── contexts/    # Auth and state management
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # API clients & utilities
│   │   ├── screens/     # App screens
│   │   └── theme/       # Design tokens
│   ├── App.js           # Main app entry
│   └── package.json
│
├── backend/             # FastAPI backend
│   ├── app/
│   │   ├── main.py      # JSON storage version (prototype)
│   │   ├── main_supabase.py  # Supabase version (production)
│   │   ├── schemas.py   # Pydantic models
│   │   └── storage.py   # File storage utilities
│   ├── database/
│   │   └── schema.sql   # PostgreSQL schema for Supabase
│   └── requirements.txt
│
└── docs/
    ├── SUPABASE_INTEGRATION_PLAN.md
    └── MIGRATION_GUIDE.md
```

## 🚀 Quick Start (Prototype Mode)

### Mobile App

```bash
cd mobile
npm install
npm run start
# Follow Expo prompts for iOS/Android/web
```

### Backend API (JSON Storage)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**API Endpoints:**
- `POST /api/reflections` - Create a reflection
- `GET /api/reflections/{userId}/trend` - Get 7-day emotion trends
- `GET /health` - Health check

Data is stored in `backend/data/reflections.json` for quick prototyping.

## 🔐 Production Setup (Supabase)

For production deployment with authentication and PostgreSQL:

1. **Follow the [Migration Guide](MIGRATION_GUIDE.md)** for step-by-step instructions
2. **Review the [Supabase Integration Plan](SUPABASE_INTEGRATION_PLAN.md)** for architecture details

### Quick Production Start

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Run `backend/database/schema.sql` in Supabase SQL Editor
3. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp mobile/.env.example mobile/.env
   ```
4. Add your Supabase credentials to both `.env` files
5. Install additional dependencies:
   ```bash
   cd mobile && npm install
   cd ../backend && pip install -r requirements.txt
   ```
6. Start Supabase-enabled backend:
   ```bash
   uvicorn app.main_supabase:app --reload --port 8000
   ```

## 🎨 Design Philosophy

This app follows **trauma-informed design principles**:

- **Safety First** - Calming colors, clear copy, no surprises
- **Empowerment** - Users control their data, can pause anytime
- **Privacy** - Reflections are private by default
- **Gentle Language** - Supportive microcopy throughout
- **Accessible** - High contrast, large touch targets, screen reader support

**Color Palette:**
- Primary: `#6366F1` (Calming indigo)
- Secondary: `#F3F4F6` (Soft gray)
- Background: `#FAFBFC` (Off-white)
- Accent: `#10B981` (Growth green)

## 📱 Mobile Tech Stack

- **React Native** 0.81 via Expo 54
- **Supabase JS Client** for auth & data
- **AsyncStorage** for offline caching
- **NetInfo** for connectivity detection
- **Expo AV** for voice recording (planned)

## 🔧 Backend Tech Stack

- **FastAPI** 0.110 for API
- **Supabase Python SDK** for database
- **PostgreSQL** via Supabase
- **Uvicorn** ASGI server

## 📊 Database Schema

Key tables:
- `profiles` - User profiles (extends Supabase auth)
- `prompts` - Daily reflection prompts
- `reflections` - User journal entries with emotions

See [backend/database/schema.sql](backend/database/schema.sql) for full schema.

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest  # Coming soon
```

### Mobile Tests
```bash
cd mobile
npm test  # Coming soon
```

## 📦 Deployment

### Backend

**Vercel:**
```bash
cd backend
vercel deploy
```

**Render/Railway:**
Connect your GitHub repo and set environment variables.

### Mobile

**iOS:**
```bash
cd mobile
eas build --platform ios
eas submit --platform ios
```

**Android:**
```bash
eas build --platform android
eas submit --platform android
```

## 🔄 Offline Support

The mobile app includes:
- **Offline queue** for reflections created without internet
- **Auto-sync** when connection is restored
- **Local cache** for viewing past reflections offline

See [mobile/src/lib/offlineQueue.js](mobile/src/lib/offlineQueue.js) for implementation.

## 🗺️ Roadmap

- [x] Daily reflection journal with emotion tags
- [x] Trend visualization (7-day window)
- [x] Supabase authentication
- [x] Offline support with auto-sync
- [ ] Voice recording with transcription
- [ ] Multi-device real-time sync
- [ ] Export reflections (PDF/CSV)
- [ ] Push notifications for reminders
- [ ] Care team sharing (opt-in)
- [ ] AI-powered insights from patterns

## 🤝 Contributing

This is a prototype for trauma-informed care. Contributions welcome!

1. Fork the repo
2. Create a feature branch
3. Follow the existing code style
4. Test thoroughly
5. Submit a PR

## 📄 License

MIT License - See LICENSE file

## 📞 Support

For questions or issues:
- Check the [Migration Guide](MIGRATION_GUIDE.md)
- Review [Supabase Integration Plan](SUPABASE_INTEGRATION_PLAN.md)
- Open an issue on GitHub

---

Built with ❤️ for trauma survivors on their healing journey.
