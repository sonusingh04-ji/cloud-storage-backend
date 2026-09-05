const shareService = require("../services/shareService");

const createShare = async (req, res) => {
    try {
        const {
            resourceType,
            resourceId,
            granteeUserId,
            email,
            role = "viewer"
        } = req.body;

        if (!resourceType || !resourceId) {
            return res.status(400).json({
                success: false,
                message:
                    "resourceType and resourceId are required"
            });
        }

        if (!granteeUserId && !email) {
            return res.status(400).json({
                success: false,
                message:
                    "Recipient email or user ID is required"
            });
        }

        let share;

        if (email) {
            share =
                await shareService.shareWithEmail({
                    resourceType,
                    resourceId,
                    email,
                    role,
                    ownerId: req.user.id
                });
        } else {
            share =
                await shareService.shareWithUser({
                    resourceType,
                    resourceId,
                    granteeUserId,
                    role,
                    ownerId: req.user.id
                });
        }

        return res.status(201).json({
            success: true,
            message: "Resource shared successfully",
            share
        });

    } catch (error) {
        console.error("Create share error:", error);

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to share resource"
        });
    }
};

const getShares = async (req, res) => {
    try {
        const {
            resourceType,
            resourceId
        } = req.params;

        const shares =
            await shareService.getShares(
                resourceType,
                resourceId,
                req.user.id
            );

        return res.status(200).json({
            success: true,
            shares
        });

    } catch (error) {
        console.error("Get shares error:", error);

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to fetch shares"
        });
    }
};

const revokeShare = async (req, res) => {
    try {
        await shareService.revokeShare(
            req.params.id,
            req.user.id
        );

        return res.status(200).json({
            success: true,
            message: "Share access revoked"
        });

    } catch (error) {
        console.error("Revoke share error:", error);

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to revoke share"
        });
    }
};

const getSharedWithMe = async (req, res) => {
    try {
        const files =
            await shareService.getSharedFilesForUser(
                req.user.id
            );

        return res.status(200).json({
            success: true,
            files
        });

    } catch (error) {
        console.error(
            "Get shared with me error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error.message ||
                "Failed to fetch shared files"
        });
    }
};

const createPublicLink = async (req, res) => {
    try {
        const {
            resourceType,
            resourceId,
            expiresAt,
            password
        } = req.body;

        if (!resourceType || !resourceId) {
            return res.status(400).json({
                success: false,
                message:
                    "resourceType and resourceId are required"
            });
        }

        const link =
            await shareService.createPublicLink(
                resourceType,
                resourceId,
                expiresAt,
                password,
                req.user.id
            );

        return res.status(201).json({
            success: true,
            message: "Public link generated",
            link
        });

    } catch (error) {
        console.error(
            "Create public link error:",
            error
        );

        return res.status(
            error.statusCode || 500
        ).json({
            success: false,
            message:
                error.message ||
                "Failed to create public link"
        });
    }
};

module.exports = {
    createShare,
    getShares,
    revokeShare,
    getSharedWithMe,
    createPublicLink
};