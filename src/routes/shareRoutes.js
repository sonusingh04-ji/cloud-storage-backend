const express = require("express");

const authMiddleware =
    require("../middleware/authMiddleware");

const shareController =
    require("../controllers/shareController");

const router = express.Router();

router.use(authMiddleware);

// Share with user/email
router.post(
    "/",
    shareController.createShare
);

// Get people who have access
router.get(
    "/:resourceType/:resourceId",
    shareController.getShares
);

// Revoke access
router.delete(
    "/:id",
    shareController.revokeShare
);

// Shared with me
router.get(
    "/shared-with-me",
    shareController.getSharedWithMe
);

// Public link
router.post(
    "/link",
    shareController.createPublicLink
);

module.exports = router;