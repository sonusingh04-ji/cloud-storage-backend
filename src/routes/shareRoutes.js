const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const shareController = require("../controllers/shareController");

router.use(authMiddleware);

// POST /api/shares - Share with a specific user
router.post("/", shareController.createShare);

// POST /api/shares/link - Create a public link
router.post("/link", shareController.createPublicLink);

module.exports = router;