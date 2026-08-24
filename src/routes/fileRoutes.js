const express = require("express");
const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const supabase = require("../config/supabase");
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
router.use(authMiddleware);

// 1. Static Routes
router.get("/starred", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("owner_id", req.user.id)
            .eq("is_starred", true)
            .eq("is_deleted", false);

        if (error) throw error;
        return res.status(200).json({ success: true, files: data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});
router.get("/shared-with-me", fileController.getSharedWithMe);
router.get("/trash", fileController.getTrashFiles);
router.post("/upload", uploadMiddleware.single("file"), fileController.uploadFile); // 🔴 Single correct upload route
router.get("/", fileController.getFiles);
router.get("/search", fileController.searchFiles);
router.get("/folder/:folderId", fileController.getFilesByFolder);
// Add this with your other dynamic /:id routes
router.post("/:id/version", authMiddleware, upload.single("file"), fileController.uploadFileVersion);
// 2. Dynamic Routes
router.get("/:id/download", fileController.downloadFile);

router.put("/:id/star", async (req, res) => {
    try {
        const { is_starred } = req.body;
        const { data, error } = await supabase
            .from("files")
            .update({ is_starred, updated_at: new Date().toISOString() })
            .eq("id", req.params.id)
            .eq("owner_id", req.user.id)
            .select()
            .single();

        if (error) throw error;
        return res.status(200).json({ success: true, message: "File star updated", file: data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


router.put("/:id/share", fileController.updateFileShare);
router.put("/:id/restore", fileController.restoreFile);
router.delete("/:id/permanent", fileController.permanentlyDeleteFile);
router.patch("/:id", fileController.renameFile);
router.delete("/:id", fileController.deleteFile);

module.exports = router;