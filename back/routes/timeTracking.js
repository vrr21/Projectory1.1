const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  createTimeEntry,
  updateTimeEntry,
  getTimeEntries
} = require('../controllers/timeTController');

router.get('/time-tracking', verifyToken, getTimeEntries);
router.post('/time-tracking', verifyToken, createTimeEntry);
router.put('/time-tracking/:id', verifyToken, updateTimeEntry);

module.exports = router;
