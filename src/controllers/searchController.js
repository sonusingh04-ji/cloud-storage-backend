const searchService = require("../services/searchService");

const globalSearch = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || !query.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }

        const result = await searchService.globalSearch(
            query,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Search completed successfully",
            files: result.files,
            folders: result.folders
        });

    } catch (error) {
        console.error("Global search error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Search failed"
        });
    }
};

module.exports = {
    globalSearch
};