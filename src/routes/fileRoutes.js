const express = require("express");
const fileController = require("../controllers/fileController");
const authMiddleware = require("../middleware/authMiddleware");
const uploadMiddleware = require("../middleware/uploadMiddleware");
const supabase = require("../config/supabase");
const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage()
});

const router = express.Router();

// All file routes require authentication
router.use(authMiddleware);


// =====================================================
// STATIC ROUTES
// =====================================================

// Starred files
router.get("/starred", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("owner_id", req.user.id)
            .eq("is_starred", true)
            .eq("is_deleted", false);

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            files: data
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});


// Shared with me
router.get(
    "/shared-with-me",
    fileController.getSharedWithMe
);


// Trash
router.get(
    "/trash",
    fileController.getTrashFiles
);


// Upload
router.post(
    "/upload",
    uploadMiddleware.single("file"),
    fileController.uploadFile
);


// Get all files
router.get(
    "/",
    fileController.getFiles
);


// Search
router.get(
    "/search",
    fileController.searchFiles
);


// Files by folder
router.get(
    "/folder/:folderId",
    fileController.getFilesByFolder
);


// =====================================================
// FILE VERSION
// =====================================================

router.post(
    "/:id/version",
    upload.single("file"),
    fileController.uploadFileVersion
);


// =====================================================
// DYNAMIC FILE ROUTES
// =====================================================

// Download
router.get(
    "/:id/download",
    fileController.downloadFile
);


// Star / unstar
router.put(
    "/:id/star",
    async (req, res) => {
        try {
            const { is_starred } = req.body;

            const { data, error } = await supabase
                .from("files")
                .update({
                    is_starred,
                    updated_at: new Date().toISOString()
                })
                .eq("id", req.params.id)
                .eq("owner_id", req.user.id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return res.status(200).json({
                success: true,
                message: "File star updated",
                file: data
            });

        } catch (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }
);


// Legacy file share update
router.put(
    "/:id/share",
    fileController.updateFileShare
);


// Restore
router.put(
    "/:id/restore",
    fileController.restoreFile
);


// Permanent delete
router.delete(
    "/:id/permanent",
    fileController.permanentlyDeleteFile
);


// Rename
router.patch(
    "/:id",
    fileController.renameFile
);


// Soft delete
router.delete(
    "/:id",
    fileController.deleteFile
);


module.exports = router;