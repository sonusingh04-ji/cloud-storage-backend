const express = require("express");
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Add this alongside your other routes
router.put('/profile', authMiddleware, upload.single('avatar'), authController.updateProfile);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.getMe);
router.post("/logout", authMiddleware, authController.logout);
// POST /api/auth/google
router.post("/google", authController.googleLogin);
module.exports = router;