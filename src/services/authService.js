const bcrypt = require("bcryptjs");
const supabase = require("../config/supabase");

const registerUser = async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    // Check whether user already exists
    const { data: existingUser, error: findError } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

    if (findError) {
        throw new Error(findError.message);
    }

    if (existingUser) {
        const error = new Error("Email is already registered");
        error.statusCode = 409;
        throw error;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error: insertError } = await supabase
        .from("users")
        .insert({
            name: name.trim(),
            email: normalizedEmail,
            password_hash: passwordHash
        })
        .select("id, name, email, image_url, created_at")
        .single();

    if (insertError) {
        throw new Error(insertError.message);
    }

    return user;
};
const loginUser = async ({ email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();

    const { data: user, error } = await supabase
        .from("users")
        .select("id, name, email, password_hash, image_url, created_at")
        .eq("email", normalizedEmail)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!user) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatches) {
        const error = new Error("Invalid email or password");
        error.statusCode = 401;
        throw error;
    }

    return user;
};

module.exports = {
    registerUser,
    loginUser
};