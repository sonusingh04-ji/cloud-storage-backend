const express = require("express");
const cors = require("cors");

const supabase = require("./config/supabase");

const authRoutes = require("./routes/authRoutes");
const folderRoutes = require("./routes/folderRoutes");
const fileRoutes = require("./routes/fileRoutes");
const searchRoutes = require("./routes/searchRoutes");
const shareRoutes = require("./routes/shareRoutes");
const starRoutes = require("./routes/starRoutes");
const publicShareRoutes =
    require("./routes/publicShareRoutes");
const app = express();

// --------------------------------------------------
// Middleware
// --------------------------------------------------

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(express.json());

// --------------------------------------------------
// Root / Health
// --------------------------------------------------

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Cloud Storage API is running",
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "API is healthy",
    });
});

// --------------------------------------------------
// Supabase Health Check
// --------------------------------------------------

app.get("/api/health/supabase", async (req, res) => {
    try {
        const { data, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error("Supabase health check failed:", error);

            return res.status(500).json({
                success: false,
                message: "Supabase connection failed",
                error: error.message,
            });
        }

        return res.json({
            success: true,
            message: "Supabase connection successful",
            buckets: data?.map((bucket) => bucket.name) || [],
        });
    } catch (error) {
        console.error("Supabase health check error:", error);

        return res.status(500).json({
            success: false,
            message: "Supabase connection failed",
            error: error.message,
        });
    }
});

// --------------------------------------------------
// API Routes
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/shares", shareRoutes);
app.use("/api/stars", starRoutes);
app.use("/api/link", publicShareRoutes);
// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
    });
});

// --------------------------------------------------
// Error Handler
// --------------------------------------------------

app.use((err, req, res, next) => {
    console.error("Unhandled server error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});

module.exports = app;