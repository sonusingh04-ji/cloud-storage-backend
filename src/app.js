const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// 1. Essential Middleware FIRST
app.use(cors());
app.use(express.json());

// 2. Imports
const supabase = require("./config/supabase");
const authRoutes = require("./routes/authRoutes");
const folderRoutes = require("./routes/folderRoutes");
const fileRoutes = require("./routes/fileRoutes");
const searchRoutes = require("./routes/searchRoutes");
const shareRoutes = require("./routes/shareRoutes");
const starRoutes = require("./routes/starRoutes");

// 3. Route Mounting
app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/stars", starRoutes);

// 4. Health Checks
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Cloud Storage API is running"
    });
});

app.get("/api/health/supabase", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("id")
            .limit(1);

        if (error) {
            return res.status(500).json({
                success: false,
                message: "Supabase connection failed",
                error: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: "Supabase connection successful",
            data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
});

module.exports = app;