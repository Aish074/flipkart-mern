const express = require('express');
const { getAds } = require('../controllers/adController');

const router = express.Router();

router.route('/ads').get(getAds);

module.exports = router;