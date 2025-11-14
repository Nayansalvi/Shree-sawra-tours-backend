// index.js
// Shree Sawra Tours - Express + Mongoose (Vercel-friendly)

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// ---------- Middleware ----------
app.use(cors({ origin: true })); // allow all origins; tighten later if needed
app.use(express.json()); // parse JSON bodies

// ---------- Mongoose / MongoDB connection (serverless-safe) ----------
/**
 * This implementation caches the mongoose connection across invocations
 * (works in serverless environments like Vercel).
 *
 * IMPORTANT: Set MONGO_URI in Vercel environment variables.
 */

const MONGO_URI = process.env.MONGO_URI || "";

if (!MONGO_URI) {
  console.warn("⚠️ MONGO_URI not provided. Set the MONGO_URI environment variable.");
}

const mongooseOptions = {
  // optional settings you can tune
  // useNewUrlParser: true, useUnifiedTopology: true // no longer required explicitly in latest mongoose
};

async function connectDB() {
  // In local dev and Vercel serverless, reuse global cached connection if exist
  if (global._mongo && global._mongo.conn) {
    return global._mongo.conn;
  }

  if (!global._mongo) {
    global._mongo = { conn: null, promise: null };
  }

  if (!global._mongo.promise) {
    global._mongo.promise = mongoose.connect(MONGO_URI, mongooseOptions).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    global._mongo.conn = await global._mongo.promise;
    console.log("✅ Mongoose connected:", global._mongo.conn.connection.host || "connected");
    return global._mongo.conn;
  } catch (err) {
    global._mongo.promise = null;
    console.error("❌ Mongoose connection error:", err);
    throw err;
  }
}

// ---------- Booking Schema ----------
const bookingSchema = new mongoose.Schema({
  packagePrice: { type: Number, required: true },
  numPersons: { type: Number, required: true },
  carType: { type: String, required: true },
  total: { type: Number, required: true },
  date: { type: String, default: () => new Date().toLocaleString() },
  createdAt: { type: Date, default: Date.now },
});

// Avoid model overwrite issues in serverless
const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);

// ---------- Routes ----------

// Health check
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 Shree Sawra Tours Backend Running!",
    endpoints: {
      "POST /api/book": "Create a new booking",
      "GET /api/bookings": "Get all bookings",
      "GET /api/bookings/:id": "Get booking by ID",
      "DELETE /api/bookings/:id": "Delete booking by ID",
    },
  });
});

// Create a new booking
app.post("/api/book", async (req, res) => {
  try {
    await connectDB();

    // If body is missing, return 400
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Empty request body. Please send JSON with Content-Type: application/json",
      });
    }

    const { packagePrice, numPersons, carType, total, date } = req.body;

    // Basic validation
    if (typeof packagePrice !== "number" || typeof numPersons !== "number" || !carType || typeof total !== "number") {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid fields. Required: packagePrice(Number), numPersons(Number), carType(String), total(Number)",
      });
    }

    const booking = new Booking({
      packagePrice,
      numPersons,
      carType,
      total,
      date: date || new Date().toLocaleString(),
    });

    const savedBooking = await booking.save();

    res.status(201).json({
      success: true,
      message: "Booking saved successfully",
      booking: savedBooking,
    });
  } catch (err) {
    console.error("❌ Booking save error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

// Get all bookings
app.get("/api/bookings", async (req, res) => {
  try {
    await connectDB();
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error("❌ Error getting bookings:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve bookings", error: err.message });
  }
});

// Get booking by ID
app.get("/api/bookings/:id", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, booking });
  } catch (err) {
    console.error("❌ Error getting booking by ID:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve booking", error: err.message });
  }
});

// Delete booking
app.delete("/api/bookings/:id", async (req, res) => {
  try {
    await connectDB();
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }
    const deleted = await Booking.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, message: "Booking deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting booking:", err);
    res.status(500).json({ success: false, message: "Failed to delete booking", error: err.message });
  }
});

// Export the app for Vercel
module.exports = app;

// Local dev: start server if run directly (not used on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  // Ensure DB connected before starting local server
  connectDB()
    .then(() => {
      app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
    })
    .catch((err) => {
      console.error("Failed to start server due to DB error:", err);
    });
}