# J&A Fitness AI

Smart Decision Exercise Planner for J&A Fitness, Legazpi City.

## Setup

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # fill in values
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env     # fill in values
npm run dev
```

## Phases
- Phase 1: Scaffold + Auth
- Phase 2: AI + Backend Features
- Phase 3: Computer Vision + Deployment
