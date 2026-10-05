const express = require('express');
const { trackEvent } = require('../controllers/eventController');
const { optionalAuth } = require('../middlewares/auth');

const router = express.Router();

router.route('/events').post(optionalAuth, trackEvent);

module.exports = router;