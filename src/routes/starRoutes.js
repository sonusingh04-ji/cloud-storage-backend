const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const starController = require("../controllers/starController");

router.use(authMiddleware);

// POST /api/stars
router.post("/", starController.starItem);

// DELETE /api/stars
router.delete("/", starController.unstarItem);

module.exports = router;