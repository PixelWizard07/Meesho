const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare(
    'SELECT * FROM panel_users WHERE username = ? OR email = ?'
  ).get(username, username);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  db.prepare('UPDATE panel_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const token = generateToken({ id: user.id, username: user.username, role: user.role });

  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, username, email, role, created_at, last_login FROM panel_users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Change password
router.post('/change-password', authenticateToken, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Both passwords required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const user = db.prepare('SELECT * FROM panel_users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password incorrect' });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE panel_users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Password updated successfully' });
});

// Create additional panel user (admin only)
router.post('/create-user', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { username, email, password, role = 'viewer' } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password required' });
  }

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO panel_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, email, hash, role);
    res.status(201).json({ id: result.lastInsertRowid, username, email, role });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;
