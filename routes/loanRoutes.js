const express = require("express");
const router = express.Router();
const Loan = require("../models/Loan");

// =====================================================
// CREATE LOAN  (POST /api/loans)
// =====================================================
router.post("/", async (req, res) => {
  try {
    const { amount, interestRate, duration, lender } = req.body;

    const loan = new Loan({
      amount,
      interestRate,
      duration,
      lender,
      status: "available",
      requests: []
    });

    await loan.save();
    res.json(loan);

  } catch (err) {
    res.status(500).json({ message: "Error creating loan", error: err.message });
  }
});

// =====================================================
// GET ALL LOANS (GET /api/loans)
// =====================================================
router.get("/", async (req, res) => {
  try {
    const loans = await Loan.find();

    // ensure status always exists
    const fixed = loans.map(l => ({
      ...l._doc,
      status: l.status || "available",
      requests: l.requests || []
    }));

    res.json(fixed);
  } catch (err) {
    res.status(500).json({ message: "Error fetching loans" });
  }
});

// =====================================================
// SEND LOAN REQUEST (PUT /api/loans/request/:loanId)
// =====================================================
router.put("/request/:loanId", async (req, res) => {
  try {
    const { borrowerName } = req.body;

    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const already = loan.requests.some(r => r.borrowerName === borrowerName);
    if (already)
      return res.status(400).json({ message: "Already requested" });

    const monthly =
      (loan.amount * (1 + loan.interestRate / 100)) / loan.duration;

    const payments = Array.from({ length: loan.duration }, (_, i) => ({
      month: i + 1,
      amount: parseFloat(monthly.toFixed(2)),
      paid: false
    }));

    loan.requests.push({
      borrowerName,
      status: "requested",
      payments
    });

    await loan.save();
    res.json(loan);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// APPROVE REQUEST (PUT /api/loans/approve/:loanId)
// =====================================================
router.put("/approve/:loanId", async (req, res) => {
  try {
    const { borrowerName } = req.body;

    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const request = loan.requests.find(r => r.borrowerName === borrowerName);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    request.status = "approved";

    const monthly =
      (loan.amount * (1 + loan.interestRate / 100)) / loan.duration;

    request.payments = Array.from({ length: loan.duration }, (_, i) => ({
      month: i + 1,
      amount: parseFloat(monthly.toFixed(2)),
      paid: false
    }));

    loan.status = "approved"; // For analyst dashboard

    await loan.save();
    res.json({ message: "Request approved", loan });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// REJECT REQUEST
// =====================================================
router.put("/reject/:loanId", async (req, res) => {
  try {
    const { borrowerName } = req.body;

    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const request = loan.requests.find(r => r.borrowerName === borrowerName);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    request.status = "rejected";
    await loan.save();

    res.json({ message: "Request rejected", loan });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// PAY EMI
// =====================================================
router.put("/pay/:loanId", async (req, res) => {
  try {
    const { borrowerName, monthIndex } = req.body;

    const loan = await Loan.findById(req.params.loanId);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const request = loan.requests.find(r => r.borrowerName === borrowerName);
    if (!request)
      return res.status(404).json({ message: "Borrower request not found" });

    const payment = request.payments[monthIndex];
    if (!payment)
      return res.status(404).json({ message: "Payment not found" });

    payment.paid = true;

    const allPaid = request.payments.every(p => p.paid);
    if (allPaid) request.status = "completed";

    await loan.save();
    res.json({ message: "Payment Successful", loan });

  } catch (err) {
    res.status(500).json({ message: "Payment Failed", error: err.message });
  }
});

// =====================================================
// ANALYST DASHBOARD  (GET /api/loans/analysis)
// =====================================================
router.get("/analysis", async (req, res) => {
  try {
    const loans = await Loan.find();

    const flattened = [];

    loans.forEach(loan => {
      if (loan.requests.length > 0) {
        loan.requests.forEach(req => {
          flattened.push({
            id: loan._id.toString(),
            lender: loan.lender,
            borrower: req.borrowerName,
            amount: loan.amount,
            interestRate: loan.interestRate,
            duration: loan.duration,
            status: req.status
          });
        });
      } else {
        flattened.push({
          id: loan._id.toString(),
          lender: loan.lender,
          borrower: "-",
          amount: loan.amount,
          interestRate: loan.interestRate,
          duration: loan.duration,
          status: "available"
        });
      }
    });

    const totalLoans = loans.length;
    const totalAmount = loans.reduce((s, x) => s + x.amount, 0);
    const avgInterestRate = totalLoans
      ? (loans.reduce((s, x) => s + x.interestRate, 0) / totalLoans).toFixed(2)
      : 0;

    const availableLoans = flattened.filter(f => f.status === "available").length;
    const activeLoans = flattened.filter(f =>
      ["requested", "approved"].includes(f.status)
    ).length;

    const statusCounts = flattened.reduce((acc, x) => {
      acc[x.status] = (acc[x.status] || 0) + 1;
      return acc;
    }, {});

    const lenderTotals = {};
    loans.forEach(l => {
      lenderTotals[l.lender] = (lenderTotals[l.lender] || 0) + l.amount;
    });

    const lenderBarData = Object.entries(lenderTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    res.json({
      totalLoans,
      totalAmount,
      avgInterestRate,
      availableLoans,
      activeLoans,
      statusCounts,
      lenderBarData,
      flattenedAgreements: flattened
    });

  } catch (err) {
    res.status(500).json({ message: "Analysis Failed", error: err.message });
  }
});

module.exports = router;
