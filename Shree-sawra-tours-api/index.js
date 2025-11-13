// ================================
// 📦 Shree Sawra Tours Backend
// ================================

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- MongoDB Connection ----------
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://nayansalvi001_db_user:nayan123salvi@mywebsite.tulh7sb.mongodb.net/mydatabase?retryWrites=true&w=majority";

let isConnected = false;

async function connectDB() {
  if (isConnected) return;

  try {
    const db = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = db.connection.readyState === 1;
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
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

    const { packagePrice, numPersons, carType, total, date } = req.body;

    console.log("📦 Incoming booking:", req.body);

    if (!packagePrice || !numPersons || !carType || !total) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
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
    console.log("✅ New booking saved:", savedBooking._id);

    res.status(201).json({
      success: true,
      message: "Booking saved successfully",
      booking: savedBooking,
    });
  } catch (err) {
    console.error("❌ Booking save error:", err.message);
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
    console.error("❌ Error getting bookings:", err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve bookings" });
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
    console.error("❌ Error getting booking by ID:", err.message);
    res.status(500).json({ success: false, message: "Failed to retrieve booking" });
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
    console.error("❌ Error deleting booking:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete booking" });
  }
});

// ---------- Export for Vercel ----------
module.exports = app;

// ---------- Local Dev Mode ----------
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
}