const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// SQLite setup
const db = new sqlite3.Database('./budget.db');

// Initialize database and create transactions table if it doesn't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL
  )`);
});

// Helper function for error handling
const handleDbError = (err, res) => {
  if (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
    return true;
  }
  return false;
};

// Routes

// Get all transactions for a specific month
app.get('/api/transactions', (req, res) => {
  const { month } = req.query; // format: YYYY-MM
  if (!month) {
    return res.status(400).json({ error: "Month parameter is required" });
  }

  db.all(
    `SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC`,
    [`${month}-%`],
    (err, rows) => {
      if (handleDbError(err, res)) return;
      res.json(rows);
    }
  );
});

// Add a new transaction
app.post('/api/transactions', (req, res) => {
  const { description, amount, type, category, date } = req.body;

  if (!description || !amount || !type || !category || !date) {
    return res.status(400).json({ error: "All fields are required" });
  }

  db.run(
    `INSERT INTO transactions (description, amount, type, category, date)
     VALUES (?, ?, ?, ?, ?)`,
    [description, amount, type, category, date],
    function (err) {
      if (handleDbError(err, res)) return;
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Get monthly summary (income, expenses, and balance)
app.get('/api/summary', (req, res) => {
  const { month } = req.query;
  if (!month) {
    return res.status(400).json({ error: "Month parameter is required" });
  }

  db.all(
    `SELECT type, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY type`,
    [`${month}-%`],
    (err, rows) => {
      if (handleDbError(err, res)) return;

      let income = 0;
      let expense = 0;

      rows.forEach(row => {
        if (row.type === 'income') income = row.total;
        else if (row.type === 'expense') expense = row.total;
      });

      const balance = income - expense;
      res.json({ income, expense, balance });
    }
  );
});

// DELETE transaction by ID
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM transactions WHERE id = ?`, [id], function (err) {
    if (handleDbError(err, res)) return;
    if (this.changes === 0) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted' });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
