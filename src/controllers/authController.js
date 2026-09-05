const supabase = require("../config/supabase");
const authService = require("../services/authService");
const { generateToken } = require("../utils/jwt");
const googleAuthService = require("../services/googleAuthService");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        if (name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Name must contain at least 2 characters"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        const user = await authService.registerUser({
            name,
            email,
            password
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user
        });

    } catch (error) {
        console.error("Register error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Registration failed"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await authService.loginUser({
            email,
            password
        });

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image_url: user.image_url,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Login failed"
        });
    }
};

const getMe = async (req, res) => {
    try {
        const {
            data: user,
            error
        } = await supabase
            .from("users")
            .select("id, name, email, image_url, created_at")
            .eq("id", req.user.id)
            .single();

        if (error || !user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user
        });

    } catch (error) {
        console.error("Get me error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch user"
        });
    }
};

const logout = async (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Logout successful"
    });
};

const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "Google idToken is required"
            });
        }

        const user =
            await googleAuthService.verifyGoogleTokenAndLogin(idToken);

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Google login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image_url: user.image_url,
                created_at: user.created_at
            }
        });

    } catch (error) {
        console.error("Google login error:", error);

        return res.status(error.statusCode || 401).json({
            success: false,
            message: error.message || "Invalid Google token"
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email } = req.body;

        let imageUrl = null;

        if (req.file) {
            const sanitizedFilename =
                req.file.originalname
                    .replace(/[^a-zA-Z0-9_.-]/g, "_")
                    .toLowerCase();

            const filePath =
                `avatars/${userId}-${Date.now()}-${sanitizedFilename}`;

            const {
                error: storageError
            } = await supabase.storage
                .from("files")
                .upload(
                    filePath,
                    req.file.buffer,
                    {
                        contentType: req.file.mimetype,
                        upsert: false
                    }
                );

            if (storageError) {
                throw new Error(storageError.message);
            }

            const {
                data: publicUrlData
            } = supabase.storage
                .from("files")
                .getPublicUrl(filePath);

            imageUrl = publicUrlData.publicUrl;
        }

        const updateData = {};

        if (name !== undefined) {
            updateData.name = name.trim();
        }

        if (email !== undefined) {
            updateData.email = email.trim().toLowerCase();
        }

        if (imageUrl) {
            updateData.image_url = imageUrl;
        }

        const {
            data: updatedUser,
            error: updateError
        } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", userId)
            .select("id, name, email, image_url, created_at")
            .single();

        if (updateError) {
            throw new Error(updateError.message);
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Update profile error:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to update profile"
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    logout,
    googleLogin,
    updateProfile
};