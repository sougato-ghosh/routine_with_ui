# Cadence (React + FastAPI)

This project is a university timetable generator using Google's OR-Tools for the scheduling engine, with a FastAPI backend and a React (Vite) frontend.

## Prerequisites

- Python 3.12+
- Node.js 18+
- npm

## How to Run

### 1. Setup Backend

Navigate to the `backend` directory, install dependencies, and start the FastAPI server:

```bash
cd backend
pip install -r requirements.txt
python api.py
```
The backend will be running at `http://localhost:8000`.

### 2. Setup Frontend

Open a new terminal, navigate to the `frontend` directory, install dependencies, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```
The frontend will be running at `http://localhost:5173`.

## Features

- **Dashboard Overview**: Quick stats of teachers, classes, rooms, and total load.
- **Data Studio**: Manage all your academic data (CSV-based) with a simple table editor.
- **AI Generator**: Trigger the scheduling engine and view data validation warnings.
- **Routine Hub**: View and print generated timetables for classes and teachers in a clean, professional grid.
