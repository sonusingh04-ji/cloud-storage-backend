const { OAuth2Client } = require("google-auth-library");
const supabase = require("../config/supabase");

// Use your actual Google Client ID from the Google Cloud Console
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleTokenAndLogin = async (idToken) => {
    // 1. Verify token with Google
    const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email.trim().toLowerCase();

    // 2. Check if user already exists in your database
    const { data: existingUser, error: findError } = await supabase
        .from("users")
        .select("id, name, email, password_hash, image_url, created_at")
        .eq("email", email)
        .maybeSingle();

    if (findError) throw new Error(findError.message);

    // 3. If user exists, return them for login
    if (existingUser) return existingUser;

    // 4. If user doesn't exist, create a new account automatically (SSO Registration)
    const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
            name: payload.name,
            email: email,
            image_url: payload.picture,
            password_hash: "GOOGLE_SSO_NO_PASSWORD" // Placeholder for OAuth users
        })
        .select("id, name, email, image_url, created_at")
        .single();

    if (insertError) throw new Error(insertError.message);

    return newUser;
};

module.exports = { verifyGoogleTokenAndLogin };