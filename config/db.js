const mongoose = require('mongoose');
const {db} = require('./keys');

const connectDB = async () => {
    try{
        await mongoose.connect(db,{
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        });
        console.log('Connected to the DB...')
    }catch(err){
        console.error(err.message);

        // Exiting with failure
        process.exit(1);
    }
};

module.exports = connectDB;