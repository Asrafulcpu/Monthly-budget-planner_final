const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'frontend_public')));

// Database file path
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
        transactions: [],
        categories: [
            { name: 'Food & Groceries', icon: 'utensils', budget: 600, spent: 0 },
            { name: 'Housing', icon: 'home', budget: 1200, spent: 0 },
            { name: 'Transportation', icon: 'car', budget: 300, spent: 0 },
            { name: 'Utilities', icon: 'bolt', budget: 250, spent: 0 },
            { name: 'Shopping', icon: 'shopping-cart', budget: 200, spent: 0 },
            { name: 'Entertainment', icon: 'glass-cheers', budget: 150, spent: 0 }
        ]
    }));
}

// Helper function to read database
function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Helper function to write to database
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// API Routes

// Get all transactions
app.get('/api/transactions', (req, res) => {
    const db = readDB();
    res.json(db.transactions);
});

// Add a new transaction
app.post('/api/transactions', (req, res) => {
    const db = readDB();
    const transaction = {
        id: Date.now(),
        ...req.body
    };
    db.transactions.push(transaction);
    writeDB(db);
    res.status(201).json(transaction);
});

// Delete a transaction
app.delete('/api/transactions/:id', (req, res) => {
    const db = readDB();
    db.transactions = db.transactions.filter(t => t.id !== parseInt(req.params.id));
    writeDB(db);
    res.status(204).send();
});

// Get all categories
app.get('/api/categories', (req, res) => {
    const db = readDB();
    res.json(db.categories);
});

// Add a new category
app.post('/api/categories', (req, res) => {
    const db = readDB();
    const category = {
        ...req.body,
        spent: 0
    };
    db.categories.push(category);
    writeDB(db);
    res.status(201).json(category);
});

// Serve the main HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});