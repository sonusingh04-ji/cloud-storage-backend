const shareService = require("../services/shareService");

const createShare = async (req, res) => {
    try {
        const { resourceType, resourceId, granteeUserId, role } = req.body;
        const share = await shareService.shareWithUser(resourceType, resourceId, granteeUserId, role, req.user.id);

        res.status(201).json({ success: true, message: "Shared successfully", share });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const createPublicLink = async (req, res) => {
    try {
        const { resourceType, resourceId, expiresAt, password } = req.body;
        const link = await shareService.createPublicLink(resourceType, resourceId, expiresAt, password, req.user.id);

        res.status(201).json({ success: true, message: "Link generated", link });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createShare, createPublicLink };