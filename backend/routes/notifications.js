const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  const notifications = db.prepare(`
    SELECT n.*, a.account_name
    FROM notifications n
    LEFT JOIN meesho_accounts a ON n.account_id = a.id
    WHERE n.panel_user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);
  res.json(notifications);
});

router.post('/mark-read', authenticateToken, (req, res) => {
  const { ids } = req.body;
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders}) AND panel_user_id = ?`).run(...ids, req.user.id);
  } else {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE panel_user_id = ?').run(req.user.id);
  }
  res.json({ message: 'Marked as read' });
});

router.get('/unread-count', authenticateToken, (req, res) => {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE panel_user_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ count: result.count });
});

module.exports = router;
