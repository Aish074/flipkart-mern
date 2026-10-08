const express = require('express');
const { createCampaign, getAllCampaigns, updateCampaignStatus, deleteCampaign } = require('../controllers/campaignController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/admin/campaigns')
    .get(isAuthenticatedUser, authorizeRoles("admin"), getAllCampaigns)
    .post(isAuthenticatedUser, authorizeRoles("admin"), createCampaign);

router.route('/admin/campaign/:id')
    .put(isAuthenticatedUser, authorizeRoles("admin"), updateCampaignStatus)
    .delete(isAuthenticatedUser, authorizeRoles("admin"), deleteCampaign);

module.exports = router;