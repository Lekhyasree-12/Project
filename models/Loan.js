const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    amount: Number,
    interestRate: Number,
    duration: Number,
    lender: String,
    borrower: String,
    status: { type: String, default: "available" },
    requests: [
      {
        borrowerName: String,
        status: { type: String, default: "requested" },
        payments: [],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);
