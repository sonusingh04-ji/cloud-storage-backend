const express = require("express");

const authMiddleware =
    require("../middleware/authMiddleware");

const shareController =
    require("../controllers/shareController");

const router = express.Router();


// All normal sharing operations require login
router.use(authMiddleware);


// =====================================================
// USER SHARING
// =====================================================

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


// Revoke user access
router.delete(
    "/:id",
    shareController.revokeShare
);


// =====================================================
// SHARED WITH ME
// =====================================================

router.get(
    "/shared-with-me",
    shareController.getSharedWithMe
);


// =====================================================
// PUBLIC LINKS
// =====================================================

// Create public link
router.post(
    "/link",
    shareController.createPublicLink
);


// Revoke/delete public link
router.delete(
    "/link/:id",
    shareController.revokePublicLink
);


module.exports = router;