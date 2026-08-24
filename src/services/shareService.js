const supabase = require("../config/supabase");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const shareWithUser = async (resourceType, resourceId, granteeUserId, role, ownerId) => {
    // 1. Verify owner owns the resource (simplified check)
    const table = resourceType === 'file' ? 'files' : 'folders';
    const { data: resource, error: resourceError } = await supabase
        .from(table)
        .select("id")
        .eq("id", resourceId)
        .eq("owner_id", ownerId)
        .maybeSingle();

    if (!resource || resourceError) throw new Error(`Resource not found or unauthorized`);

    // 2. Insert into shares table
    const { data: share, error } = await supabase
        .from("shares")
        .insert({
            resource_type: resourceType,
            resource_id: resourceId,
            grantee_user_id: granteeUserId,
            role: role,
            created_by: ownerId
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return share;
};

const createPublicLink = async (resourceType, resourceId, expiresAt, password, ownerId) => {
    // Generate a secure random token
    const token = crypto.randomBytes(16).toString("hex");
    let passwordHash = null;

    if (password) {
        passwordHash = await bcrypt.hash(password, 10);
    }

    const { data: linkShare, error } = await supabase
        .from("link_shares")
        .insert({
            resource_type: resourceType,
            resource_id: resourceId,
            token: token,
            role: 'viewer', // default per spec
            password_hash: passwordHash,
            expires_at: expiresAt || null,
            created_by: ownerId
        })
        .select("id, resource_type, resource_id, token, expires_at, created_at")
        .single();

    if (error) throw new Error(error.message);
    return linkShare;
};

module.exports = { shareWithUser, createPublicLink };