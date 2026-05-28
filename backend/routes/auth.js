const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const emailSvc = require('../services/emailService');

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

// List all panel users (admin only)
router.get('/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const users = db.prepare('SELECT id, username, email, role, created_at, last_login FROM panel_users ORDER BY created_at DESC').all();
  const withCounts = users.map(u => {
    const acCount = db.prepare("SELECT COUNT(*) AS n FROM meesho_accounts WHERE panel_user_id=? AND status='active'").get(u.id);
    return { ...u, account_count: acCount.n };
  });
  res.json(withCounts);
});

// Create additional panel user (admin only)
router.post('/create-user', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  const { username, email, password, role = 'viewer' } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO panel_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(username, email, hash, role);

    // Notify admin
    const admin = db.prepare('SELECT email, username FROM panel_users WHERE id=?').get(req.user.id);
    if (admin?.email) {
      emailSvc.sendNewUserCreated({ to: admin.email, newUsername: username, newEmail: email, createdBy: admin.username }).catch(() => {});
    }

    res.status(201).json({ id: result.lastInsertRowid, username, email, role });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Delete panel user (admin only, cannot delete self)
router.delete('/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  const u = db.prepare('SELECT id FROM panel_users WHERE id=?').get(targetId);
  if (!u) return res.status(404).json({ error: 'User not found' });
  db.prepare('DELETE FROM panel_users WHERE id=?').run(targetId);
  res.json({ message: 'User deleted' });
});

// Update panel user (admin or self)
router.put('/users/:id', authenticateToken, (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.role !== 'admin' && targetId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  const { email, role, new_password } = req.body;
  if (role && req.user.role !== 'admin') return res.status(403).json({ error: 'Only admin can change roles' });
  const updates = [];
  const params = [];
  if (email) { updates.push('email=?'); params.push(email); }
  if (role && req.user.role === 'admin') { updates.push('role=?'); params.push(role); }
  if (new_password) {
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    updates.push('password_hash=?'); params.push(bcrypt.hashSync(new_password, 10));
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(targetId);
  try {
    db.prepare(`UPDATE panel_users SET ${updates.join(',')} WHERE id=?`).run(...params);
    res.json({ message: 'User updated' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
