const express = require('express');
const cors = require('cors');
const path = require('path');
const { registerUser, getAllUsers } = require('./register');
const { connectDB } = require('./db');

const app = express();
const port = process.env.PORT || 3000;

// ✅ CORS for GitHub Pages
const corsOptions = {
  origin: ['https://g4mechanger.github.io'],
  methods: ['GET', 'POST'],
  credentials: false
};
app.use(cors(corsOptions));
app.use(express.json());

// ✅ Serve frontend files (optional)
app.use(express.static(path.join(__dirname, 'public')));

// ✅ REGISTER
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await registerUser(email, password);
    res.json(result);
  } catch (err) {
    console.error("🔥 Error in /register:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
});

// ✅ LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await connectDB();
  const users = db.collection('users');

  const user = await users.findOne({ email });

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  res.json({ success: true, message: "Login successful" });
});

// ✅ GET ALL REGISTERED USERS (Not user-added ones)
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
  } catch (error) {
    console.error("🔥 Error in /get-users:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ ADD NEW USER TO SPECIFIC ADMIN
app.post('/add-user', async (req, res) => {
  const { adminEmail, newUser } = req.body;

  if (!adminEmail || !newUser) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');

    await adminUsers.updateOne(
      { email: adminEmail },
      { $addToSet: { users: newUser } }, // avoids duplicates
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error in /add-user:", err);
    res.status(500).json({ success: false, message: "Failed to save user" });
  }
});

// ✅ HEALTH CHECK
app.get("/", (req, res) => {
  res.send("BeeMazing backend is working!");
});



// ✅ GET ALL TASKS FOR ADMIN (used in users.html)
app.get('/get-tasks', async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ success: false, message: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    const tasks = admin?.tasks || [];

    res.json({ success: true, tasks });
  } catch (err) {
    console.error("🔥 Error in /get-tasks:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
});




app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});


// ✅ Save a single task for an admin
app.post("/api/tasks", async (req, res) => {
  const { adminEmail, task } = req.body;

  if (!adminEmail || !task) {
    return res.status(400).json({ error: "Missing adminEmail or task" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    const updatedTasks = admin?.tasks || [];

    // Replace if exists, otherwise add new
    const taskIndex = updatedTasks.findIndex(t => t.title === task.title && t.date === task.date);
    if (taskIndex >= 0) {
      updatedTasks[taskIndex] = task;
    } else {
      updatedTasks.push(task);
    }

    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks: updatedTasks } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving task:", err);
    res.status(500).json({ error: "Failed to save task" });
  }
});

// ✅ Get all tasks for an admin
app.get("/api/tasks", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ tasks: admin?.tasks || [] });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

