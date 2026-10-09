// for mongodb connection work
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');

const app = express();

//middlewares
app.use(cors());
app.use(express.json());

//API route mounting

app.use('/api/auth', authRoutes);

// base health check route

app.get('/', (req, res) => {
    res.json({
        status: 'online',
        system: 'FITCLUSTER Ingestion & Transaction Gateway',
        timestamp: new Date().toISOString(),
    });
});

//env params
const PORT = process.env.PORT || 6969;
const MONGO_URI = process.env.MONGO_URI;

if(!MONGO_URI){
    console.log("ERROR: MONGO_URI is not defined in backend/.env");
    process.exit(1);
}

// database connection pooling & server startup
mongoose.connect(MONGO_URI).then(() => {
    console.log('Connected to MongoDB Atlas database successfully');
    app.listen(PORT, () => {
        console.log(`Server running in on PORT ${PORT}`);
    });
})
.catch((err) => {
    console.error('MongoDB Atlas connection Failure:', err.message);
    process.exit(1);
});
