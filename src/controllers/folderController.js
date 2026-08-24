const folderService = require("../services/folderService");


const createFolder = async (req, res) => {
    try {
        const { name, parentId } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Folder name is required"
            });
        }

        const folder = await folderService.createFolder({
            name,
            parentId,
            ownerId: req.user.id
        });

        res.status(201).json({
            success: true,
            message: "Folder created successfully",
            folder
        });

    } catch (error) {
        console.error("Create folder error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create folder"
        });
    }
};


const getFolderChildren = async (req, res) => {
    try {
        const { id } = req.params;

        const folders = await folderService.getFolderChildren({
            folderId: id,
            ownerId: req.user.id
        });

        res.status(200).json({
            success: true,
            folders
        });

    } catch (error) {
        console.error("Get folder children error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to get folder children"
        });
    }
};


const renameFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Folder name is required"
            });
        }

        const folder = await folderService.renameFolder({
            folderId: id,
            name,
            ownerId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: "Folder renamed successfully",
            folder
        });

    } catch (error) {
        console.error("Rename folder error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to rename folder"
        });
    }
};


const deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;

        const folder = await folderService.deleteFolder({
            folderId: id,
            ownerId: req.user.id
        });

        res.status(200).json({
            success: true,
            message: "Folder deleted successfully",
            folder
        });

    } catch (error) {
        console.error("Delete folder error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to delete folder"
        });
    }
};
const restoreFolder = async (req, res) => {
    try {
        const { id } = req.params;

        const folder = await folderService.restoreFolder({
            folderId: id,
            ownerId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: "Folder restored successfully",
            folder
        });

    } catch (error) {
        console.error("Restore folder error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to restore folder"
        });
    }
};
const searchFolders = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const folders = await folderService.searchFolders({
            query: query.trim(),
            ownerId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: "Folders searched successfully",
            folders
        });

    } catch (error) {
        console.error("Search folders error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to search folders"
        });
    }
};
const getTrashFolders = async (req, res) => {
    try {
        const folders = await folderService.getTrashFolders({
            ownerId: req.user.id
        });

        return res.status(200).json({
            success: true,
            message: "Trash folders fetched successfully",
            folders
        });

    } catch (error) {
        console.error("Get trash folders error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to fetch trash folders"
        });
    }
};
const permanentlyDeleteFolder = async (req, res) => {
    try {
        const { id } = req.params;

        const result =
            await folderService.permanentlyDeleteFolder({
                folderId: id,
                ownerId: req.user.id
            });

        return res.status(200).json({
            success: true,
            message: "Folder permanently deleted successfully",
            result
        });

    } catch (error) {
        console.error(
            "Permanent delete folder error:",
            error
        );

        return res.status(error.statusCode || 500).json({
            success: false,
            message:
                error.message ||
                "Failed to permanently delete folder"
        });
    }
};
const getRootFolders = async (req, res) => {
    try {
        // We pass null or undefined for folderId to get root-level folders
        const folders = await folderService.getFolderChildren({
            folderId: null,
            ownerId: req.user.id
        });

        res.status(200).json({
            success: true,
            folders
        });

    } catch (error) {
        console.error("Get root folders error:", error);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to get root folders"
        });
    }
};
const starFolder = async (req, res) => {
    try {
        const folderId = req.params.id;
        const userId = req.user.id;
        const { is_starred } = req.body;

        const { data, error } = await supabase
            .from("folders")
            .update({ is_starred, updated_at: new Date().toISOString() })
            .eq("id", folderId)
            .eq("owner_id", userId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        res.status(200).json({ message: "Folder star status updated", folder: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getStarredFolders = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from("folders")
            .select("*")
            .eq("owner_id", userId)
            .eq("is_starred", true)
            .eq("is_deleted", false);

        if (error) throw new Error(error.message);
        res.status(200).json({ folders: data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
module.exports = {
    createFolder,
    getFolderChildren,
    renameFolder,
    deleteFolder,
    restoreFolder,
    searchFolders,
    getTrashFolders,
    permanentlyDeleteFolder,
    getRootFolders,
    starFolder,
    getStarredFolders
};
