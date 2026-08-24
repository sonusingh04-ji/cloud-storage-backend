const starService = require("../services/starService");

const starItem = async (req, res) => {
    try {
        const { resourceType, resourceId } = req.body;

        if (!resourceType || !resourceId) {
            return res.status(400).json({ success: false, message: "resourceType and resourceId are required" });
        }

        const star = await starService.addStar(req.user.id, resourceType, resourceId);
        res.status(201).json({ success: true, message: "Item starred successfully", star });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const unstarItem = async (req, res) => {
    try {
        // Using req.body for DELETE to match the API spec exactly
        const { resourceType, resourceId } = req.body;

        if (!resourceType || !resourceId) {
            return res.status(400).json({ success: false, message: "resourceType and resourceId are required" });
        }

        await starService.removeStar(req.user.id, resourceType, resourceId);
        res.status(200).json({ success: true, message: "Item unstarred successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { starItem, unstarItem };