const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');




// Transporter for sending emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Authentication
router.post('/register', async (req, res) => {
    let user = new User({
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        isConfirmed: false,
        confirmationToken: uuidv4(),
    });
    
    user = await user.save();

    // Send confirmation email
    const confirmationUrl = `http://localhost:3000/users/confirm/${user.confirmationToken}`;
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Confirm your email',
        html: `<p>Click <a href="${confirmationUrl}">here</a> to confirm your account.</p>`,
    });
    res.json({message: 'registration successful'})
})

router.post('/login', async (req, res) => {
    const user = await User.findOne({email: req.body.email});
    const secret = process.env.secret;
    if (!user) {
        return res.status(400).send('This user does not exist');
    };
    if (!user.isConfirmed) {
        return res.status(400).send('Please confirm your email first, a link has been sent to your mail box');
    };
    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
            },
            secret,
            {expiresIn: '1d'}
        );
        res.status(200).send({user: user.email, token: token, message: 'Login successful'});
    }
    else{
        res.status(400).send('Wrong password');
    }
})

router.get('/confirm/:token', async (req, res) => {
    const user = await User.findOne({ confirmationToken: req.params.token });
    if (!user) {
        return res.status(400).send('Invalid token');
    }
    user.isConfirmed = true;
    user.confirmationToken = undefined; // Clear token after confirmation
    await user.save();
    res.send('Email confirmed successfully. You can now log in.');
});


module.exports = router;