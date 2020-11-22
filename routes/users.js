const express = require('express');
const router = express.Router();
const stream = require('stream');
const readline = require('readline');


const isJsonParsable = (str) => {
    try {
        JSON.parse(str)
    } catch (e) {
        return false
    }
    return true;
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
            const fileData = await parseFile(data);
            res.send({
                status: true,
                message: "File received"
            })
        }

    } catch (err) {
        res.status(500).send(err)
    }
});

module.exports = router;
