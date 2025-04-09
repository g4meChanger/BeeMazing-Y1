const express = require('express');
const cors = require('cors');
const path = require('path');
const { registerUser, getAllUsers } = require('./register');
const { connectDB } = require('./db');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ CORS for GitHub Pages
const corsOptions = {
  origin: ['https://g4mechanger.github.io'],
  methods: ['GET', 'POST'],
  credentials: false,
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Serve static files (optional)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ REGISTER
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("📨 Registering admin:", email);
    const result = await registerUser(email, password);

    console.log("✅ Registered admin:", result);
    res.json({ ...result, role: "admin", success: true });
  } catch (err) {
    console.error("🔥 Error in /register:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// ✅ LOGIN (SAFE VERSION)
app.post('/login', async (req, res) => {
  try {
    const { email, password, adminEmail } = req.body;
    const db = await connectDB();
    const users = db.collection('users');
    const adminUsers = db.collection('adminUsers');

    // 1. Admin login
    const user = await users.findOne({ email });
    if (user && user.password === password) {
      console.log("👑 Admin login:", email);
      return res.json({ success: true, role: "admin", message: "Login successful" });
    }

    // 2. Invited user login
    const invited = await adminUsers.findOne({ email: adminEmail });

    if (!invited || !invited.passwords || !invited.users) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const match = Object.entries(invited.passwords).find(
      ([username, storedPass]) =>
        storedPass === password && invited.users.includes(username)
    );

    if (match) {
      const [username] = match;
      console.log("👤 Invited user login:", username);
      return res.json({
        success: true,
        role: "user",
        username,
        message: "Login successful"
      });
    }

    return res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("🔥 Error in /login:", err);
    res.status(500).json({ success: false, message: "Server error during login" });
  }
});

// ✅ GET ALL REGISTERED USERS (Admins)
app.get('/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ✅ GET USERS ADDED BY SPECIFIC ADMIN
app.get('/get-users', async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ success: false, message: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');
    const adminDoc = await adminUsers.findOne({ email: adminEmail });

    res.json({
      success: true,
      users: adminDoc?.users || [],
      permissions: adminDoc?.permissions || {}
    });
  } catch (err) {
    console.error("🔥 Error in /get-users:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ ADD NEW USER TO SPECIFIC ADMIN
app.post('/add-user', async (req, res) => {
  const { adminEmail, newUser, tempPassword } = req.body;

  if (!adminEmail || !newUser || !tempPassword) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');

    await adminUsers.updateOne(
      { email: adminEmail },
      {
        $addToSet: { users: newUser },
        $set: { [`passwords.${newUser}`]: tempPassword }
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error in /add-user:", err);
    res.status(500).json({ success: false, message: "Failed to save user" });
  }
});

// ✅ EMAIL INVITE
app.post('/send-invite', async (req, res) => {
  const { toEmail, name, tempPassword, adminEmail } = req.body;

  const inviteLink = `https://g4mechanger.github.io/BeeMazing-Y1/register.html?admin=${encodeURIComponent(adminEmail)}&user=${encodeURIComponent(name)}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"BeeMazing" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "You're Invited to Join BeeMazing!",
    html: `
      <h2>Hello ${name}!</h2>
      <p>You've been invited by <strong>${adminEmail}</strong> to join their BeeMazing family!</p>
      <p>Your temporary password is: <strong>${tempPassword}</strong></p>
      <p>Click below to join:</p>
      <a href="${inviteLink}" style="color: #FFC107;">Join BeeMazing</a>
      <br/><br/>
      <p>🐝 Let's get buzzing!</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent!' });
  } catch (err) {
    console.error("Email failed:", err);
    res.status(500).json({ success: false, error: "Failed to send email." });
  }
});

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("🐝 BeeMazing backend is running!");
});

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
