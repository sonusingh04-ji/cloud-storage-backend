const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleTokenAndLogin = async (idToken) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        const error = new Error("GOOGLE_CLIENT_ID is not configured");
        error.statusCode = 500;
        throw error;
    }

    if (!idToken) {
        const error = new Error("Google ID token is required");
        error.statusCode = 400;
        throw error;
    }

    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
        const error = new Error("Invalid Google token");
        error.statusCode = 401;
        throw error;
    }

    if (!payload.email || payload.email_verified !== true) {
        const error = new Error("Google email is not verified");
        error.statusCode = 401;
        throw error;
    }

    const email = payload.email.trim().toLowerCase();

    const {
        data: existingUser,
        error: findError
    } = await supabase
        .from("users")
        .select("id, name, email, password_hash, image_url, created_at")
        .eq("email", email)
        .maybeSingle();

    if (findError) {
        throw new Error(findError.message);
    }

    if (existingUser) {
        return {
            id: existingUser.id,
            name: existingUser.name,
            email: existingUser.email,
            image_url: existingUser.image_url,
            created_at: existingUser.created_at
        };
    }

    // Generate a bcrypt hash so normal password login
    // cannot accidentally treat the Google account as a valid password.
    const googleOnlyPasswordHash = await bcrypt.hash(
        `GOOGLE_ONLY_${cryptoRandomString()}`,
        12
    );

    const {
        data: newUser,
        error: insertError
    } = await supabase
        .from("users")
        .insert({
            name: payload.name || email.split("@")[0],
            email,
            image_url: payload.picture || null,
            password_hash: googleOnlyPasswordHash
        })
        .select("id, name, email, image_url, created_at")
        .single();

    if (insertError) {
        throw new Error(insertError.message);
    }

    return newUser;
};

const cryptoRandomString = () => {
    return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

module.exports = {
    verifyGoogleTokenAndLogin
};