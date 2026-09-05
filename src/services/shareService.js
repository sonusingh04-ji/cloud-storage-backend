const supabase = require("../config/supabase");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const VALID_RESOURCE_TYPES = ["file", "folder"];
const VALID_ROLES = ["viewer", "editor"];


/**
 * Validate resource type
 */
const validateResourceType = (resourceType) => {
    if (!VALID_RESOURCE_TYPES.includes(resourceType)) {
        const error = new Error("Invalid resource type");
        error.statusCode = 400;
        throw error;
    }
};


/**
 * Validate role
 */
const validateRole = (role) => {
    if (!VALID_ROLES.includes(role)) {
        const error = new Error("Role must be viewer or editor");
        error.statusCode = 400;
        throw error;
    }
};


/**
 * Get resource and verify owner
 */
const getResource = async (
    resourceType,
    resourceId,
    ownerId
) => {
    validateResourceType(resourceType);

    const table =
        resourceType === "file"
            ? "files"
            : "folders";

    const {
        data: resource,
        error
    } = await supabase
        .from(table)
        .select("id, name, owner_id, is_deleted")
        .eq("id", resourceId)
        .eq("owner_id", ownerId)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!resource) {
        const err = new Error(
            "Resource not found or you are not the owner"
        );

        err.statusCode = 404;

        throw err;
    }

    if (resource.is_deleted) {
        const err = new Error(
            "Deleted resources cannot be shared"
        );

        err.statusCode = 400;

        throw err;
    }

    return resource;
};


/**
 * Share with user ID
 */
const shareWithUser = async ({
                                 resourceType,
                                 resourceId,
                                 granteeUserId,
                                 role,
                                 ownerId
                             }) => {

    validateResourceType(resourceType);
    validateRole(role);

    if (!granteeUserId) {
        const error = new Error("Recipient user is required");
        error.statusCode = 400;
        throw error;
    }

    if (granteeUserId === ownerId) {
        const error = new Error(
            "You cannot share a resource with yourself"
        );

        error.statusCode = 400;

        throw error;
    }

    const resource = await getResource(
        resourceType,
        resourceId,
        ownerId
    );

    const {
        data: recipient,
        error: recipientError
    } = await supabase
        .from("users")
        .select("id, name, email, image_url")
        .eq("id", granteeUserId)
        .maybeSingle();

    if (recipientError) {
        throw new Error(recipientError.message);
    }

    if (!recipient) {
        const error = new Error(
            "Recipient user does not exist"
        );

        error.statusCode = 404;

        throw error;
    }

    // Check existing share
    const {
        data: existingShare,
        error: existingError
    } = await supabase
        .from("shares")
        .select("id")
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .eq("grantee_user_id", granteeUserId)
        .maybeSingle();

    if (existingError) {
        throw new Error(existingError.message);
    }

    let share;

    if (existingShare) {

        const {
            data,
            error
        } = await supabase
            .from("shares")
            .update({
                role,
                created_by: ownerId
            })
            .eq("id", existingShare.id)
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        share = data;

    } else {

        const {
            data,
            error
        } = await supabase
            .from("shares")
            .insert({
                resource_type: resourceType,
                resource_id: resourceId,
                grantee_user_id: granteeUserId,
                role,
                created_by: ownerId
            })
            .select()
            .single();

        if (error) {
            throw new Error(error.message);
        }

        share = data;
    }

    return {
        ...share,

        resource: {
            id: resource.id,
            name: resource.name,
            resourceType
        },

        recipient
    };
};


/**
 * Share with email
 */
const shareWithEmail = async ({
                                  resourceType,
                                  resourceId,
                                  email,
                                  role,
                                  ownerId
                              }) => {

    if (!email) {
        const error = new Error(
            "Recipient email is required"
        );

        error.statusCode = 400;

        throw error;
    }

    const normalizedEmail =
        email.trim().toLowerCase();

    const {
        data: recipient,
        error
    } = await supabase
        .from("users")
        .select("id, name, email, image_url")
        .eq("email", normalizedEmail)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!recipient) {
        const err = new Error(
            "No Labmantix account exists with this email. Ask the recipient to create an account first."
        );

        err.statusCode = 404;

        throw err;
    }

    return shareWithUser({
        resourceType,
        resourceId,
        granteeUserId: recipient.id,
        role,
        ownerId
    });
};


/**
 * Get people who have access
 */
const getShares = async (
    resourceType,
    resourceId,
    ownerId
) => {

    await getResource(
        resourceType,
        resourceId,
        ownerId
    );

    const {
        data: shares,
        error
    } = await supabase
        .from("shares")
        .select(`
            id,
            resource_type,
            resource_id,
            role,
            created_at,
            grantee_user_id,
            users:grantee_user_id (
                id,
                name,
                email,
                image_url
            )
        `)
        .eq("resource_type", resourceType)
        .eq("resource_id", resourceId)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        throw new Error(error.message);
    }

    return shares || [];
};


/**
 * Revoke normal user share
 */
const revokeShare = async (
    shareId,
    ownerId
) => {

    const {
        data: share,
        error: shareError
    } = await supabase
        .from("shares")
        .select("id, resource_type, resource_id")
        .eq("id", shareId)
        .maybeSingle();

    if (shareError) {
        throw new Error(shareError.message);
    }

    if (!share) {
        const error = new Error("Share not found");
        error.statusCode = 404;
        throw error;
    }

    await getResource(
        share.resource_type,
        share.resource_id,
        ownerId
    );

    const {
        error
    } = await supabase
        .from("shares")
        .delete()
        .eq("id", shareId);

    if (error) {
        throw new Error(error.message);
    }

    return true;
};


/**
 * Get files shared with current user
 */
const getSharedFilesForUser = async (userId) => {

    const {
        data: shares,
        error: shareError
    } = await supabase
        .from("shares")
        .select(`
            id,
            role,
            resource_type,
            resource_id,
            created_at
        `)
        .eq("grantee_user_id", userId)
        .eq("resource_type", "file");

    if (shareError) {
        throw new Error(shareError.message);
    }

    if (!shares || shares.length === 0) {
        return [];
    }

    const fileIds =
        shares.map(
            share => share.resource_id
        );

    const {
        data: files,
        error: fileError
    } = await supabase
        .from("files")
        .select(`
            id,
            name,
            mime_type,
            size_bytes,
            storage_key,
            owner_id,
            folder_id,
            is_deleted,
            created_at,
            updated_at
        `)
        .in("id", fileIds)
        .eq("is_deleted", false);

    if (fileError) {
        throw new Error(fileError.message);
    }

    if (!files) {
        return [];
    }

    const ownerIds = [
        ...new Set(
            files.map(file => file.owner_id)
        )
    ];

    const {
        data: owners,
        error: ownerError
    } = await supabase
        .from("users")
        .select("id, name, email, image_url")
        .in("id", ownerIds);

    if (ownerError) {
        throw new Error(ownerError.message);
    }

    return files.map(file => {

        const share = shares.find(
            item =>
                item.resource_id === file.id
        );

        const owner = owners?.find(
            item =>
                item.id === file.owner_id
        );

        return {
            ...file,
            share_id: share?.id,
            access_role: share?.role || "viewer",
            shared_at: share?.created_at,
            owner
        };
    });
};


/**
 * Create public link
 */
const createPublicLink = async (
    resourceType,
    resourceId,
    expiresAt,
    password,
    ownerId
) => {

    const resource = await getResource(
        resourceType,
        resourceId,
        ownerId
    );

    const token =
        crypto.randomBytes(32).toString("hex");

    let passwordHash = null;

    if (password) {
        passwordHash =
            await bcrypt.hash(password, 12);
    }

    const {
        data: linkShare,
        error
    } = await supabase
        .from("link_shares")
        .insert({
            resource_type: resourceType,
            resource_id: resourceId,
            token,
            role: "viewer",
            password_hash: passwordHash,
            expires_at: expiresAt || null,
            created_by: ownerId
        })
        .select(
            "id, resource_type, resource_id, token, expires_at, created_at"
        )
        .single();

    if (error) {
        throw new Error(error.message);
    }

    return {
        ...linkShare,
        resource: {
            id: resource.id,
            name: resource.name,
            resourceType
        }
    };
};


/**
 * Get public link record by token
 */
const getPublicLinkByToken = async (token) => {

    if (!token) {
        const error = new Error("Public link token is required");
        error.statusCode = 400;
        throw error;
    }

    const {
        data: linkShare,
        error
    } = await supabase
        .from("link_shares")
        .select(`
            id,
            resource_type,
            resource_id,
            token,
            role,
            password_hash,
            expires_at,
            created_by,
            created_at
        `)
        .eq("token", token)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!linkShare) {
        const error = new Error("Public link not found");
        error.statusCode = 404;
        throw error;
    }

    // Check expiry
    if (
        linkShare.expires_at &&
        new Date(linkShare.expires_at).getTime() <= Date.now()
    ) {
        const error = new Error("This public link has expired");
        error.statusCode = 410;
        throw error;
    }

    return linkShare;
};


/**
 * Resolve public link without password
 *
 * If password protected, the endpoint tells frontend
 * that a password is required without exposing the hash.
 */
const resolvePublicLink = async (token) => {

    const linkShare =
        await getPublicLinkByToken(token);

    if (linkShare.password_hash) {
        return {
            requiresPassword: true,
            resourceType: linkShare.resource_type,
            resourceId: linkShare.resource_id,
            expiresAt: linkShare.expires_at
        };
    }

    return getPublicResourceAccess(linkShare);
};


/**
 * Verify password and access public link
 */
const accessPublicLink = async (
    token,
    password
) => {

    const linkShare =
        await getPublicLinkByToken(token);

    if (!linkShare.password_hash) {
        return getPublicResourceAccess(linkShare);
    }

    if (!password) {
        const error = new Error("Password is required");
        error.statusCode = 400;
        throw error;
    }

    const passwordValid =
        await bcrypt.compare(
            password,
            linkShare.password_hash
        );

    if (!passwordValid) {
        const error = new Error("Incorrect password");
        error.statusCode = 401;
        throw error;
    }

    return getPublicResourceAccess(linkShare);
};


/**
 * Return actual resource for public access
 */
const getPublicResourceAccess = async (linkShare) => {

    validateResourceType(
        linkShare.resource_type
    );

    const table =
        linkShare.resource_type === "file"
            ? "files"
            : "folders";

    const {
        data: resource,
        error
    } = await supabase
        .from(table)
        .select("*")
        .eq("id", linkShare.resource_id)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!resource) {
        const error = new Error("Shared resource no longer exists");
        error.statusCode = 404;
        throw error;
    }

    if (resource.is_deleted) {
        const error = new Error("This resource has been deleted");
        error.statusCode = 410;
        throw error;
    }

    // Public link for a file
    if (linkShare.resource_type === "file") {

        if (!resource.storage_key) {
            const error =
                new Error("File storage information is missing");

            error.statusCode = 500;

            throw error;
        }

        const {
            data,
            error: storageError
        } = await supabase.storage
            .from("files")
            .createSignedUrl(
                resource.storage_key,
                60 * 60
            );

        if (storageError) {
            throw new Error(storageError.message);
        }

        return {
            requiresPassword: false,
            resourceType: "file",
            resource: {
                id: resource.id,
                name: resource.name,
                mime_type: resource.mime_type,
                size_bytes: resource.size_bytes,
                created_at: resource.created_at
            },
            expiresAt: linkShare.expires_at,
            downloadUrl: data.signedUrl
        };
    }

    // Public folder link
    return {
        requiresPassword: false,
        resourceType: "folder",
        resource: {
            id: resource.id,
            name: resource.name,
            created_at: resource.created_at
        },
        expiresAt: linkShare.expires_at
    };
};


/**
 * Revoke public link
 */
const revokePublicLink = async (
    linkId,
    ownerId
) => {

    if (!linkId) {
        const error = new Error("Public link ID is required");
        error.statusCode = 400;
        throw error;
    }

    const {
        data: linkShare,
        error: linkError
    } = await supabase
        .from("link_shares")
        .select(
            "id, resource_type, resource_id, created_by"
        )
        .eq("id", linkId)
        .maybeSingle();

    if (linkError) {
        throw new Error(linkError.message);
    }

    if (!linkShare) {
        const error = new Error("Public link not found");
        error.statusCode = 404;
        throw error;
    }

    // Only the creator/owner can revoke the link
    if (linkShare.created_by !== ownerId) {
        const error =
            new Error(
                "You do not have permission to revoke this public link"
            );

        error.statusCode = 403;

        throw error;
    }

    const {
        error
    } = await supabase
        .from("link_shares")
        .delete()
        .eq("id", linkId)
        .eq("created_by", ownerId);

    if (error) {
        throw new Error(error.message);
    }

    return true;
};


module.exports = {
    shareWithUser,
    shareWithEmail,
    getShares,
    revokeShare,
    getSharedFilesForUser,
    createPublicLink,
    resolvePublicLink,
    accessPublicLink,
    revokePublicLink
};