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
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Added PUT
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

// ✅ Delete a specific user for an admin
app.delete("/delete-user", async (req, res) => {
  const { adminEmail, username } = req.query;

  if (!adminEmail || !username) {
    return res.status(400).json({ success: false, message: "Missing adminEmail or username" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    const admin = await adminUsers.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // Filter out the user to delete
    const updatedUsers = admin.users.filter(user => user !== username);

    // Update the admin's user list in the database
    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { users: updatedUsers } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error in /delete-user:", err);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
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










// ✅ Delete a specific task for an admin
app.delete("/api/tasks", async (req, res) => {
  const { adminEmail, title, date } = req.query;

  if (!adminEmail || !title || !date) {
      return res.status(400).json({ error: "Missing adminEmail, title, or date" });
  }

  try {
      const db = await connectDB();
      const admins = db.collection("admins");

      const admin = await admins.findOne({ email: adminEmail });
      if (!admin) {
          return res.status(404).json({ error: "Admin not found" });
      }

      // Filter tasks by comparing the start date of the task's date range
      const updatedTasks = admin.tasks.filter(task => {
          const taskStartDate = task.date.split(" to ")[0];
          return !(task.title === title && taskStartDate === date);
      });

      await admins.updateOne(
          { email: adminEmail },
          { $set: { tasks: updatedTasks } }
      );

      res.json({ success: true });
  } catch (err) {
      console.error("Error deleting task:", err);
      res.status(500).json({ error: "Failed to delete task" });
  }
});



// ✅ Update a specific task for an admin
app.put("/api/tasks", async (req, res) => {
  const { adminEmail, task, originalTitle, originalDate } = req.body;

  if (!adminEmail || !task || !originalTitle || !originalDate) {
    return res.status(400).json({ error: "Missing adminEmail, task, originalTitle, or originalDate" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    const taskIndex = tasks.findIndex(
      (t) => t.title === originalTitle && t.date === originalDate
    );

    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Update the task at its original index
    tasks[taskIndex] = task;

    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: "Failed to update task" });
  }
});



// In server.js
app.post("/api/rewards", async (req, res) => {
  const { adminEmail, user, amount } = req.body;
  if (!adminEmail || !user || amount === undefined) {
      return res.status(400).json({ error: "Missing data" });
  }
  try {
      const db = await connectDB();
      const admins = db.collection("admins");
      const admin = await admins.findOne({ email: adminEmail });
      const rewards = admin?.rewards || {};
      rewards[user] = (rewards[user] || 0) + amount;
      await admins.updateOne(
          { email: adminEmail },
          { $set: { rewards } },
          { upsert: true }
      );
      res.json({ success: true });
  } catch (err) {
      console.error("Error saving reward:", err);
      res.status(500).json({ error: "Failed to save reward" });
  }
});

app.get("/api/rewards", async (req, res) => {
  const { adminEmail } = req.query;
  if (!adminEmail) {
      return res.status(400).json({ error: "Missing adminEmail" });
  }
  try {
      const db = await connectDB();
      const admins = db.collection("admins");
      const admin = await admins.findOne({ email: adminEmail });
      res.json({ rewards: admin?.rewards || {} });
  } catch (err) {
      console.error("Error fetching rewards:", err);
      res.status(500).json({ error: "Failed to fetch rewards" });
  }
});




// ✅ Save all market rewards for an admin
app.post("/api/market-rewards", async (req, res) => {
  const { adminEmail, rewards } = req.body;

  if (!adminEmail || !Array.isArray(rewards)) {
    return res.status(400).json({ error: "Missing adminEmail or rewards array" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { marketRewards: rewards } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving market rewards:", err);
    res.status(500).json({ error: "Failed to save market rewards" });
  }
});

// ✅ Get all market rewards for an admin
app.get("/api/market-rewards", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ rewards: admin?.marketRewards || [] });
  } catch (err) {
    console.error("Error fetching market rewards:", err);
    res.status(500).json({ error: "Failed to fetch market rewards" });
  }
});

// ✅ Delete a specific market reward for an admin
app.delete("/api/market-rewards", async (req, res) => {
  const { adminEmail, index } = req.query;

  if (!adminEmail || index === undefined) {
    return res.status(400).json({ error: "Missing adminEmail or index" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const rewards = admin.marketRewards || [];
    if (index < 0 || index >= rewards.length) {
      return res.status(400).json({ error: "Invalid index" });
    }

    rewards.splice(index, 1); // Remove the reward at the specified index

    await admins.updateOne(
      { email: adminEmail },
      { $set: { marketRewards: rewards } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting market reward:", err);
    res.status(500).json({ error: "Failed to delete market reward" });
  }
});















// ✅ Save user rewards for an admin
app.post("/api/user-rewards", async (req, res) => {
  const { adminEmail, userRewards } = req.body;

  if (!adminEmail || !userRewards) {
    return res.status(400).json({ error: "Missing adminEmail or userRewards" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { userRewards } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving user rewards:", err);
    res.status(500).json({ error: "Failed to save user rewards" });
  }
});

// ✅ Get user rewards for an admin
app.get("/api/user-rewards", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ userRewards: admin?.userRewards || {} });
  } catch (err) {
    console.error("Error fetching user rewards:", err);
    res.status(500).json({ error: "Failed to fetch user rewards" });
  }
});

















// ✅ Save task history for an admin
app.post("/api/history", async (req, res) => {
  const { adminEmail, history } = req.body;

  if (!adminEmail || !history) {
    return res.status(400).json({ error: "Missing adminEmail or history" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { history } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving history:", err);
    res.status(500).json({ error: "Failed to save history" });
  }
});

// ✅ Get task history for an admin
app.get("/api/history", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ history: admin?.history || {} });
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ✅ Save lucky chests for an admin
app.post("/api/lucky-chests", async (req, res) => {
  const { adminEmail, luckyChests } = req.body;

  if (!adminEmail || !luckyChests) {
    return res.status(400).json({ error: "Missing adminEmail or luckyChests" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { luckyChests } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving lucky chests:", err);
    res.status(500).json({ error: "Failed to save lucky chests" });
  }
});

// ✅ Get lucky chests for an admin
app.get("/api/lucky-chests", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ luckyChests: admin?.luckyChests || {} });
  } catch (err) {
    console.error("Error fetching lucky chests:", err);
    res.status(500).json({ error: "Failed to fetch lucky chests" });
  }
});




// ✅ Save reward history for an admin userrewards.html
app.post("/api/reward-history", async (req, res) => {
  const { adminEmail, rewardHistory } = req.body;

  if (!adminEmail || !rewardHistory) {
    return res.status(400).json({ error: "Missing adminEmail or rewardHistory" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { rewardHistory } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving reward history:", err);
    res.status(500).json({ error: "Failed to save reward history" });
  }
});

// ✅ Get reward history for an admin
app.get("/api/reward-history", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ rewardHistory: admin?.rewardHistory || {} });
  } catch (err) {
    console.error("Error fetching reward history:", err);
    res.status(500).json({ error: "Failed to fetch reward history" });
  }
});


// ✅ Save reward history for an admin userrewards.html




// ✅ Save custom chests for an admin
app.post("/api/custom-chests", async (req, res) => {
  const { adminEmail, customChests } = req.body;

  if (!adminEmail || !customChests) {
    return res.status(400).json({ error: "Missing adminEmail or customChests" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { customChests } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving custom chests:", err);
    res.status(500).json({ error: "Failed to save custom chests" });
  }
});

// ✅ Get custom chests for an admin
app.get("/api/custom-chests", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ customChests: admin?.customChests || [] });
  } catch (err) {
    console.error("Error fetching custom chests:", err);
    res.status(500).json({ error: "Failed to fetch custom chests" });
  }
});









// ✅ Save reward history for an admin luckychest.html





