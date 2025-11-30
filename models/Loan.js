const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  month: Number,
  amount: Number,
  paid: { type: Boolean, default: false }
});

const requestSchema = new mongoose.Schema({
  borrowerName: String,
  status: { type: String, default: "requested" },
  payments: [paymentSchema]
});

const loanSchema = new mongoose.Schema(
  {
    amount: Number,
    interestRate: Number,
    duration: Number,
    lender: String,
    borrower: String,
    status: { type: String, default: "available" },
    requests: { type: [requestSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);
