# Planify

https://planifytodoapp.vercel.app/
A full-stack todo application with user authentication, priority levels, due dates, and task-level time tracking.

## Tech stack

- **Frontend:** React (Vite), React Router, Axios
- **Backend:** Django, Django REST Framework, Simple JWT
- **Database:** PostgreSQL (Supabase)
- **Hosting:** Vercel (frontend), Render (backend)

## Features

- Register and log in with JWT authentication
- Create, edit, and delete todos (title, description, due date, priority)
- Due dates shown as relative time ("Due today," "3 days left," "Overdue 2d")
- Break a todo down into tasks
- Each task has a countdown timer with start/pause/finish controls
- Tasks are grouped by status: In Progress, Pending, Done

## Data model

**Todo:** title, description, due_date, priority, owned by a user

**Task:** name, status, target_duration_seconds, accumulated_seconds, started_at — belongs to a todo



A task's elapsed/remaining time is calculated from `accumulated_seconds` plus the time since `started_at` if it's currently running, rather than stored as a single counter. This is what allows pausing and resuming without losing time.




## Note on hosting

The backend runs on Render's free tier, which spins down after inactivity — the first request after idle time can take 30–60 seconds to respond.
