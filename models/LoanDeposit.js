const mongoose =  require('mongoose');
const Schema = mongoose.Schema;

const loanDepositSchema = new Schema({
    transactionId: {
        type: String,
        required: true,
    },
    customer_id: {
        type: String,
        required: true
    },
    load_count: {
        type: Number,
        required: true
    },
    total_deposits: {
        type: Number,
        required: true
    },
    transaction_time:{
        type: String,
        required: true
    }
});

const LoanDeposit = mongoose.model('LoanDeposit', loanDepositSchema);

module.exports = LoanDeposit;
