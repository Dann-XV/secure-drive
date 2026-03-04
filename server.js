const express = require('express');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');


// Routes
const authJwt = require('./helpers/jwt');
const userRoutes = require('./routes/users'); 

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use('/users', userRoutes);
app.use(authJwt());


mongoose
    .connect(process.env.CONECTION_STRING)
    .then(() => {
        console.log('Database connection is ready...');
    })
    .catch((err) => {
        console.log(err);
    });




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});