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



// login.html //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ✅ SET ADMIN PASSWORD
app.post('/set-admin-password', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Missing email or password" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection('admins');

    const existingAdmin = await admins.findOne({ email });
    if (existingAdmin && existingAdmin.adminPassword) {
      return res.status(403).json({ success: false, message: "Admin password already set" });
    }

    await admins.updateOne(
      { email },
      { $set: { adminPassword: password } },
      { upsert: true }
    );

    res.json({ success: true, message: "Admin password set successfully" });
  } catch (err) {
    console.error("🔥 Error in /set-admin-password:", err);
    res.status(500).json({ success: false, message: "Failed to set admin password" });
  }
});

// ✅ VERIFY ADMIN PASSWORD
app.post('/verify-admin-password', async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Missing email" });
  }

  if (password === undefined || password === null) {
    return res.status(400).json({ success: false, message: "Missing password" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection('admins');

    const admin = await admins.findOne({ email });

    if (!admin || !admin.adminPassword) {
      return res.status(401).json({ success: false, message: "No admin password set" });
    }

    if (admin.adminPassword !== password) {
      return res.status(401).json({ success: false, message: "Invalid admin password" });
    }

    res.json({ success: true, message: "Admin password verified" });
  } catch (err) {
    console.error("🔥 Error in /verify-admin-password:", err);
    res.status(500).json({ success: false, message: "Failed to verify admin password" });
  }
});


// ✅ CHECK ADMIN PASSWORD EXISTENCE
app.post('/check-admin-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Missing email" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection('admins');

    const admin = await admins.findOne({ email });

    if (!admin || !admin.adminPassword) {
      return res.json({ success: false, hasPassword: false, message: "No admin password set" });
    }

    res.json({ success: true, hasPassword: true, message: "Admin password exists" });
  } catch (err) {
    console.error("🔥 Error in /check-admin-password:", err);
    res.status(500).json({ success: false, message: "Failed to check admin password" });
  }
});




// ✅ CHANGE ADMIN PASSWORD
app.post('/change-admin-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;

  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Missing email, current password, or new password" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection('admins');

    const admin = await admins.findOne({ email });
    if (!admin || admin.adminPassword !== currentPassword) {
      return res.status(401).json({ success: false, message: "Incorrect current password" });
    }

    await admins.updateOne(
      { email },
      { $set: { adminPassword: newPassword } }
    );

    res.json({ success: true, message: "Admin password changed successfully" });
  } catch (err) {
    console.error("🔥 Error in /change-admin-password:", err);
    res.status(500).json({ success: false, message: "Failed to change admin password" });
  }
});



// login.html ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// home.html ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

    console.log(`Fetched users for ${adminEmail}:`, {
      users: adminDoc?.users || [],
      avatars: adminDoc?.avatars || {}
    });

    res.json({
      success: true,
      users: adminDoc?.users || [],
      permissions: adminDoc?.permissions || {},
      avatars: adminDoc?.avatars || {}
    });
  } catch (error) {
    console.error("🔥 Error in /get-users:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});







// ✅ ADD NEW USER TO SPECIFIC ADMIN
// ✅ ADD NEW USER TO SPECIFIC ADMIN
app.post('/add-user', async (req, res) => {
  const { adminEmail, newUser, role } = req.body;

  if (!adminEmail || !newUser) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');

    // Add user to the users array (if not already added)
    await adminUsers.updateOne(
      { email: adminEmail },
      { $addToSet: { users: newUser } }, // avoids duplicates
      { upsert: true }
    );

    // Set their role in permissions
    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { [`permissions.${newUser}`]: role || "User" } }
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




// ✅ Save updated user permissions for an admin
app.post("/save-permissions", async (req, res) => {
  const { adminEmail, permissions } = req.body;

  if (!adminEmail || !permissions) {
    return res.status(400).json({ success: false, message: "Missing adminEmail or permissions" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { permissions } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error saving permissions:", err);
    res.status(500).json({ success: false, message: "Failed to save permissions" });
  }
});







// ✅ Get permission of a specific user for a given admin
app.get("/get-permission", async (req, res) => {
  const { adminEmail, username } = req.query;

  if (!adminEmail || !username) {
    return res.status(400).json({ success: false, message: "Missing adminEmail or username" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection("adminUsers");

    const adminDoc = await adminUsers.findOne({ email: adminEmail });
    const permission = adminDoc?.permissions?.[username] || "User";

    res.json({ success: true, permission });
  } catch (err) {
    console.error("🔥 Error in /get-permission:", err);
    res.status(500).json({ success: false, message: "Failed to get permission" });
  }
});




// end point home.html ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ✅ GET ALL TASKS FOR ADMIN 




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
    console.log(`Fetched tasks for ${adminEmail}:`, tasks.map(t => ({ title: t.title, users: t.users, date: t.date, pendingCompletions: t.pendingCompletions, completions: t.completions }))); // Debug

    res.json({ success: true, tasks });
  } catch (err) {
    console.error("🔥 Error in /get-tasks:", err);
    res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
});





// register.html forgot password ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: 'mail.inbox.lv',
  port: 587,
  secure: false,
  auth: {
    user: 'beemazing@inbox.lv',
    pass: '6BZ54xudDX'
  },
  timeout: 10000,
  tls: {
    rejectUnauthorized: false
  }
});


// Verify transporter on server start
transporter.verify((error, success) => {
  if (error) {
    console.error('🔥 SMTP connection error:', error);
  } else {
    console.log('✅ SMTP server is ready to send emails');
  }
});




// FORGOT PASSWORD
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    console.log("🔥 /forgot-password: Missing email in request");
    return res.status(400).json({ success: false, message: "Missing email" });
  }

  try {
    const db = await connectDB();
    const users = db.collection('users');
    const user = await users.findOne({ email });

    if (!user) {
      console.log(`🔥 /forgot-password: Email not found - ${email}`);
      return res.status(404).json({ success: false, message: "Email not found" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour expiry

    // Store token in database
    await users.updateOne(
      { email },
      { $set: { resetToken, resetTokenExpiry } }
    );
    console.log(`✅ /forgot-password: Generated resetToken for ${email}: ${resetToken}`);

    // Send reset email
    const resetLink = `https://g4mechanger.github.io/BeeMazing-Y1/register.html?resetToken=${resetToken}`;
    const mailOptions = {
      from: 'beemazing@inbox.lv',
      to: email,
      subject: 'BeeMazing Password Reset',
      html: `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your BeeMazing password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ /forgot-password: Reset email sent to ${email}`);
    res.json({ success: true, message: "Password reset link sent to your email" });
  } catch (err) {
    console.error(`🔥 /forgot-password: Error for ${email} -`, err);
    res.status(500).json({ success: false, message: "Failed to process password reset" });
  }
});




// RESET PASSWORD
app.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    console.log("🔥 /reset-password: Missing reset token or new password");
    return res.status(400).json({ success: false, message: "Missing reset token or new password" });
  }

  try {
    const db = await connectDB();
    const users = db.collection('users');
    const user = await users.findOne({
      resetToken,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      console.log("🔥 /reset-password: Invalid or expired reset token");
      return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
    }

    // Log the token
    console.log(`✅ /reset-password: Valid resetToken for ${user.email}: ${resetToken}`);

    // Update password and clear reset token
    await users.updateOne(
      { resetToken },
      {
        $set: { password: newPassword },
        $unset: { resetToken: "", resetTokenExpiry: "" }
      }
    );

    console.log(`✅ /reset-password: Password reset successfully for ${user.email}`);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("🔥 /reset-password: Error -", err);
    res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});






// Test email endpoint for debugging
// Test email endpoint for debugging
app.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'Missing email in request body' });
  }
  try {
    const mailOptions = {
      from: 'beemazing@inbox.lv',
      to: email,
      subject: 'Test Email from BeeMazing',
      text: 'This is a test email to verify SMTP configuration.'
    };
    await transporter.sendMail(mailOptions);
    console.log(`✅ Test email sent to ${email}`);
    res.json({ success: true, message: `Test email sent to ${email}` });
  } catch (err) {
    console.error('🔥 Test email error:', err);
    res.status(500).json({ success: false, message: 'Failed to send test email' });
  }
});




// register.html forgot password ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});


// Save a single task for an admin
app.post("/api/tasks", async (req, res) => {
  const { adminEmail, task } = req.body;
  if (!adminEmail || !task) {
    return res.status(400).json({ error: "Missing adminEmail or task" });
  }
  try {
    console.log("POST /api/tasks - Received task:", { title: task.title, users: task.users }); // Debug
    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });
    const updatedTasks = admin?.tasks || [];
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
    console.log("POST /api/tasks - Saved task:", { title: task.title, users: task.users }); // Debug
    res.json({ success: true });
  } catch (err) {
    console.error("Error saving task:", err);
    res.status(500).json({ error: "Failed to save task" });
  }
});

// Get all tasks for an admin
app.get("/api/tasks", async (req, res) => {
  const { adminEmail } = req.query;
  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }
  try {
    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });
    console.log("GET /api/tasks - Fetched tasks for", adminEmail, ":", admin?.tasks?.map(t => ({ title: t.title, users: t.users }))); // Debug
    res.json({ tasks: admin?.tasks || [] });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});





app.delete("/api/delete-any-task", async (req, res) => {
  const { adminEmail, taskIndex } = req.query;

  if (!adminEmail || taskIndex === undefined) {
    console.log(`Missing adminEmail or taskIndex: adminEmail=${adminEmail}, taskIndex=${taskIndex}`);
    return res.status(400).json({ error: "Missing adminEmail or taskIndex" });
  }

  try {
    console.log(`Attempting to delete task at index ${taskIndex} for adminEmail=${adminEmail}`);
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    if (!admin) {
      console.log(`Admin not found: ${adminEmail}`);
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    if (taskIndex < 0 || taskIndex >= tasks.length) {
      console.log(`Invalid task index: ${taskIndex}, tasks length: ${tasks.length}`);
      return res.status(400).json({ error: "Invalid task index" });
    }

    // Remove the task at the specified index
    tasks.splice(taskIndex, 1);

    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks } }
    );

    console.log(`Task at index ${taskIndex} deleted successfully for ${adminEmail}`);
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    console.error(`Error deleting task at index ${taskIndex}:`, err);
    res.status(500).json({ error: "Failed to delete task", details: err.message });
  }
});




// Delete a specific task for an admin
app.delete("/api/tasks", async (req, res) => {
  const { adminEmail, title, date } = req.query;

  if (!adminEmail || !title || !date) {
    return res.status(400).json({ error: "Missing adminEmail, title, or date" });
  }

  try {
    console.log(`Attempting to delete task: adminEmail=${adminEmail}, title=${title}, date=${date}`);
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    if (!admin) {
      console.log(`Admin not found: ${adminEmail}`);
      return res.status(404).json({ error: "Admin not found" });
    }

    const updatedTasks = admin.tasks.filter(task => {
      const taskStartDate = task.date.split(" to ")[0];
      return !(task.title === title && taskStartDate === date);
    });

    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks: updatedTasks } }
    );

    console.log(`Task deleted successfully: title=${title}, date=${date}`);
    res.json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    console.error(`Error deleting task (title=${title}, date=${date}):`, err);
    res.status(500).json({ error: "Failed to delete task", details: err.message });
  }
});



// ✅ Update a specific task for an admin
app.put("/api/tasks", async (req, res) => {
  const { adminEmail, task, originalTitle, originalDate } = req.body;
  if (!adminEmail || !task || !originalTitle || !originalDate) {
    return res.status(400).json({ error: "Missing adminEmail, task, originalTitle, or originalDate" });
  }
  if (!task.title || !task.date || !Array.isArray(task.users)) {
    return res.status(400).json({ error: "Task missing required fields: title, date, or users" });
  }
  try {
    console.log("PUT /api/tasks - Received:", { originalTitle, originalDate, newTask: { title: task.title, date: task.date, users: task.users } });
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
      console.log(`Task not found: ${originalTitle}, ${originalDate}`);
      return res.status(404).json({ error: "Task not found" });
    }
    console.log("Before update:", tasks[taskIndex]);
    tasks[taskIndex] = task;
    console.log("After update:", tasks[taskIndex]);
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

      const marketRewards = admin.marketRewards || [];
      if (index < 0 || index >= marketRewards.length) {
          return res.status(400).json({ error: "Invalid reward index" });
      }

      // Get the reward to be deleted
      const deletedReward = marketRewards[index];
      const rewardName = deletedReward.name;

      // Remove from marketRewards
      marketRewards.splice(index, 1);

      // Clean up userRewards
      const userRewards = admin.userRewards || {};
      for (const user in userRewards) {
          userRewards[user] = userRewards[user].filter(reward => reward.name !== rewardName);
          if (userRewards[user].length === 0) {
              delete userRewards[user];
          }
      }

      // Clean up rewardHistory
      const rewardHistory = admin.rewardHistory || {};
      for (const user in rewardHistory) {
          rewardHistory[user] = rewardHistory[user].filter(history => history.rewardName !== rewardName);
          if (rewardHistory[user].length === 0) {
              delete rewardHistory[user];
          }
      }

      // Clean up pendingRewardRequests and refund points
      const pendingRewardRequests = admin.pendingRewardRequests || [];
      const rewards = admin.rewards || {};
      const deletedRequests = pendingRewardRequests.filter(req => req.rewardName === rewardName);
      for (const req of deletedRequests) {
          if (req.status === "pending") {
              rewards[req.user] = (rewards[req.user] || 0) + req.rewardCost;
          }
      }
      const updatedPendingRequests = pendingRewardRequests.filter(req => req.rewardName !== rewardName);

      await admins.updateOne(
          { email: adminEmail },
          { $set: { marketRewards, userRewards, rewardHistory, pendingRewardRequests: updatedPendingRequests, rewards } }
      );

      res.json({ success: true, message: "Reward deleted successfully" });
  } catch (err) {
      console.error("Error deleting reward:", err);
      res.status(500).json({ error: "Failed to delete reward" });
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





// ✅ Save a pending reward request
// ✅ Save a pending reward request


app.post("/api/reward-request", async (req, res) => {
  const { adminEmail, user, rewardName, rewardCost, deductPoints } = req.body;

  if (!adminEmail || !user || !rewardName || rewardCost === undefined) {
      return res.status(400).json({ error: "Missing adminEmail, user, rewardName, or rewardCost" });
  }

  try {
      const db = await connectDB();
      const admins = db.collection("admins");

      const admin = await admins.findOne({ email: adminEmail });
      const rewards = admin?.rewards || {};
      const pendingRewardRequests = admin?.pendingRewardRequests || [];
      const rewardHistory = admin?.rewardHistory || {};

      // Check if user has enough points
      const userPoints = rewards[user] || 0;
      if (deductPoints && userPoints < rewardCost) {
          return res.status(400).json({ error: "Insufficient points" });
      }

      // Deduct points if requested
      if (deductPoints) {
          rewards[user] = userPoints - rewardCost;
      }

      // Add to pending requests
      pendingRewardRequests.push({ user, rewardName, rewardCost, status: "pending", timestamp: Date.now() });

      // Add to reward history as pending
      if (!rewardHistory[user]) rewardHistory[user] = [];
      rewardHistory[user].push({
          rewardName,
          rewardCost,
          status: "Pending",
          timestamp: new Date().toISOString()
      });

      await admins.updateOne(
          { email: adminEmail },
          { $set: { rewards, pendingRewardRequests, rewardHistory } },
          { upsert: true }
      );

      res.json({ success: true, message: "Reward request submitted" });
  } catch (err) {
      console.error("Error saving reward request:", err);
      res.status(500).json({ error: "Failed to save reward request" });
  }
});

app.post("/api/review-reward", async (req, res) => {
  const { adminEmail, requestIndex, decision } = req.body;

  if (!adminEmail || requestIndex === undefined || !decision) {
      return res.status(400).json({ error: "Missing adminEmail, requestIndex, or decision" });
  }

  if (!["approve", "decline"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
  }

  try {
      const db = await connectDB();
      const admins = db.collection("admins");

      const admin = await admins.findOne({ email: adminEmail });
      if (!admin) {
          return res.status(404).json({ error: "Admin not found" });
      }

      const pendingRewardRequests = admin.pendingRewardRequests || [];
      if (requestIndex < 0 || requestIndex >= pendingRewardRequests.length) {
          return res.status(400).json({ error: "Invalid request index" });
      }

      const request = pendingRewardRequests[requestIndex];
      if (request.status !== "pending") {
          return res.status(400).json({ error: "Request already processed" });
      }

      const rewards = admin.rewards || {};
      const userRewards = admin.userRewards || {};
      const rewardHistory = admin.rewardHistory || {};

      // Update history
      const userHistory = rewardHistory[request.user] || [];
      const historyIndex = userHistory.findIndex(h => 
          h.rewardName === request.rewardName && 
          h.rewardCost === request.rewardCost && 
          h.status === "Pending" && 
          new Date(h.timestamp).getTime() === request.timestamp
      );

      if (historyIndex !== -1) {
          userHistory[historyIndex].status = decision === "approve" ? "Approved" : "Declined";
      }

      if (decision === "approve") {
          // Add to user rewards
          if (!userRewards[request.user]) userRewards[request.user] = [];
          userRewards[request.user].push({
              name: request.rewardName,
              date: new Date().toLocaleString()
          });
      } else {
          // Refund points if declined
          rewards[request.user] = (rewards[request.user] || 0) + request.rewardCost;
      }

      // Remove from pending requests
      pendingRewardRequests.splice(requestIndex, 1);

      await admins.updateOne(
          { email: adminEmail },
          { $set: { pendingRewardRequests, rewards, userRewards, rewardHistory } }
      );

      res.json({ success: true, message: `Reward ${decision}d successfully` });
  } catch (err) {
      console.error("Error reviewing reward request:", err);
      res.status(500).json({ error: "Failed to process reward request" });
  }
});




// ✅ Get pending reward requests
app.get("/api/reward-requests", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    const pendingRewardRequests = admin?.pendingRewardRequests || [];

    res.json({ success: true, requests: pendingRewardRequests });
  } catch (err) {
    console.error("Error fetching pending reward requests:", err);
    res.status(500).json({ error: "Failed to fetch pending reward requests" });
  }
});








// ✅ Get pending reward requests
app.get("/api/reward-requests", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    const pendingRewardRequests = admin?.pendingRewardRequests || [];

    res.json({ success: true, requests: pendingRewardRequests });
  } catch (err) {
    console.error("Error fetching pending reward requests:", err);
    res.status(500).json({ error: "Failed to fetch pending reward requests" });
  }
});

// ✅ Approve or decline a reward request
app.post("/api/review-reward", async (req, res) => {
  const { adminEmail, requestIndex, decision } = req.body;

  if (!adminEmail || requestIndex === undefined || !decision) {
    return res.status(400).json({ error: "Missing adminEmail, requestIndex, or decision" });
  }

  if (!["approve", "decline"].includes(decision)) {
    return res.status(400).json({ error: "Invalid decision" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const pendingRewardRequests = admin.pendingRewardRequests || [];
    if (requestIndex < 0 || requestIndex >= pendingRewardRequests.length) {
      return res.status(400).json({ error: "Invalid request index" });
    }

    const request = pendingRewardRequests[requestIndex];
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already processed" });
    }

    // Update request status
    request.status = decision;
    // Update reward history
    const rewardHistory = admin.rewardHistory || {};
    if (!rewardHistory[request.user]) {
      rewardHistory[request.user] = [];
    }
    rewardHistory[request.user].push({
      rewardName: request.rewardName,
      rewardCost: request.rewardCost,
      status: decision,
      timestamp: new Date().toISOString(),
    });

    if (decision === "approve") {
      // Deduct points
      const rewards = admin.rewards || {};
      rewards[request.user] = (rewards[request.user] || 0) - request.rewardCost;
      await admins.updateOne(
        { email: adminEmail },
        { $set: { rewards } }
      );
    }

    // Remove from pending requests
    pendingRewardRequests.splice(requestIndex, 1);

    await admins.updateOne(
      { email: adminEmail },
      { $set: { pendingRewardRequests, rewardHistory } }
    );

    res.json({ success: true, message: `Reward ${decision}d successfully` });
  } catch (err) {
    console.error("Error reviewing reward request:", err);
    res.status(500).json({ error: "Failed to process reward request" });
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



// userAdmin.html ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.post("/api/replace-user", async (req, res) => {
  const { adminEmail, title, date, selectedDate, index, originalUser, newUser } = req.body;

  try {
    if (!adminEmail || !title || !date || !selectedDate || index === undefined || !originalUser || !newUser) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    const taskIndex = tasks.findIndex(t => t.title === title && t.date === date);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskIndex];
    task.tempTurnReplacement = task.tempTurnReplacement || {};
    task.tempTurnReplacement[selectedDate] = task.tempTurnReplacement[selectedDate] || {};
    task.tempTurnReplacement[selectedDate][index] = newUser;

    tasks[taskIndex] = task;
    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks } }
    );

    res.json({ success: true, message: "User replaced successfully" });
  } catch (err) {
    console.error("Error replacing user:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});






app.post("/api/reorder-turns", async (req, res) => {
  const { adminEmail, title, date, users, resetTempReplacement, selectedDate } = req.body;

  try {
    if (!adminEmail || !title || !date || !Array.isArray(users) || !selectedDate) {
      return res.status(400).json({ error: "Missing or invalid required fields" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    const taskIndex = tasks.findIndex(t => t.title === title && t.date === date);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskIndex];
    console.log(`Before reorder: Task ${title}, date=${date}, users=${JSON.stringify(task.users)}, tempTurnReplacement[${selectedDate}]=${JSON.stringify(task.tempTurnReplacement?.[selectedDate])}`); // Debug
    task.users = users;
    if (resetTempReplacement && task.tempTurnReplacement?.[selectedDate]) {
      delete task.tempTurnReplacement[selectedDate];
    }
    console.log(`After reorder: Task ${title}, date=${date}, users=${JSON.stringify(task.users)}, tempTurnReplacement[${selectedDate}]=${JSON.stringify(task.tempTurnReplacement?.[selectedDate])}`); // Debug

    tasks[taskIndex] = task;
    const updateResult = await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks } }
    );
    console.log(`MongoDB update result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`); // Debug

    res.json({ success: true });
  } catch (err) {
    console.error("Error reordering turns:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});





app.post("/api/revert-decision", async (req, res) => {
  const { adminEmail, title, date, selectedDate, user } = req.body;

  try {
    if (!adminEmail || !title || !date || !selectedDate || !user) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    const tasks = admin.tasks || [];
    const taskIndex = tasks.findIndex(t => t.title === title && t.date === date);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskIndex];
    task.completions = task.completions || {};
    task.completions[selectedDate] = task.completions[selectedDate] || [];

    const completions = task.completions[selectedDate];
    if (!completions.includes(user)) {
      return res.status(400).json({ error: "User has no completed task to revert" });
    }

    // Remove from completions
    completions.splice(completions.indexOf(user), 1);

    // Deduct reward
    const rewardAmount = Number(task.reward || 0);
    if (rewardAmount > 0) {
      const rewards = admin.rewards || {};
      rewards[user] = Math.max(0, (rewards[user] || 0) - rewardAmount);
      await admins.updateOne(
        { email: adminEmail },
        { $set: { rewards } }
      );
    }

    tasks[taskIndex] = task;
    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks } }
    );

    res.json({ success: true, message: "Decision reverted successfully" });
  } catch (err) {
    console.error("Error reverting decision:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});







// ✅ Get all tasks for non-admin users (for userAdmin.html)
app.get("/api/admin-tasks", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ success: false, message: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");
    const adminUsers = db.collection("adminUsers");

    // Fetch admin data
    const admin = await admins.findOne({ email: adminEmail });
    const tasks = admin?.tasks || [];

    // Fetch non-admin users
    const adminDoc = await adminUsers.findOne({ email: adminEmail });
    const users = adminDoc?.users || [];
    const permissions = adminDoc?.permissions || {};
    const nonAdminUsers = users.filter(user => permissions[user] !== "Admin");

    // Process tasks for non-admin users
    const today = new Date().toLocaleDateString("sv-SE");
    const adminTasks = [];

    tasks.forEach(task => {
      const dateRange = task.date.split(" to ");
      const startDateStr = dateRange[0];
      const endDateStr = dateRange[1] || "3000-01-01";
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const currentDate = new Date(today);

      if (currentDate < startDate || currentDate > endDate) return;

      const taskUsers = task.users?.filter(user => nonAdminUsers.includes(user)) || [];
      if (taskUsers.length === 0) return;

      let requiredTimes = 1;
      if (task.repeat === "Daily") requiredTimes = task.timesPerDay || 1;
      if (task.repeat === "Weekly") requiredTimes = task.timesPerWeek || 1;
      if (task.repeat === "Monthly") requiredTimes = task.timesPerMonth || 1;

      let completedUsers = task.completions?.[today] || [];
      let completedTimes = completedUsers.length;



      let currentTurn;
      if (task.repeat === "Daily" && task.timesPerDay === 1) {
          const dateRange = task.date.split(" to ");
          const startDateStr = dateRange[0];
          const startDate = parseLocalDate(startDateStr);
          const currentDate = parseLocalDate(selectedDate);
          const userOrder = [...task.users];
      
          const diffDays = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
          let currentIndex = diffDays % userOrder.length;
          let assumedTurn = userOrder[currentIndex];
      
          // Check if yesterday's turn missed their task
          const prevDate = new Date(currentDate);
          prevDate.setDate(prevDate.getDate() - 1);
          const prevDateStr = prevDate.toISOString().split("T")[0];
          const prevDiff = Math.floor((prevDate - startDate) / (1000 * 60 * 60 * 24));
          const prevIndex = prevDiff % userOrder.length;
          const prevTurn = userOrder[prevIndex];
          const prevCompleted = task.completions?.[prevDateStr] || [];
      
          if (!prevCompleted.includes(prevTurn)) {
              currentTurn = prevTurn;
          } else {
              currentTurn = assumedTurn;
          }
      } else {
          currentTurn = task.tempTurnReplacement?.replacement || task.turn || task.users[0];
      }
      




      if (completedTimes < requiredTimes) {
        adminTasks.push({
          title: task.title,
          user: currentTurn,
          status: "Pending",
          reward: task.reward || 0
        });
      } else {
        taskUsers.forEach(user => {
          if (completedUsers.includes(user)) {
            adminTasks.push({
              title: task.title,
              user,
              status: "Completed",
              reward: task.reward || 0
            });
          }
        });
      }
    });

    res.json({ success: true, tasks: adminTasks });
  } catch (err) {
    console.error("🔥 Error in /api/admin-tasks:", err);
    res.status(500).json({ success: false, message: "Failed to fetch admin tasks" });
  }
});

// ✅ Handle task accept/decline actions



//  taskrotations.js

app.post('/api/review-task', async (req, res) => {
  const { adminEmail, title, date, selectedDate, user, decision, index, repetition } = req.body;

  try {
    if (!adminEmail || !title || !date || !selectedDate || !user || !decision || repetition === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await connectDB();
    const admins = db.collection('admins');
    const admin = await admins.findOne({ email: adminEmail });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const tasks = admin.tasks || [];
    const taskIndex = tasks.findIndex(t => t.title === title && t.date === date);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[taskIndex];
    task.pendingCompletions = task.pendingCompletions || {};
    task.pendingCompletions[selectedDate] = task.pendingCompletions[selectedDate] || [];
    task.completions = task.completions || {};
    task.completions[selectedDate] = task.completions[selectedDate] || [];

    const pending = task.pendingCompletions[selectedDate];
    const completions = task.completions[selectedDate];

    // Find the pending entry for this user and repetition
    const pendingEntryIndex = pending.findIndex(p => p.user === user && p.repetition === repetition);
    if (pendingEntryIndex === -1 && decision === 'accept') {
      return res.status(400).json({ error: 'User has not submitted this task for this repetition' });
    }

    let rewardAmount = 0;
    const requiredTimes = task.timesPerDay || 1;

    if (decision === 'accept') {
      // Count current completions for this user
      const userCompletions = completions.filter(c => c.user === user).length;
      if (userCompletions >= requiredTimes) {
        return res.status(400).json({ error: 'User has already completed the maximum number of tasks for this day' });
      }

      // Move from pending to completions
      const pendingEntry = pending.splice(pendingEntryIndex, 1)[0];
      completions.push({ user, repetition });

      // Award reward only if this is a new completion
      rewardAmount = Number(task.reward || 0);
      if (rewardAmount > 0 && userCompletions < requiredTimes) {
        const rewards = admin.rewards || {};
        rewards[user] = (rewards[user] || 0) + rewardAmount;
        await admins.updateOne(
          { email: adminEmail },
          { $set: { rewards } }
        );
      }
    } else if (decision === 'decline') {
      // Remove from pending
      if (pendingEntryIndex !== -1) {
        pending.splice(pendingEntryIndex, 1);
      }
    }

    tasks[taskIndex] = task;
    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks } }
    );

    res.json({ success: true, message: `Task ${decision}d successfully`, rewardAmount });
  } catch (err) {
    console.error('Error reviewing task:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// userAdmin.html ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////





// users.html and tasks.html task details //



// taskrotations.js




app.post("/api/complete-task", async (req, res) => {
  const { adminEmail, taskTitle, user, date } = req.body;
  try {
    if (!adminEmail || !taskTitle || !user || !date) {
      console.error("🔥 /api/complete-task: Missing fields", { adminEmail, taskTitle, user, date });
      return res.status(400).json({ error: "Missing required fields: adminEmail, taskTitle, user, or date" });
    }

    const db = await connectDB();
    const admins = db.collection("admins");
    const adminUsers = db.collection("adminUsers");
    const admin = await admins.findOne({ email: adminEmail });
    if (!admin) {
      console.error("🔥 /api/complete-task: Admin not found", { adminEmail });
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if user is an Admin
    const adminDoc = await adminUsers.findOne({ email: adminEmail });
    const isAdmin = adminDoc?.permissions?.[user] === "Admin";
    console.log("🔍 /api/complete-task: User permission", { user, isAdmin });

    const tasks = admin.tasks || [];
    const normalizedDate = date.split("T")[0];
    const taskIndex = tasks.findIndex(t => {
      if (t.title !== taskTitle) return false;
      const [startDateStr, endDateStr] = t.date.split(" to ");
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr || "3000-01-01");
      const currentDate = new Date(normalizedDate);
      return currentDate >= startDate && currentDate <= endDate;
    });
    if (taskIndex === -1) {
      console.error("🔥 /api/complete-task: Task not found", { taskTitle, normalizedDate });
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskIndex];
    task.pendingCompletions = task.pendingCompletions || {};
    task.pendingCompletions[normalizedDate] = task.pendingCompletions[normalizedDate] || [];
    task.completions = task.completions || {};
    task.completions[normalizedDate] = task.completions[normalizedDate] || [];

    const pendingCount = task.pendingCompletions[normalizedDate].filter(p => p.user === user).length;
    const completedCount = task.completions[normalizedDate].filter(c => c.user === user).length;
    const totalCount = pendingCount + completedCount;

    let requiredTimes = 1;
    if (task.repeat === "Daily") requiredTimes = task.timesPerDay || 1;
    if (task.repeat === "Weekly") requiredTimes = task.timesPerWeek || 1;
    if (task.repeat === "Monthly") requiredTimes = task.timesPerMonth || 1;

    if (totalCount >= requiredTimes) {
      console.error("🔥 /api/complete-task: Max submissions reached", { user, taskTitle, totalCount, requiredTimes });
      return res.status(400).json({ error: "Task already submitted maximum times today" });
    }

    const userList = task.users || [];
    const tempTurnReplacement = task.tempTurnReplacement?.[normalizedDate] || {};
    const assignedUsers = [...new Set([...userList, ...Object.values(tempTurnReplacement)])];
    const isAssigned = userList.includes(user) || Object.values(tempTurnReplacement).includes(user);
    if (!isAssigned) {
      console.error("🔥 /api/complete-task: User not assigned", { user, taskTitle, userList, tempTurnReplacement });
      return res.status(400).json({ error: "User not assigned to this task" });
    }

    const repetition = totalCount + 1;
    const isRotation = task.settings?.includes("Rotation");

    // Initialize currentTurnIndex if not set
    if (typeof task.currentTurnIndex !== "number" || task.currentTurnIndex < 0 || task.currentTurnIndex >= assignedUsers.length) {
      task.currentTurnIndex = assignedUsers.indexOf(user);
      if (task.currentTurnIndex === -1) task.currentTurnIndex = 0;
    }

    const history = admin.history || {};
    const month = new Date(normalizedDate).toLocaleString("default", { month: "long" });
    const day = new Date(normalizedDate).getDate();
    if (!history[month]) history[month] = {};
    if (!history[month][day]) history[month][day] = [];

    if (isAdmin) {
      // For Admins, mark as completed directly
      task.completions[normalizedDate].push({ user, repetition });
      const rewardAmount = Number(task.reward || 0);
      if (rewardAmount > 0) {
        const rewards = admin.rewards || {};
        rewards[user] = (rewards[user] || 0) + rewardAmount;
        await admins.updateOne({ email: adminEmail }, { $set: { rewards } });
      }
      history[month][day].push({ title: taskTitle, user, timestamp: new Date().toISOString(), action: "completed" });
      console.log("✅ /api/complete-task: Admin task completed", { user, taskTitle, rewardAmount });

      // Advance turn for rotation tasks
      if (isRotation && task.repeat === "Daily" && task.timesPerDay === 1) {
        // Check if previous day's turn was missed
        const prevDate = new Date(normalizedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split("T")[0];
        const prevCompletions = task.completions?.[prevDateStr] || [];
        const prevPending = task.pendingCompletions?.[prevDateStr] || [];
        const prevAssignedUsers = [...new Set([...userList, ...(task.tempTurnReplacement?.[prevDateStr] || {})])];
        const prevTurnIndex = (task.currentTurnIndex - 1 + prevAssignedUsers.length) % prevAssignedUsers.length;
        const prevTurnUser = prevAssignedUsers[prevTurnIndex];

        if (!prevCompletions.some(c => c.user === prevTurnUser) && !prevPending.some(p => p.user === prevTurnUser)) {
          // Previous turn was missed; don't advance
          console.log("🔍 /api/complete-task: Previous turn missed, not advancing", { prevTurnUser, prevDateStr });
        } else {
          task.currentTurnIndex = (task.currentTurnIndex + 1) % assignedUsers.length;
          console.log("🔍 /api/complete-task: Advanced turn", { taskTitle, currentTurnIndex: task.currentTurnIndex, nextUser: assignedUsers[task.currentTurnIndex] });
        }
      } else if (isRotation) {
        // For other rotation tasks, advance based on total completions
        const totalCompletions = task.completions[normalizedDate].length + task.pendingCompletions[normalizedDate].length;
        if (totalCompletions >= requiredTimes) {
          task.currentTurnIndex = (task.currentTurnIndex + 1) % assignedUsers.length;
          console.log("🔍 /api/complete-task: Advanced turn after required completions", { taskTitle, currentTurnIndex: task.currentTurnIndex, nextUser: assignedUsers[task.currentTurnIndex] });
        }
      }
    } else {
      // For non-Admins, submit for review
      task.pendingCompletions[normalizedDate].push({ user, repetition });
      history[month][day].push({ title: taskTitle, user, timestamp: new Date().toISOString(), action: "submitted" });
      console.log("✅ /api/complete-task: Non-admin task submitted for review", { user, taskTitle, repetition });

      // Advance turn for rotation tasks only after all required completions
      if (isRotation && task.repeat === "Daily" && task.timesPerDay === 1) {
        const prevDate = new Date(normalizedDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split("T")[0];
        const prevCompletions = task.completions?.[prevDateStr] || [];
        const prevPending = task.pendingCompletions?.[prevDateStr] || [];
        const prevAssignedUsers = [...new Set([...userList, ...(task.tempTurnReplacement?.[prevDateStr] || {})])];
        const prevTurnIndex = (task.currentTurnIndex - 1 + prevAssignedUsers.length) % prevAssignedUsers.length;
        const prevTurnUser = prevAssignedUsers[prevTurnIndex];

        if (!prevCompletions.some(c => c.user === prevTurnUser) && !prevPending.some(p => p.user === prevTurnUser)) {
          // Previous turn was missed; don't advance
          console.log("🔍 /api/complete-task: Previous turn missed, not advancing", { prevTurnUser, prevDateStr });
        } else {
          task.currentTurnIndex = (task.currentTurnIndex + 1) % assignedUsers.length;
          console.log("🔍 /api/complete-task: Advanced turn", { taskTitle, currentTurnIndex: task.currentTurnIndex, nextUser: assignedUsers[task.currentTurnIndex] });
        }
      } else if (isRotation) {
        const totalCompletions = task.completions[normalizedDate].length + task.pendingCompletions[normalizedDate].length;
        if (totalCompletions >= requiredTimes) {
          task.currentTurnIndex = (task.currentTurnIndex + 1) % assignedUsers.length;
          console.log("🔍 /api/complete-task: Advanced turn after required completions", { taskTitle, currentTurnIndex: task.currentTurnIndex, nextUser: assignedUsers[task.currentTurnIndex] });
        }
      }
    }

    tasks[taskIndex] = task;
    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks, history } }
    );
    console.log("✅ /api/complete-task: Database updated", { taskTitle, pendingCompletions: task.pendingCompletions[normalizedDate] });

    res.status(200).json({
      success: true,
      message: isAdmin ? "Task completed successfully" : "Task submitted for review",
      currentTurnIndex: task.currentTurnIndex,
      nextUser: assignedUsers[task.currentTurnIndex]
    });
  } catch (err) {
    console.error("🔥 /api/complete-task: Server error", err);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});







// ✅ Clean up invalid tasks for an admin
app.post("/api/cleanup-invalid-tasks", async (req, res) => {
  const { adminEmail } = req.body;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    let tasks = admin.tasks || [];

    // Filter tasks: Keep only tasks that have a title and date
    const validTasks = tasks.filter(task => task.title && task.date);

    // If nothing to change
    if (validTasks.length === tasks.length) {
      return res.json({ success: true, message: "No invalid tasks found" });
    }

    // Update the database with only valid tasks
    await admins.updateOne(
      { email: adminEmail },
      { $set: { tasks: validTasks } }
    );

    console.log(`✅ Cleaned up invalid tasks for ${adminEmail}. Deleted ${tasks.length - validTasks.length} tasks.`);

    res.json({ success: true, deleted: tasks.length - validTasks.length });
  } catch (err) {
    console.error("🔥 Error cleaning up invalid tasks:", err);
    res.status(500).json({ error: "Failed to clean up invalid tasks" });
  }
});





// end point users.html and tasks.html task details //


// users.html avatars //

// ✅ Save avatars for an admin's users
app.post('/api/avatars', async (req, res) => {
  const { adminEmail, avatars } = req.body;

  if (!adminEmail || !avatars) {
    return res.status(400).json({ error: "Missing adminEmail or avatars" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    await admins.updateOne(
      { email: adminEmail },
      { $set: { avatars } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving avatars:", err);
    res.status(500).json({ error: "Failed to save avatars" });
  }
});



// ✅ Get avatars for an admin's users
app.get('/api/avatars', async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    res.json({ avatars: admin?.avatars || {} });
  } catch (err) {
    console.error("Error fetching avatars:", err);
    res.status(500).json({ error: "Failed to fetch avatars" });
  }
});

// End point users.html avatars //


// chooseAvatar.html //



// ✅ SET AVATAR FOR A USER
app.post('/set-avatar', async (req, res) => {
  const { adminEmail, userName, avatar } = req.body;

  if (!adminEmail || !userName || !avatar) {
    return res.status(400).json({ success: false, message: "Missing required data" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');

    // Log for debugging
    console.log(`Saving avatar for ${userName} under ${adminEmail}: ${avatar}`);

    const admin = await adminUsers.findOne({ email: adminEmail }) || {};
    const avatars = admin.avatars || {};

    avatars[userName] = avatar;

    await adminUsers.updateOne(
      { email: adminEmail },
      { $set: { avatars } },
      { upsert: true }
    );

    console.log(`Successfully saved avatar for ${userName}`);

    res.json({ success: true, message: "Avatar saved successfully" });
  } catch (err) {
    console.error("🔥 Error in /set-avatar:", err);
    res.status(500).json({ success: false, message: "Failed to set avatar" });
  }
});




//- ✅ GET avatar for a specific user under an admin 
//- finish task to play avatar preview
app.get('/get-avatar', async (req, res) => {
  const { adminEmail, user } = req.query;

  if (!adminEmail || !user) {
    return res.status(400).json({ success: false, message: "Missing adminEmail or user" });
  }

  try {
    const db = await connectDB();
    const adminUsers = db.collection('adminUsers');

    const admin = await adminUsers.findOne({ email: adminEmail });

    if (!admin || !admin.avatars || !admin.avatars[user]) {
      return res.status(404).json({ success: false, message: "Avatar not found" });
    }

    const avatar = admin.avatars[user];
    res.json({ success: true, avatar });
  } catch (err) {
    console.error("🔥 Error in /get-avatar:", err);
    res.status(500).json({ success: false, message: "Server error retrieving avatar" });
  }
});






//-end point finish task to play avatar preview

// Endpoint chooseAvatar.html //



// StartPoint helpCenter.html //////////////////////////////////////////////////////////////////////////////

// ✅ Save a new help offer (Offer Help or Need Help)
app.post("/api/help-offers", async (req, res) => {
  const { adminEmail, offer } = req.body;

  if (!adminEmail || !offer || !offer.type || !offer.description || !offer.expiresAt) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");

    const admin = await admins.findOne({ email: adminEmail });
    const offers = admin?.helpOffers || [];

    // Add the new offer
    offers.push(offer);

    await admins.updateOne(
      { email: adminEmail },
      { $set: { helpOffers: offers } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("🔥 Error saving help offer:", err);
    res.status(500).json({ error: "Failed to save help offer" });
  }
});



// ✅ Get all active help offers
app.get("/api/help-offers", async (req, res) => {
  const { adminEmail } = req.query;

  if (!adminEmail) {
    return res.status(400).json({ error: "Missing adminEmail" });
  }

  try {
    const db = await connectDB();
    const admins = db.collection("admins");
    const admin = await admins.findOne({ email: adminEmail });

    const now = new Date();
    const activeOffers = (admin?.helpOffers || []).filter(offer => {
      return new Date(offer.expiresAt) > now;
    });

    res.json({ offers: activeOffers });
  } catch (err) {
    console.error("🔥 Error fetching help offers:", err);
    res.status(500).json({ error: "Failed to fetch help offers" });
  }
});



app.put("/api/help-offers", async (req, res) => {
  const { adminEmail, offers, currentUser } = req.body;
  try {
      const db = await connectDB();
      const admins = db.collection("admins");
      const admin = await admins.findOne({ email: adminEmail });
      if (!admin) {
          return res.status(404).json({ error: "Admin not found" });
      }
      // Ensure only the offer's creator can delete
      const validOffers = offers.filter((offer, index) => {
          const originalOffer = admin.helpOffers[index];
          return !originalOffer || originalOffer.fromUser === currentUser;
      });
      await admins.updateOne({ email: adminEmail }, { $set: { helpOffers: validOffers } });
      res.json({ success: true });
  } catch (err) {
      console.error("Error updating offers:", err);
      res.status(500).json({ error: "Failed to update offers" });
  }
});




app.post("/api/accept-offer", async (req, res) => {
  const { adminEmail, offerIndex, taskTitle, offerUser, acceptUser, pointsOffered, offerType, helpMode } = req.body;
  try {
      const db = await connectDB();
      const admins = db.collection("admins");
      const admin = await admins.findOne({ email: adminEmail });
      if (!admin) {
          return res.status(404).json({ error: "Admin not found" });
      }

      const offers = admin.helpOffers || [];
      const offer = offers[offerIndex];
      if (!offer || offer.fromUser !== offerUser) {
          return res.status(400).json({ error: "Invalid offer" });
      }

      // Find the task in the offer
      const task = offer.tasks.find(t => t.title === taskTitle);
      if (!task || task.reward !== pointsOffered) {
          return res.status(400).json({ error: "Invalid task" });
      }

      // Update tasks
      const tasks = admin.tasks || [];
      const taskToUpdate = tasks.find(t => t.title === taskTitle);
      if (!taskToUpdate) {
          return res.status(400).json({ error: "Task not found" });
      }

      if (offerType === "offerHelp") {
          // For offerHelp: Assign task to acceptUser
          if (!taskToUpdate.users.includes(acceptUser)) {
              taskToUpdate.users.push(acceptUser);
          }
          // Update points (example logic)
          // Deduct pointsOffered from acceptUser, add to offerUser
      } else if (offerType === "needHelp") {
          // For needHelp: Reassign task from offerUser to acceptUser
          taskToUpdate.users = taskToUpdate.users.filter(u => u !== offerUser);
          if (!taskToUpdate.users.includes(acceptUser)) {
              taskToUpdate.users.push(acceptUser);
          }
          // Update points (example logic)
          // Deduct pointsOffered from offerUser, add to acceptUser
      }

      // Remove the offer
      offers.splice(offerIndex, 1);

      // Update admin document
      await admins.updateOne(
          { email: adminEmail },
          { $set: { tasks, helpOffers: offers } }
      );

      res.json({ success: true });
  } catch (err) {
      console.error("Error accepting offer:", err);
      res.status(500).json({ error: "Failed to accept offer" });
  }
});



//- help notifications for userTasks.html 


// POST /api/notifications - Create notifications for an offer
app.post("/api/notifications", async (req, res) => {
  const { adminEmail, offer } = req.body;
  console.log("📩 Received notification request:", { adminEmail, offerType: offer.type, fromUser: offer.fromUser });

  try {
      const db = await connectDB();
      const admins = db.collection("admins");
      const adminUsers = db.collection("adminUsers");

      // Fetch admin document
      const admin = await admins.findOne({ email: adminEmail });
      if (!admin) {
          console.error("🚫 Admin not found for email:", adminEmail);
          return res.status(404).json({ error: "Admin not found" });
      }
      console.log("🔍 Admin document fields:", Object.keys(admin));

      // Fetch all registered users from adminUsers
      const adminUserDoc = await adminUsers.findOne({ email: adminEmail });
      let users = Array.from(new Set(adminUserDoc?.users || []));
      console.log("🔍 Registered users from adminUsers.users:", users);

      // If no users found in adminUsers, log warning
      if (users.length === 0) {
          console.warn("⚠️ No registered users found in adminUsers for email:", adminEmail);
      }

      // For offerHelp, also fetch task-assigned users
      let taskUsers = [];
      if (offer.type === "offerHelp") {
          taskUsers = Array.from(new Set(
              (admin.tasks || []).flatMap(t => t.users || [])
          ));
          console.log("🔍 Task-assigned users from admin.tasks:", taskUsers);
          (admin.tasks || []).forEach(task => {
              console.log(`🔍 Task ${task.title} users:`, task.users || []);
          });
      }

      // Check admin document for user-related fields (for debugging)
      const possibleUserFields = ['users', 'registeredUsers', 'allUsers', 'members', 'userList'];
      for (const field of possibleUserFields) {
          if (admin[field]) {
              const fieldUsers = Array.from(new Set(admin[field]));
              console.log(`🔍 Found users in admin.${field}:`, fieldUsers);
              users = Array.from(new Set([...users, ...fieldUsers]));
          } else {
              console.log(`ℹ️ No admin.${field} field found`);
          }
      }

      // Log total users
      console.log("👥 Total users after retrieval:", users.length, users);
      if (!users.includes(offer.fromUser)) {
          console.warn("⚠️ fromUser not found in users list:", offer.fromUser);
      }

      const notifications = admin.notifications || [];
      const tasks = admin.tasks || [];
      console.log("📋 Tasks available:", tasks.map(t => t.title));

      const offerTasks = offer.tasks.map(t => t.title);
      const timestamp = new Date().toISOString();

      if (offer.type === "offerHelp") {
          console.log("📢 Processing offerHelp notifications for tasks:", offerTasks);
          const notifiedUsers = new Set();
          for (const taskTitle of offerTasks) {
              const task = tasks.find(t => t.title === taskTitle);
              if (task && task.users) {
                  console.log(`🔍 Task ${taskTitle} has users:`, task.users);
                  for (const user of task.users) {
                      if (user !== offer.fromUser && !notifiedUsers.has(user)) {
                          const userTaskCount = offerTasks.filter(title => {
                              const t = tasks.find(t => t.title === title);
                              return t && t.users.includes(user);
                          }).length;
                          if (userTaskCount > 0) {
                              notifications.push({
                                  user,
                                  offerType: offer.type,
                                  taskCount: userTaskCount,
                                  tasks: offerTasks,
                                  offerUser: offer.fromUser,
                                  timestamp,
                                  expiresAt: offer.expiresAt
                              });
                              notifiedUsers.add(user);
                              console.log(`✅ Added offerHelp notification for user: ${user}, taskCount: ${userTaskCount}`);
                          } else {
                              console.log(`ℹ️ User ${user} not notified for offerHelp: no matching tasks`);
                          }
                      }
                  }
              } else {
                  console.warn(`⚠️ Task ${taskTitle} not found or has no users`);
              }
          }
          console.log(`📬 Total offerHelp notifications sent: ${notifiedUsers.size}`);
      } else if (offer.type === "needHelp") {
          console.log("📢 Processing needHelp notifications for tasks:", offerTasks);
          let notificationCount = 0;
          for (const user of users) {
              if (user !== offer.fromUser) {
                  notifications.push({
                      user,
                      offerType: offer.type,
                      taskCount: offerTasks.length,
                      tasks: offerTasks,
                      offerUser: offer.fromUser,
                      timestamp,
                      expiresAt: offer.expiresAt
                  });
                  notificationCount++;
                  console.log(`✅ Added needHelp notification for user: ${user}, taskCount: ${offerTasks.length}`);
              } else {
                  console.log(`ℹ️ Skipped needHelp notification for fromUser: ${user}`);
              }
          }
          console.log(`📬 Total needHelp notifications sent: ${notificationCount}`);
      } else {
          console.warn("⚠️ Invalid offer type:", offer.type);
      }

      console.log("💾 Updating notifications in database, total notifications:", notifications.length);
      await admins.updateOne(
          { email: adminEmail },
          { $set: { notifications } }
      );
      console.log("✅ Notifications successfully saved");

      res.json({ success: true });
  } catch (err) {
      console.error("🔥 Error creating notifications:", err);
      res.status(500).json({ error: "Failed to create notifications" });
  }
});









// GET /api/notifications - Retrieve notifications for a user

app.get("/api/notifications", async (req, res) => {
  const { adminEmail, user } = req.query;
  try {
      const db = await connectDB();
      const admins = db.collection("admins");
      const admin = await admins.findOne({ email: adminEmail });
      if (!admin) {
          return res.status(404).json({ error: "Admin not found" });
      }

      const notifications = (admin.notifications || []).filter(n => n.user === user);
      const now = new Date();
      const validNotifications = notifications.filter(n => new Date(n.expiresAt) > now);

      res.json({ notifications: validNotifications });
  } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
  }
});



// DELETE /api/notifications - Clear notifications for a user
app.delete("/api/notifications", async (req, res) => {
  const { adminEmail, user } = req.body;
  try {
      const db = await connectDB();
      const admins = db.collection("admins");
      const admin = await admins.findOne({ email: adminEmail });
      if (!admin) {
          return res.status(404).json({ error: "Admin not found" });
      }

      const notifications = (admin.notifications || []).filter(n => n.user !== user);
      await admins.updateOne(
          { email: adminEmail },
          { $set: { notifications } }
      );

      res.json({ success: true });
  } catch (err) {
      console.error("Error clearing notifications:", err);
      res.status(500).json({ error: "Failed to clear notifications" });
  }
});

//- help notifications for userTasks.html

// Endpoint helpCenter.html //