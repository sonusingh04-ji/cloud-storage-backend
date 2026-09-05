const express = require("express");

const shareController =
    require("../controllers/shareController");

const router = express.Router();


// Public link resolver
// No authentication required
router.get(
    "/:token",
    shareController.resolvePublicLink
);


// Password-protected public link access
router.post(
    "/:token/access",
    shareController.accessPublicLink
);


module.exports = router;