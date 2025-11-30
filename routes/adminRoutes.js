const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Loan = require("../models/Loan");

// ==========================
// GET ALL USERS
// ==========================
router.get("/users", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// ==========================
// ADD USER
// ==========================
router.post("/users", async (req, res) => {
  try {
    const { name, role, password } = req.body;

    const exists = await User.findOne({ name });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = new User({ name, role, password });
    await user.save();

    res.json({ message: "User added", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// EDIT USER
// ==========================
router.put("/users/:id", async (req, res) => {
  try {
    const { name, role, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.name = name;
    user.role = role;
    if (password) user.password = password; // only update if provided

    await user.save();
    res.json({ message: "User updated", user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================
// DELETE USER
// ==========================
router.delete("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.role === "Admin")
    return res.status(400).json({ message: "Cannot delete Admin user" });

  await user.deleteOne();
  res.json({ message: "User removed" });
});

// ==========================
// RESET PASSWORD
// ==========================
router.put("/users/reset/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.password = "12345";
  await user.save();

  res.json({ message: "Password reset to 12345" });
});

// ==========================
// CLEAR ALL LOANS
// ==========================
router.delete("/clear-loans", async (req, res) => {
  await Loan.deleteMany({});
  res.json({ message: "All loan data cleared" });
});

module.exports = router;
