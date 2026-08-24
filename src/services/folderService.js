const supabase = require("../config/supabase");


// =========================
// CREATE FOLDER
// =========================
const createFolder = async ({ name, parentId, ownerId }) => {
    // Verify parent folder if creating inside another folder
    if (parentId) {
        const { data: parent, error: parentError } = await supabase
            .from("folders")
            .select("id")
            .eq("id", parentId)
            .eq("owner_id", ownerId)
            .eq("is_deleted", false)
            .maybeSingle();

        if (parentError) {
            throw new Error(parentError.message);
        }

        if (!parent) {
            const error = new Error("Parent folder not found");
            error.statusCode = 404;
            throw error;
        }
    }

    const { data: folder, error } = await supabase
        .from("folders")
        .insert({
            name: name.trim(),
            owner_id: ownerId,
            parent_id: parentId || null
        })
        .select("id, name, owner_id, parent_id, created_at, updated_at")
        .single();

    if (error) {
        if (error.code === "23505") {
            const duplicateError = new Error(
                "A folder with this name already exists"
            );
            duplicateError.statusCode = 409;
            throw duplicateError;
        }

        throw new Error(error.message);
    }

    return folder;
};


// =========================
// GET FOLDER CHILDREN
// =========================
const getFolderChildren = async ({ folderId, ownerId }) => {
    // 1. Only verify requested folder if we are NOT at the root
    if (folderId) {
        const { data: parent, error: parentError } = await supabase
            .from("folders")
            .select("id")
            .eq("id", folderId)
            .eq("owner_id", ownerId)
            .eq("is_deleted", false)
            .maybeSingle();

        if (parentError) {
            throw new Error(parentError.message);
        }

        if (!parent) {
            const error = new Error("Folder not found");
            error.statusCode = 404;
            throw error;
        }
    }

    // 2. Build the query to fetch children
    let query = supabase
        .from("folders")
        .select(
            "id, name, owner_id, parent_id, created_at, updated_at"
        )
        .eq("owner_id", ownerId)
        .eq("is_deleted", false)
        .order("name", { ascending: true });

    // 3. Dynamically check for parent_id based on whether we are at root or not
    if (folderId) {
        query = query.eq("parent_id", folderId);
    } else {
        query = query.is("parent_id", null);
    }

    // 4. Execute the query
    const { data: folders, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    return folders;
};


// =========================
// RENAME FOLDER
// =========================
const renameFolder = async ({ folderId, name, ownerId }) => {
    const { data: folder, error } = await supabase
        .from("folders")
        .update({
            name: name.trim(),
            updated_at: new Date().toISOString()
        })
        .eq("id", folderId)
        .eq("owner_id", ownerId)
        .eq("is_deleted", false)
        .select("id, name, owner_id, parent_id, created_at, updated_at")
        .maybeSingle();

    if (error) {
        if (error.code === "23505") {
            const duplicateError = new Error(
                "A folder with this name already exists"
            );
            duplicateError.statusCode = 409;
            throw duplicateError;
        }

        throw new Error(error.message);
    }

    if (!folder) {
        const notFoundError = new Error("Folder not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    return folder;
};


// =========================
// SOFT DELETE FOLDER
// =========================
const deleteFolder = async ({ folderId, ownerId }) => {
    // Verify main folder
    const { data: existingFolder, error: findError } = await supabase
        .from("folders")
        .select("id, name")
        .eq("id", folderId)
        .eq("owner_id", ownerId)
        .eq("is_deleted", false)
        .maybeSingle();

    if (findError) {
        throw new Error(findError.message);
    }

    if (!existingFolder) {
        const notFoundError = new Error("Folder not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    // Get all active folders for the user
    const { data: allFolders, error: foldersError } = await supabase
        .from("folders")
        .select("id, parent_id")
        .eq("owner_id", ownerId)
        .eq("is_deleted", false);

    if (foldersError) {
        throw new Error(foldersError.message);
    }

    // Find all nested folders
    const folderIdsToDelete = [folderId];

    const findChildren = (parentId) => {
        const children = allFolders.filter(
            folder => folder.parent_id === parentId
        );

        for (const child of children) {
            folderIdsToDelete.push(child.id);
            findChildren(child.id);
        }
    };

    findChildren(folderId);

    const now = new Date().toISOString();

    // Soft delete all files inside folders
    const { error: filesError } = await supabase
        .from("files")
        .update({
            is_deleted: true,
            updated_at: now
        })
        .eq("owner_id", ownerId)
        .in("folder_id", folderIdsToDelete)
        .eq("is_deleted", false);

    if (filesError) {
        throw new Error(filesError.message);
    }

    // Soft delete folders
    const { error: updateError } = await supabase
        .from("folders")
        .update({
            is_deleted: true,
            updated_at: now
        })
        .eq("owner_id", ownerId)
        .in("id", folderIdsToDelete)
        .eq("is_deleted", false);

    if (updateError) {
        throw new Error(updateError.message);
    }

    return {
        id: existingFolder.id,
        name: existingFolder.name,
        deletedFolders: folderIdsToDelete.length
    };
};


// =========================
// RESTORE FOLDER
// =========================
const restoreFolder = async ({ folderId, ownerId }) => {
    // Verify deleted folder
    const { data: existingFolder, error: findError } = await supabase
        .from("folders")
        .select("id, name")
        .eq("id", folderId)
        .eq("owner_id", ownerId)
        .eq("is_deleted", true)
        .maybeSingle();

    if (findError) {
        throw new Error(findError.message);
    }

    if (!existingFolder) {
        const notFoundError = new Error("Deleted folder not found");
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    // Get all deleted folders
    const { data: allFolders, error: foldersError } = await supabase
        .from("folders")
        .select("id, parent_id")
        .eq("owner_id", ownerId)
        .eq("is_deleted", true);

    if (foldersError) {
        throw new Error(foldersError.message);
    }

    // Find all nested deleted folders
    const folderIdsToRestore = [folderId];

    const findChildren = (parentId) => {
        const children = allFolders.filter(
            folder => folder.parent_id === parentId
        );

        for (const child of children) {
            folderIdsToRestore.push(child.id);
            findChildren(child.id);
        }
    };

    findChildren(folderId);

    const now = new Date().toISOString();

    // Restore folders
    const { error: restoreFoldersError } = await supabase
        .from("folders")
        .update({
            is_deleted: false,
            updated_at: now
        })
        .eq("owner_id", ownerId)
        .in("id", folderIdsToRestore)
        .eq("is_deleted", true);

    if (restoreFoldersError) {
        throw new Error(restoreFoldersError.message);
    }

    // Restore files
    const { error: restoreFilesError } = await supabase
        .from("files")
        .update({
            is_deleted: false,
            updated_at: now
        })
        .eq("owner_id", ownerId)
        .in("folder_id", folderIdsToRestore)
        .eq("is_deleted", true);

    if (restoreFilesError) {
        throw new Error(restoreFilesError.message);
    }

    return {
        id: existingFolder.id,
        name: existingFolder.name,
        restoredFolders: folderIdsToRestore.length
    };
};


// =========================
// SEARCH FOLDERS
// =========================
const searchFolders = async ({ query, ownerId }) => {
    const { data: folders, error } = await supabase
        .from("folders")
        .select(
            "id, name, owner_id, parent_id, created_at, updated_at"
        )
        .eq("owner_id", ownerId)
        .eq("is_deleted", false)
        .ilike("name", `%${query}%`)
        .order("name", { ascending: true });

    if (error) {
        throw new Error(error.message);
    }

    return folders;
};


// =========================
// GET TRASH FOLDERS
// =========================
const getTrashFolders = async ({ ownerId }) => {
    const { data: folders, error } = await supabase
        .from("folders")
        .select(
            "id, name, owner_id, parent_id, created_at, updated_at"
        )
        .eq("owner_id", ownerId)
        .eq("is_deleted", true)
        .order("updated_at", { ascending: false });

    if (error) {
        throw new Error(error.message);
    }

    return folders;
};


// =========================
// PERMANENTLY DELETE FOLDER
// =========================
const permanentlyDeleteFolder = async ({ folderId, ownerId }) => {
    // Verify deleted folder
    const { data: existingFolder, error: findError } = await supabase
        .from("folders")
        .select("id, name")
        .eq("id", folderId)
        .eq("owner_id", ownerId)
        .eq("is_deleted", true)
        .maybeSingle();

    if (findError) {
        throw new Error(findError.message);
    }

    if (!existingFolder) {
        const notFoundError = new Error(
            "Deleted folder not found"
        );
        notFoundError.statusCode = 404;
        throw notFoundError;
    }

    // Get all deleted folders
    const { data: allFolders, error: foldersError } = await supabase
        .from("folders")
        .select("id, parent_id")
        .eq("owner_id", ownerId)
        .eq("is_deleted", true);

    if (foldersError) {
        throw new Error(foldersError.message);
    }

    // Find nested folders
    const folderIdsToDelete = [folderId];

    const findChildren = (parentId) => {
        const children = allFolders.filter(
            folder => folder.parent_id === parentId
        );

        for (const child of children) {
            folderIdsToDelete.push(child.id);
            findChildren(child.id);
        }
    };

    findChildren(folderId);

    // Get all deleted files inside these folders
    const { data: files, error: filesError } = await supabase
        .from("files")
        .select("*") 
        .eq("owner_id", ownerId)
        .eq("is_deleted", true)
        .in("folder_id", folderIdsToDelete);

    if (filesError) {
        throw new Error(filesError.message);
    }

    // Delete actual files from Supabase Storage
    if (files && files.length > 0) {
        const storagePaths = files
            .filter(file => file.storage_path)
            .map(file => file.storage_path);

        if (storagePaths.length > 0) {
            const { error: storageError } = await supabase.storage
                .from("files")
                .remove(storagePaths);

            if (storageError) {
                throw new Error(storageError.message);
            }
        }
    }

    // Delete file records from database
    if (files && files.length > 0) {
        const fileIds = files.map(file => file.id);

        const { error: deleteFilesError } = await supabase
            .from("files")
            .delete()
            .eq("owner_id", ownerId)
            .in("id", fileIds);

        if (deleteFilesError) {
            throw new Error(deleteFilesError.message);
        }
    }

    // Permanently delete folders
    const { error: deleteFoldersError } = await supabase
        .from("folders")
        .delete()
        .eq("owner_id", ownerId)
        .in("id", folderIdsToDelete);

    if (deleteFoldersError) {
        throw new Error(deleteFoldersError.message);
    }

    return {
        id: existingFolder.id,
        name: existingFolder.name,
        deletedFolders: folderIdsToDelete.length,
        deletedFiles: files ? files.length : 0
    };
};


module.exports = {
    createFolder,
    getFolderChildren,
    renameFolder,
    deleteFolder,
    restoreFolder,
    searchFolders,
    getTrashFolders,
    permanentlyDeleteFolder
};