const express = require('express');
const compression = require('compression');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(compression());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'grades.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS roster (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    class_name TEXT NOT NULL,
    score TEXT,
    FOREIGN KEY (student_id) REFERENCES roster (id)
  )`);
});

// API endpoints
app.get('/api/roster', (req, res) => {
  db.all('SELECT id, name FROM roster ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ roster: rows });
  });
});

app.post('/api/roster', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run('INSERT INTO roster (name) VALUES (?)', [name], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, name });
  });
});

app.get('/api/day/:date', (req, res) => {
  const { date } = req.params;
  db.all('SELECT student_id, type, class_name, score FROM grades WHERE date = ?', [date], [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const scoresById = {};
    rows.forEach(row => {
      if (!scoresById[row.student_id]) {
        scoresById[row.student_id] = { assignments: {}, tests: {} };
      }
      scoresById[row.student_id][row.type][row.class_name] = row.score;
    });
    res.json({ date, scoresById });
  });
});

app.post('/api/day/:date', (req, res) => {
  const { date } = req.params;
  const { scoresById } = req.body;
  if (!scoresById || typeof scoresById !== 'object') {
    return res.status(400).json({ error: 'scoresById is required' });
  }

  // First delete existing grades for this date
  db.run('DELETE FROM grades WHERE date = ?', [date], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Insert new grades
    const stmt = db.prepare('INSERT INTO grades (student_id, date, type, class_name, score) VALUES (?, ?, ?, ?, ?)');
    let inserts = 0;
    for (const studentId in scoresById) {
      const studentData = scoresById[studentId];
      for (const type in studentData) {
        for (const className in studentData[type]) {
          const score = studentData[type][className];
          stmt.run(studentId, date, type, className, score);
          inserts++;
        }
      }
    }
    stmt.finalize();
    res.json({ message: 'Grades saved', inserts });
  });
});

// Provide a favicon so browsers stop requesting a non-existent ICO file
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'assets', 'BEST_logo_small.jpg'));
});

// Serve static files from current directory (no build step)
app.use(express.static(__dirname, { extensions:['html'] }));

// Fallback to index.html (not strictly needed here but future-proof)
app.get('*', (req,res) => {
  res.sendFile(path.join(__dirname,'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`BEST Grading App running on http://localhost:${PORT}`));
