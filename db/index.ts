import mongoose from "mongoose";

mongoose.set('strictQuery', false);

console.log(`Attempting to connect to database "${process.env.DB_NAME}"`);

const mongoUri = process.env.MONGODB_URI || `mongodb://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

mongoose.connect(mongoUri).then(res => {
    console.log(`Connected successfully to database "${process.env.DB_NAME}"`);
}).catch(err => {
    console.error("Failed to connect to database: ", err);
});