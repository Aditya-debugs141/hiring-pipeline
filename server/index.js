require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
const jobsRouter = require("./routes/jobs");
const applicationsRouter = require("./routes/applications");
app.use("/api/jobs", jobsRouter);
app.use("/api/applications", applicationsRouter);

// Error handler (must be last middleware)
app.use(errorHandler);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/hiring-pipeline";

async function startServer() {
  let uri = MONGO_URI;

  try {
    // Try connecting to the configured MongoDB
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log("Connected to MongoDB");
  } catch (err) {
    // Fallback to in-memory MongoDB for local development
    console.log("Local MongoDB not found. Starting in-memory MongoDB...");
    const { MongoMemoryReplSet } = require("mongodb-memory-server");
    const replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    uri = replSet.getUri();
    await mongoose.connect(uri);
    console.log("Connected to in-memory MongoDB (data will not persist)");
  }

  const { startDecayEngine } = require("./engine/decayEngine");

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  startDecayEngine();
  console.log("[Server] Decay engine started");
}

startServer();

module.exports = app;
