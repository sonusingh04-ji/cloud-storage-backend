const express = require("express");
const folderController = require("../controllers/folderController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authMiddleware);

// 🔴 PUT STATIC ROUTES FIRST 🔴
router.get("/starred", folderController.getStarredFolders);
router.get("/trash", folderController.getTrashFolders);

// Create folder
router.post("/", folderController.createFolder);

// Get root folders (Main Dashboard view)
router.get("/", folderController.getRootFolders);

// Search folders
router.get("/search", folderController.searchFolders);

// Get folder children
router.get("/:id/children", folderController.getFolderChildren);

// 🔴 PUT DYNAMIC /:id ROUTES LAST 🔴
router.put("/:id/star", folderController.starFolder);
router.patch("/:id/restore", folderController.restoreFolder);
router.put("/:id/restore", folderController.restoreFolder);
router.delete("/:id/permanent", folderController.permanentlyDeleteFolder);
router.patch("/:id", folderController.renameFolder);
router.delete("/:id", folderController.deleteFolder);

module.exports = router;