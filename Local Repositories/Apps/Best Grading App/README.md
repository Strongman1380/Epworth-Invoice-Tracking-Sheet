# BEST Classroom Grader

A lightweight in-browser grading grid for the Berniklau Education Solutions Team (BEST). It supports entering Assignment and Test scores for four classes (Psychology, Street Law, Independent Living, Spelling) and produces combined summary grades. Data persists locally (per browser) via `localStorage`.

## Features
- Add unlimited students dynamically.
- Two input grids: Assignments (0–10) and Tests (0–20).
- Spelling uses Pass/Fail selectors (for both assignments & tests); summary reflects Pass/Fail.
- Automatic percent + letter translation under each numeric score.
- Summary table showing combined (average) percentage & letter grade per class; risk coloring (<70 warn, <60 danger).
- Local persistence; refresh-safe.
- Responsive layout for mobile (tables collapse into card-like list).

## Grade Logic
- Percent = raw / max * 100.
- Letter scale: A ≥90, B ≥80, C ≥70, D ≥60 else F.
- Combined summary percent for non-Spelling classes = average of existing assignment & test percents (if one missing, uses the other).
- Spelling: shows Pass if either Test or Assignment marked Pass (precedence to Test), Fail if either explicitly Fail and no Pass override.

## Tech Stack
Pure HTML/CSS/Vanilla JS. No build step.

## Color / Typography Approximation
Derived from provided artwork.
- Yellow (letters fill): `#cddc39`
- Blue outline: `#1c94d2`
- Greens: `#08a045`, `#2ecc71`
- Fonts: Display - Baloo 2; Body - Nunito (Google Fonts).

## Usage
Open `index.html` in a modern browser. Optionally deploy on any static host.

### Local Serving Options
1. VS Code Live Server
   - Ensure this folder is the workspace root.
   - We added `.vscode/settings.json` forcing root + port 5501.
   - Right‑click `index.html` > Open with Live Server.
2. Python quick server
   - `python3 -m http.server 5500` then browse http://localhost:5500
3. Node/Express server
   - Install deps once: `npm install`
   - Start: `npm start` (serves on http://localhost:3000)
4. Netlify / Vercel / GitHub Pages
   - Directly deploy: static site, no build step needed.

## Future Enhancements (Ideas)
- Export to CSV / Print report.
- Weighted categories (e.g., Test 60%, Assignments 40%).
- Per-student detail modal & history timeline.
- Dark mode + accessibility audits.
- Undo/redo stack.
- Authentication & cloud sync backend.

## Development Notes
All state is in memory + localStorage; easy to adapt to a backend later. Keep IDs stable when extending.

## License
Internal / Proprietary (adjust as needed).
