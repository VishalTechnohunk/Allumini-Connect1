const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const User = require("./model/Register");
const path = require("path");

const app = express();

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files path
const staticPath = path.join(__dirname, "../public");
app.use(express.static(staticPath));

// MongoDB Connection (Local)
mongoose.connect("mongodb+srv://alumnetUser:alumnetUser123@alumnetcluster.b8fqndl.mongodb.net/?retryWrites=true&w=majority&appName=AlumnetCluster", {

  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch((err) => console.error("MongoDB connection error:", err));

// Session Middleware
app.use(
  session({
    secret: "123456",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb+srv://alumnetUser:alumnetUser123@alumnetcluster.b8fqndl.mongodb.net/?retryWrites=true&w=majority&appName=AlumnetCluster",
    }),
    cookie: { maxAge: 12 * 60 * 60 * 1000 }, // 12 hours
  })
);

// Serve Home Page
app.get("/", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

// Register Route
app.post("/register", async (req, res) => {
  const {
    fullName,
    email,
    password,
    confirmPassword,
    userType,
    branch,
    rollNumber,
    passoutYear,
    company,
    skills,
    experience,
    phoneNumber,
    collegeName,
  } = req.body;

  const normalizedPassoutYear = Array.isArray(passoutYear)
    ? passoutYear.find((year) => year.trim() !== "")
    : passoutYear;

  const normalizedPhoneNumber = Array.isArray(phoneNumber)
    ? phoneNumber.find((number) => number.trim() !== "")
    : phoneNumber;

  const normalizedCollegeName = Array.isArray(collegeName)
    ? collegeName.find((name) => name.trim() !== "")
    : collegeName;

  if (!fullName || !email || !password || !confirmPassword || !userType) {
    return res.status(400).json({ message: "All required fields must be filled." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const newUser = new User({
      fullName,
      email,
      password,
      userType,
      branch: userType === "Student" ? branch : undefined,
      rollNumber: userType === "Student" ? rollNumber : undefined,
      passoutYear: normalizedPassoutYear,
      company: userType === "Alumni" ? company : undefined,
      skills: userType === "Alumni" ? skills : undefined,
      experience: userType === "Alumni" ? experience : undefined,
      phoneNumber: normalizedPhoneNumber,
      collegeName: normalizedCollegeName,
    });

    await newUser.save();

    // Set user session
    req.session.userId = newUser._id;
    console.log(req.session.userId);
    res.redirect("/");
  } catch (err) {
    console.error("Error registering user:", err.message);
    res.status(500).json({ message: "Error saving form data" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Set user session
    req.session.userId = user._id;
    res.sendFile(path.join(staticPath, "Home.html"));
  } catch (err) {
    console.error("Error logging in user:", err.message);
    res.status(500).json({ message: "Server error." });
  }
});

// Fetch User Data
app.get("/user-data", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not logged in" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching user data:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
