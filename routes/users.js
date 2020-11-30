const express = require('express');
const router = express.Router();
const stream = require('stream');
const readline = require('readline');
const moment = require('moment');

const LoanDeposit = require('../models/LoanDeposit');

const isJsonParsable = (str) => {
    try {
        JSON.parse(str)
    } catch (e) {
        return false
    }
    return true;
};

const convertCurrencyToNumber = (str) => {
    return parseFloat(str.replace(/[$,]+/g, ""));
};


const parseFile = (fileData) => {
    return new Promise((resolve, reject) => {
        const buffer = [];
        let bufferStream = new stream.PassThrough();
        bufferStream.end(fileData);

        const rl = readline.createInterface({
            input: bufferStream
        });

        rl.on('line', (line) => {
            const isJSON = isJsonParsable(line.trim());
            if (isJSON) {
                buffer.push(JSON.parse(line));
            }
        })
            .on('close', () => {
                resolve(buffer);
            })
            .on('error', (err) => {
                console.log("Error:", err);
                reject(err);
            })
    });
};

const checkSameDay = (prevDate, currDate) => {
    return moment.utc(currDate).format('L') ===
        moment.utc(prevDate).format('L')
};

const checkSameWeek = (prevDate, currDate) => {
    const curr = moment.utc(currDate);
    const prev = moment.utc(prevDate);

    return curr.isSame(prev, 'week');
};

const resetLoadLimit = (existing, current) => {
    const {transaction_time} = existing;
    const {time} = current;
    return checkSameWeek(transaction_time, time)

};

const resetDepositCount = (existing, current) => {
    const {transaction_time} = existing;
    const {time} = current;
    return checkSameDay(transaction_time, time)
};

const checkLoadValidation = (existingVal, newVal) => {
    const {transaction_time, total_deposits, load_count} = existingVal;
    const {time, load_amount} = newVal;
    const newAmount = convertCurrencyToNumber(load_amount);
    const total = load_count + newAmount;

    if(newAmount > 5000){
        return false;
    }

    if (checkSameDay(transaction_time, time) && total_deposits >= 3) {
        return false;
    }

    if (checkSameDay(transaction_time, time) && total >= 5000) {
        return false;
    }

    return !(checkSameWeek(transaction_time, time) && total >= 20000);

};

/* GET users listing. */
router.post('/load', async function (req, res, next) {
    try {
        if (!req.files) {
            res.send({
                status: false,
                message: "No file uploaded"
            });
        } else {
            const {file: {data}} = req.files;
            let finalData = []; //store data to send back in response

            const fileData = await parseFile(data);

            for (const item of fileData) {
                const {id, customer_id, load_amount, time} = item;

                if(convertCurrencyToNumber(load_amount) > 5000){
                    finalData.push({id, customer_id, accepted: false});
                    continue;
                }

                let newCustomerLoan = new LoanDeposit({
                    transactionId: id,
                    customer_id: customer_id,
                    load_count: convertCurrencyToNumber(load_amount),
                    total_deposits: 0,
                    transaction_time: time
                });
                const findCustomerObj = await LoanDeposit.findOne({customer_id: customer_id}).exec();

                if (!findCustomerObj) {
                    await newCustomerLoan.save();
                    finalData.push({id, customer_id, accepted: true});
                } else {
                    const resetDeposit = resetDepositCount(findCustomerObj, item);
                    const resetLoad = resetLoadLimit(findCustomerObj, item);

                    // Reset Total Deposit Count
                    if (!resetDeposit) {
                        await LoanDeposit.updateOne({customer_id: customer_id}, {total_deposits: 0});
                    }

                    // Reset the Load
                    if (!resetLoad) {
                        await LoanDeposit.updateOne({customer_id: customer_id}, {load_count: 0});
                    }

                    const checkValidDeposit = checkLoadValidation(findCustomerObj, item);

                    if (checkValidDeposit) {
                        await LoanDeposit.updateOne({customer_id: customer_id}, {
                            transactionId: id,
                            $inc: {total_deposits: 1, load_count: convertCurrencyToNumber(load_amount)},
                            transaction_time: time
                        });
                        finalData.push({id, customer_id, accepted: true});
                    } else {
                        finalData.push({id, customer_id, accepted: false});
                    }
                }
            }

            res.set({'Content-Disposition': 'attachment; filename=\"output.txt\"','Content-type': 'text/plain'});
            res.status(200).send(finalData);
        }

    } catch (err) {
        console.log(err);
        res.status(500).send(err)
    }
});

module.exports = router;
