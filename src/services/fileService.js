const supabase = require("../config/supabase");

/**
 * Upload file
 */
const uploadFile = async (userId, file, folderId = null) => {
    try {
        console.log("File received:", file);

        // Sanitize filename
        const sanitizedFilename = file.originalname
            .replace(/[^a-zA-Z0-9_.-]/g, "_")
            .toLowerCase();

        // Unique storage path
        const filePath = `${userId}/${Date.now()}-${sanitizedFilename}`;

        // Upload to Supabase Storage
        const { error: storageError } = await supabase.storage
            .from("files")
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false
            });

        if (storageError) {
            throw new Error(storageError.message);
        }

        // Public URL kept for existing frontend compatibility
        const { data: publicUrlData } = supabase.storage
            .from("files")
            .getPublicUrl(filePath);

        // Save metadata
        const { data, error } = await supabase
            .from("files")
            .insert([
                {
                    name: file.originalname,
                    storage_key: filePath,
                    file_url: publicUrlData.publicUrl,
                    mime_type: file.mimetype,
                    size_bytes: file.size,
                    owner_id: userId,
                    folder_id: folderId
                }
            ])
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data;

    } catch (error) {
        throw new Error(error.message);
    }
};


/**
 * Get owner's files
 */
const getFiles = async (userId, limit = 50, cursor = null) => {
    try {
        let query = supabase
            .from("files")
            .select("*")
            .eq("owner_id", userId)
            .eq("is_deleted", false)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt("created_at", cursor);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(error.message);
        }

        const filesWithUrls = data.map(file => {
            if (!file.file_url && file.storage_key) {
                const { data: urlData } = supabase.storage
                    .from("files")
                    .getPublicUrl(file.storage_key);

                return {
                    ...file,
                    file_url: urlData.publicUrl
                };
            }

            return file;
        });

        let nextCursor = null;

        if (filesWithUrls.length === limit) {
            nextCursor =
                filesWithUrls[filesWithUrls.length - 1].created_at;
        }

        return {
            files: filesWithUrls,
            nextCursor
        };

    } catch (error) {
        throw new Error(error.message);
    }
};


/**
 * Get single file - OWNER ONLY
 */
const getFileById = async (fileId, userId) => {
    try {
        const { data, error } = await supabase
            .from("files")
            .select("*")
            .eq("id", fileId)
            .eq("owner_id", userId)
            .eq("is_deleted", false)
            .single();

        if (error) {
            throw new Error(error.message);
        }

        return data;

    } catch (error) {
        throw new Error(error.message);
    }
};


/**
 * Soft delete
 */
const deleteFile = async (fileId, userId) => {
    const { data: file, error } = await supabase
        .from("files")
        .update({
            is_deleted: true,
            updated_at: new Date().toISOString()
        })
        .eq("id", fileId)
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!file) {
        const notFoundError = new Error("File not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    return file;
};


/**
 * Restore deleted file
 */
const restoreFile = async (fileId, userId) => {
    const { data: file, error } = await supabase
        .from("files")
        .update({
            is_deleted: false,
            updated_at: new Date().toISOString()
        })
        .eq("id", fileId)
        .eq("owner_id", userId)
        .eq("is_deleted", true)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!file) {
        const notFoundError = new Error("Deleted file not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    return file;
};


/**
 * Get trash
 */
const getTrashFiles = async (userId) => {
    const { data: files, error } = await supabase
        .from("files")
        .select("*")
        .eq("owner_id", userId)
        .eq("is_deleted", true)
        .order("updated_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return files;
};


/**
 * Rename file
 */
const renameFile = async (fileId, userId, name) => {
    const { data: file, error } = await supabase
        .from("files")
        .update({
            name: name.trim(),
            updated_at: new Date().toISOString()
        })
        .eq("id", fileId)
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!file) {
        const notFoundError = new Error("File not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    return file;
};


/**
 * Move file
 */
const moveFile = async (fileId, userId, folderId) => {

    if (folderId) {
        const { data: folder, error: folderError } = await supabase
            .from("folders")
            .select("id")
            .eq("id", folderId)
            .eq("owner_id", userId)
            .eq("is_deleted", false)
            .maybeSingle();

        if (folderError) {
            throw new Error(folderError.message);
        }

        if (!folder) {
            const notFoundError =
                new Error("Destination folder not found");

            notFoundError.statusCode = 404;

            throw notFoundError;
        }
    }

    const { data: file, error } = await supabase
        .from("files")
        .update({
            folder_id: folderId || null,
            updated_at: new Date().toISOString()
        })
        .eq("id", fileId)
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .select("*")
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!file) {
        const notFoundError = new Error("File not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    return file;
};


/**
 * Get signed download URL
 *
 * IMPORTANT:
 * Owner can always download.
 * Viewer/Editor can download if the file
 * has been shared with that user.
 */
const getFileDownloadUrl = async (fileId, userId) => {

    // First find the file
    const { data: file, error: fileError } = await supabase
        .from("files")
        .select("id, name, storage_key, mime_type, owner_id, is_deleted")
        .eq("id", fileId)
        .eq("is_deleted", false)
        .maybeSingle();

    if (fileError) {
        throw new Error(fileError.message);
    }

    if (!file) {
        const notFoundError = new Error("File not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    // OWNER
    if (file.owner_id !== userId) {

        // Check whether file was shared with current user
        const { data: share, error: shareError } = await supabase
            .from("shares")
            .select("id, role")
            .eq("resource_type", "file")
            .eq("resource_id", fileId)
            .eq("grantee_user_id", userId)
            .maybeSingle();

        if (shareError) {
            throw new Error(shareError.message);
        }

        // Not shared
        if (!share) {
            const permissionError =
                new Error("You do not have permission to download this file");

            permissionError.statusCode = 403;

            throw permissionError;
        }
    }

    // Create short-lived signed URL
    const { data, error: storageError } = await supabase.storage
        .from("files")
        .createSignedUrl(
            file.storage_key,
            60 * 60
        );

    if (storageError) {
        throw new Error(storageError.message);
    }

    return {
        file,
        downloadUrl: data.signedUrl
    };
};


/**
 * Get files inside folder
 */
const getFilesByFolder = async (folderId, userId) => {

    const { data: folder, error: folderError } = await supabase
        .from("folders")
        .select("id")
        .eq("id", folderId)
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .maybeSingle();

    if (folderError) {
        throw new Error(folderError.message);
    }

    if (!folder) {
        const notFoundError = new Error("Folder not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    const { data: files, error } = await supabase
        .from("files")
        .select("*")
        .eq("folder_id", folderId)
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    const filesWithUrls = files.map(file => {

        if (!file.file_url && file.storage_key) {

            const { data: urlData } = supabase.storage
                .from("files")
                .getPublicUrl(file.storage_key);

            return {
                ...file,
                file_url: urlData.publicUrl
            };
        }

        return file;
    });

    return filesWithUrls;
};


/**
 * Search files
 */
const searchFiles = async (query, userId) => {

    const { data: files, error } = await supabase
        .from("files")
        .select("*")
        .eq("owner_id", userId)
        .eq("is_deleted", false)
        .ilike("name", `%${query}%`)
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return files;
};


/**
 * Permanently delete file
 */
const permanentlyDeleteFile = async (fileId, userId) => {

    const { data: file, error: fileError } = await supabase
        .from("files")
        .select("*")
        .eq("id", fileId)
        .eq("owner_id", userId)
        .eq("is_deleted", true)
        .maybeSingle();

    if (fileError) {
        throw new Error(fileError.message);
    }

    if (!file) {
        const notFoundError =
            new Error("Deleted file not found");

        notFoundError.statusCode = 404;

        throw notFoundError;
    }

    // Remove from Supabase Storage
    if (file.storage_key) {

        const { error: storageError } = await supabase.storage
            .from("files")
            .remove([file.storage_key]);

        if (storageError) {
            throw new Error(storageError.message);
        }
    }

    // Delete database record
    const { error: deleteError } = await supabase
        .from("files")
        .delete()
        .eq("id", fileId)
        .eq("owner_id", userId);

    if (deleteError) {
        throw new Error(deleteError.message);
    }

    return {
        id: file.id,
        name: file.name
    };
};


module.exports = {
    uploadFile,
    getFiles,
    getFileById,
    deleteFile,
    restoreFile,
    getTrashFiles,
    renameFile,
    moveFile,
    getFileDownloadUrl,
    getFilesByFolder,
    searchFiles,
    permanentlyDeleteFile
};