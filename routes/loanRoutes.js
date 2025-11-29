const express = require("express");
const Loan = require("../models/Loan");
const router = express.Router();

// CREATE LOAN OFFER
router.post("/create", async (req, res) => {
  try {
    const loan = await Loan.create(req.body);
    res.status(201).json(loan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL LOANS
router.get("/", async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// APPROVE REQUEST
router.put("/approve/:loanId", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    loan.requests = loan.requests.map((reqObj) =>
      reqObj.borrowerName === req.body.borrowerName
        ? { ...reqObj, status: "approved" }
        : reqObj
    );

    await loan.save();
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REJECT REQUEST
router.put("/reject/:loanId", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    loan.requests = loan.requests.map((reqObj) =>
      reqObj.borrowerName === req.body.borrowerName
        ? { ...reqObj, status: "rejected" }
        : reqObj
    );

    await loan.save();
    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// BORROWER REQUEST LOAN
router.put("/request/:loanId", async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const newReq = {
      borrowerName: req.body.borrowerName,
      status: "requested",
      payments: []
    };

    loan.requests.push(newReq);
    await loan.save();

    res.json(loan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
