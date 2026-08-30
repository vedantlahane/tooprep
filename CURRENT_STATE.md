# TooPrep - Comprehensive Architecture & State Document

## 1. Product Vision & Core Philosophy
TooPrep is an advanced, full-stack learning companion built for students preparing for highly competitive exams like the JEE. It goes beyond standard quiz applications by addressing a critical psychological flaw in test prep: **The Illusion of Competence**. 

Instead of just tracking scores, TooPrep constantly measures the student's *perceived* ability (Confidence) against their *actual* ability (Evaluation Accuracy) to compute a **Confidence-Performance Gap**. 

The app flags dangerous scenarios—such as when a student is highly confident in a topic but consistently fails questions on it ("Overconfident")—ensuring they don't get blindsided on exam day.

---

## 2. The Confidence-Performance Gap Algorithm
The entire app revolves around the Gap Algorithm, executed server-side in `dashboard.utils.js`.

### How it works:
1. **Confidence Normalization:** The user's self-reported confidence (1-10 scale) is multiplied by 10 to establish an "Expected Accuracy" (e.g., a confidence of 8 = 80% expected accuracy).
2. **Actual Accuracy:** Calculated from the user's latest completed timed evaluation.
3. **Gap Calculation:** `Gap = Evaluation Accuracy - Expected Accuracy`.
   - A negative gap means the student is performing worse than they think.
   - A positive gap means they are performing better than they think.

### Status Classifications:
Topics are strictly categorized and sorted by action priority:
* 🔴 **OVERCONFIDENT (Highest Priority):** Gap is `-15%` or worse. The student thinks they know the material but they are failing. *High risk for negative marking in exams.*
* 🟡 **WEAK_ALIGNED (Priority 2):** Accuracy is below `40%`, and confidence is correctly low (Gap > -15%). The student knows they are weak and they are indeed weak. Needs study.
* ⚪ **PRELIMINARY (Priority 3):** The student has taken an evaluation, but hasn't completed enough questions (fewer than 5 attempts) for the data to be statistically reliable.
* ⚪ **INSUFFICIENT_DATA (Priority 4):** No evaluation taken yet, or no confidence rated.
* 🔵 **UNDERCONFIDENT (Priority 5):** Gap is `+15%` or better. The student is performing much better than they think. Good for morale, low academic risk.
* 🟢 **ALIGNED (Lowest Priority):** Accuracy is `>= 40%`, and the gap is between `-15%` and `+15%`. The student has an accurate gauge of their solid abilities.

---

## 3. Core Features & Engine Mechanics

### A. Timed Evaluations (Assessment Mode)
Evaluations simulate harsh exam conditions.
* **Intelligent Assembly Engine:**
  * **Freshness:** Automatically queries the database to exclude questions seen in the user's last 2 evaluations on this topic.
  * **Difficulty Mix:** Assembles a 15-question test strictly targeting: `~20% Easy, ~47% Medium, ~33% Hard` (e.g., 3 Easy, 7 Medium, 5 Hard). This mirrors competitive exam curves.
  * **PYQ Bias:** Within each difficulty tier, Previous Year Questions (PYQs) are prioritized first.
* **Security & Anti-Cheating:** Correct answers and solutions are explicitly stripped from the JSON payload sent to the client. The timer auto-submits, and users can only view solutions after final submission.
* **Upsert Capability:** Users can navigate freely and revise their answers before the timer runs out.

### B. Practice Mode (Learning Mode)
* Untimed, low-stakes environment.
* Questions are selected randomly from verified pools without strict difficulty targeting.
* **Immediate Feedback:** Unlike evaluations, the server immediately grades the question and returns the correct answer and detailed solution upon submission.
* **Mistake Tracking:** If a student gets a question wrong, they are prompted to categorize their error (e.g., "Calculation", "Conceptual", "Silly Mistake", "Time Pressure").

### C. Insights & Analytics
* Aggregates topic-level data up to the **Subject Level** (Physics, Chemistry, Math), showing overall subject accuracy and a count of overconfident topics.
* Identifies the single **Biggest Confidence Gap** across the entire curriculum and pins it to the user's profile for immediate action.

---

## 4. UI / UX Design System: "Metro UI"
The client application was recently overhauled to feature a rigid, flat, typography-driven design system inspired by Windows Phone (Lumia) and Windows 8.

* **Color Palette:** Pure black background (`#000000`), stark white text, and a vibrant Cyan accent (`#1BA1E2`).
* **Geometry:** Absolutely zero rounded corners (`border-radius: 0px` globally). Every card, button, and input is a perfect rectangle.
* **Typography:** `Segoe UI` and `Segoe WP`. Uses massive, lightweight, lowercase headers ("Panorama headers") that bleed off the screen, paired with tiny, uppercase, tracking-widest label fonts.
* **The Start Screen:** The standard data-table dashboard was replaced with a **Live Tile Grid**. Topics are rendered as solid colored blocks (red, green, blue, yellow) that act as visual heatmaps of the user's brain.
* **Navigation:** Mobile users experience a classic "App Bar" pinned to the bottom of the screen with circular icon buttons.

---

## 5. Software Architecture

### Vertical Slice (Feature-Based) Architecture
Both the client and the server shun the traditional MVC grouping (where all controllers live in one folder). Instead, the codebase is isolated by **domain feature**.

**Server Structure Example:**
```
server/src/features/evaluations/
 ├── evaluations.routes.js       # Express router definitions
 ├── evaluations.controller.js   # HTTP req/res handling & error catching
 └── evaluations.service.js      # Heavy business logic & Supabase DB interactions
```

### Backend Stack
* **Runtime:** Node.js + Express.
* **Middleware:** CORS (configured with a dynamic origin checker to support Vercel preview deployments) and a custom JWT `requireAuth` gatekeeper.
* **Data Access:** Supabase SDK. The server maintains two types of clients:
  * `supabaseAdmin`: Uses the Service Role Key to bypass Row Level Security (RLS) for heavy aggregation queries and algorithm assembly.
  * *Request-Scoped Clients*: Used for basic CRUD where user RLS policies dictate data access.

### Frontend Stack
* **Framework:** React 18 + Vite.
* **Styling:** Tailwind CSS v4. Leverages v4's new `@theme` CSS variables to globally enforce the Metro UI design rules without deeply nested config files.
* **Math Rendering:** KaTeX is heavily integrated via a custom `<MathText />` component to render complex calculus and physics equations stored in the database.

---

## 6. Database Schema (PostgreSQL via Supabase)

### Curriculum Hierarchy
* `subjects`: Top level (e.g., Physics).
* `chapters`: Sub-divisions (e.g., Kinematics).
* `topics`: Granular concepts (e.g., Projectile Motion).
* `questions`: Stores `question_text`, JSON `options`, `correct_answer`, `solution_text`, `difficulty`, `source_type` (e.g., PYQ), and a `verified` boolean flag.

### User Data
* `profiles`: Extends the Auth system with `display_name`, `target_exam_year`, and an `is_admin` role flag.
* `confidence_assessments`: An append-only historical log of every time a user changes their confidence slider for a topic.

### Session Tracking
* `evaluations`: Tracks `started_at`, `ended_at`, and `duration_seconds`.
* `evaluation_attempts`: Links to `evaluations`. Tracks exactly what the user picked, how many seconds they spent on that specific question, and whether they got it right.
* `practice_sessions` & `practice_attempts`: Similar structure, but includes the user-selected `mistake_type` for incorrect answers.

---

## 7. Current Project Status
* **Ready for Production:** The application is fully built, tested, and structurally sound. 
* **Complete Documentation:** Every single server file features extensive architectural block comments and JSDoc annotations.
* **Polished UI:** The client compiles with zero warnings under Tailwind v4 and successfully implements the Metro UI specification across every route.
