const express = require("express");
const multer = require("multer");

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

router.post("/register", authController.register);

router.post("/login", authController.login);

router.post("/google", authController.googleLogin);

router.get("/me", authMiddleware, authController.getMe);

router.post("/logout", authMiddleware, authController.logout);

router.put(
    "/profile",
    authMiddleware,
    upload.single("avatar"),
    authController.updateProfile
);

module.exports = router;