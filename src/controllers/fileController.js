const fileService = require("../services/fileService");
const supabase = require("../config/supabase");

const uploadFile = async (req, res) => {
    try {
        console.log("File received:", req.file);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "File is required"
            });
        }

        const { folderId } = req.body;

        const uploadedFile = await fileService.uploadFile(
            req.user.id,
            req.file,
            req.body.folderId
        );

        return res.status(201).json({
            success: true,
            message: "File uploaded successfully",
            file: uploadedFile
        });

    } catch (error) {
        console.error("Upload file error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to upload file"
        });
    }
};

const getFiles = async (req, res) => {
    try {
        // Parse limit from query, default to 50, max out at 100 for safety
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const cursor = req.query.cursor || null;

        const result = await fileService.getFiles(req.user.id, limit, cursor);

        return res.status(200).json({
            success: true,
            message: "Files fetched successfully",
            files: result.files,
            nextCursor: result.nextCursor
        });

    } catch (error) {
        console.error("Get files error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch files"
        });
    }
};

const getFileById = async (req, res) => {
    try {
        const file = await fileService.getFileById(
            req.params.id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "File fetched successfully",
            file
        });

    } catch (error) {
        console.error("Get file error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch file"
        });
    }
};

const deleteFile = async (req, res) => {
    try {
        const file = await fileService.deleteFile(
            req.params.id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "File moved to trash successfully",
            file
        });

    } catch (error) {
        console.error("Delete file error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to delete file"
        });
    }
};

const restoreFile = async (req, res) => {
    try {
        const file = await fileService.restoreFile(
            req.params.id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "File restored successfully",
            file
        });

    } catch (error) {
        console.error("Restore file error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to restore file"
        });
    }
};

const getTrashFiles = async (req, res) => {
    try {
        const files = await fileService.getTrashFiles(
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Trash files fetched successfully",
            files
        });

    } catch (error) {
        console.error("Get trash files error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch trash files"
        });
    }
};

const renameFile = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "File name is required"
            });
        }

        const file = await fileService.renameFile(
            req.params.id,
            req.user.id,
            name
        );

        return res.status(200).json({
            success: true,
            message: "File renamed successfully",
            file
        });

    } catch (error) {
        console.error("Rename file error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to rename file"
        });
    }
};

const moveFile = async (req, res) => {
    try {
        const { folderId } = req.body;

        const file = await fileService.moveFile(
            req.params.id,
            req.user.id,
            folderId
        );

        return res.status(200).json({
            success: true,
            message: "File moved successfully",
            file
        });

    } catch (error) {
        console.error("Move file error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to move file"
        });
    }
};

const downloadFile = async (req, res) => {
    try {
        const result = await fileService.getFileDownloadUrl(
            req.params.id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Download URL generated successfully",
            file: result.file,
            downloadUrl: result.downloadUrl
        });

    } catch (error) {
        console.error("Download file error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to generate download URL"
        });
    }
};

const getFilesByFolder = async (req, res) => {
    try {
        const files = await fileService.getFilesByFolder(
            req.params.folderId,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Folder files fetched successfully",
            files
        });

    } catch (error) {
        console.error("Get folder files error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch folder files"
        });
    }
};

const searchFiles = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const files = await fileService.searchFiles(
            query.trim(),
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Files searched successfully",
            files
        });

    } catch (error) {
        console.error("Search files error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to search files"
        });
    }
};

const permanentlyDeleteFile = async (req, res) => {
    try {
        const deletedFile =
            await fileService.permanentlyDeleteFile(
                req.params.id,
                req.user.id
            );

        return res.status(200).json({
            success: true,
            message: "File permanently deleted successfully",
            file: deletedFile
        });

    } catch (error) {
        console.error(
            "Permanent delete file error:",
            error
        );

        return res.status(error.statusCode || 500).json({
            success: false,
            message:
                error.message ||
                "Failed to permanently delete file"
        });
    }
};

const starFile = async (req, res) => {
    try {
        const fileId = req.params.id;
        const userId = req.user.id;
        const { is_starred } = req.body;

        const { data, error } = await supabase
            .from("files")
            .update({ is_starred, updated_at: new Date().toISOString() })
            .eq("id", fileId)
            .eq("owner_id", userId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        res.status(200).json({ message: "File star status updated", file: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getStarredFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("owner_id", userId)
            .eq("is_starred", true)
            .eq("is_deleted", false);

        if (error) throw new Error(error.message);
        res.status(200).json({ files: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const updateFileShare = async (req, res) => {
    try {
        const { id } = req.params;
        const { accessType, role } = req.body;
        const userId = req.user.id; // from authMiddleware

        // Update the file in Supabase
        const { data, error } = await supabase
            .from("files")
            .update({
                access_type: accessType,
                access_role: role,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("owner_id", userId)
            .select()
            .single();

        if (error) throw error;

        return res.status(200).json({ success: true, file: data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

const getSharedWithMe = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("access_type", "public") // Fetch files that have been shared
            .eq("is_deleted", false)
            .order("updated_at", { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, files: data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// 🔴 NEW: File versioning upload logic
const uploadFileVersion = async (req, res) => {
    try {
        const { id: fileId } = req.params;
        const userId = req.user.id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, message: "No file provided" });
        }

        // 1. Verify the original file exists and belongs to the user
        const { data: existingFile, error: fetchError } = await supabase
            .from("files")
            .select("*")
            .eq("id", fileId)
            .eq("owner_id", userId)
            .single();

        if (fetchError || !existingFile) {
            return res.status(404).json({ success: false, message: "Original file not found" });
        }

        // 2. Upload the new file version to Supabase Storage
        const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_').toLowerCase();
        const filePath = `${userId}/versions/${Date.now()}-${sanitizedFilename}`;

        const { error: storageError } = await supabase.storage
            .from("files")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) throw new Error(storageError.message);

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from("files")
            .getPublicUrl(filePath);

        // 3. Figure out the next version number
        const { data: versions } = await supabase
            .from("file_versions")
            .select("version_number")
            .eq("file_id", fileId)
            .order("version_number", { ascending: false })
            .limit(1);

        const nextVersion = (versions && versions.length > 0) ? versions[0].version_number + 1 : 2;

        // 4. (Optional but good practice) If this is the FIRST new version, save the ORIGINAL file as version 1
        if (nextVersion === 2) {
            await supabase.from("file_versions").insert([{
                file_id: fileId,
                version_number: 1,
                storage_key: existingFile.storage_key,
                size_bytes: existingFile.size_bytes
            }]);
        }

        // 5. Insert the new version into file_versions
        const { data: newVersion, error: versionError } = await supabase
            .from("file_versions")
            .insert([{
                file_id: fileId,
                version_number: nextVersion,
                storage_key: filePath,
                size_bytes: file.size
            }])
            .select()
            .single();

        if (versionError) throw new Error(versionError.message);

        // 6. Update the main "files" table to point to this new version
        const { data: updatedFile, error: updateError } = await supabase
            .from("files")
            .update({
                name: file.originalname,
                storage_key: filePath,
                file_url: publicUrlData.publicUrl,
                mime_type: file.mimetype,
                size_bytes: file.size,
                version_id: newVersion.id, // Point to the new version
                updated_at: new Date().toISOString()
            })
            .eq("id", fileId)
            .select()
            .single();

        if (updateError) throw new Error(updateError.message);

        return res.status(200).json({ success: true, file: updatedFile, version: newVersion });

    } catch (err) {
        console.error("Upload version error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Merged exports block
module.exports = {
    uploadFile,
    getFiles,
    getFileById,
    deleteFile,
    restoreFile,
    getTrashFiles,
    renameFile,
    moveFile,
    downloadFile,
    getFilesByFolder,
    searchFiles,
    permanentlyDeleteFile,
    starFile,
    getStarredFiles,
    updateFileShare,
    getSharedWithMe,
    uploadFileVersion 
};