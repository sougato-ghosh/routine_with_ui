
# Timetabler (Python) — Minimal Cadence-like Core

This repository contains a school timetabling tool with a FastAPI backend and a React frontend. It supports:

- Classes, teachers, rooms, subjects, and terms
- Weekly timeslots with customizable days and periods
- Curriculum management with required periods per week
- Teacher unavailability and preference management
- Room capacity checks and home-room assignments
- Automatic schedule generation using OR-Tools CP-SAT solver
- Interactive web UI for data management and schedule viewing

## Data Management

All data is managed through a SQLite database (`scheduler.db`). The system no longer relies on local CSV files in a `data/` folder for its operation, although it provides import and export functionality for CSV data via the web interface.

### Database Tables

- `teachers`: faculty members and their load limits
- `classes`: student groups and sizes
- `rooms`: physical locations, capacities, and types
- `subjects`: course definitions and requirements
- `curriculum`: assignments of teachers and subjects to classes
- `teacher_unavailability` & `teacher_preferences`: scheduling constraints
- `schedules` & `schedule_assignments`: generated timetable results

## How to Run

### Backend
1. Ensure you have Python 3.9+ installed.
2. Install dependencies: `pip install -r backend/requirements.txt`
3. Run the API server: `python backend/api.py`

### Frontend
1. Ensure you have Node.js installed.
2. Navigate to the `frontend` directory.
3. Install dependencies: `npm install`
4. Run the development server: `npm run dev`

## Extending

- The system uses Google's OR-Tools for solving the constraints.
- Soft constraints and penalties are used to optimize teacher preferences and scheduling rules.
- The UI is built with React, Vite, and Tailwind CSS for a modern, responsive experience.

Licensed under MIT for your convenience.
