const supabase = require("../config/supabase");
const globalSearch = async (query, userId) => {
    const searchPattern = `%${query.trim()}%`;
    const [
        filesResult, foldersResult] = await Promise.all([
        supabase
            .from("files")
            .select("*")
            .eq("owner_id", userId)
            .eq("is_deleted", false)
            .ilike("name", searchPattern)
            .order("created_at", { ascending: false }),
        supabase
            .from("folders")
            .select(
                "id, name, owner_id, parent_id, created_at, updated_at"
            )
            .eq("owner_id", userId)
            .eq("is_deleted", false)
            .ilike("name", searchPattern)
            .order("name", { ascending: true })
    ]);
    if (filesResult.error) {
        throw new Error(filesResult.error.message);
    }
    if (foldersResult.error) {
        throw new Error(foldersResult.error.message);
    }
    return {
        files: filesResult.data || [],
        folders: foldersResult.data || []
    };
};
module.exports = {
    globalSearch
};