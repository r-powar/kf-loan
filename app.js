const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const connectDB = require('./config/db');
const usersRouter = require('./routes/users');
const moment = require('moment');


const app = express();

//Connecting to DB
connectDB();

//set week start to Monday
moment.updateLocale('en', {
    week : {
        dow : 1
    }
});

// enable file uploads
app.use(fileUpload());

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', usersRouter);


module.exports = app;
