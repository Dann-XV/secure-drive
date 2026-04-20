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
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Poppins', Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background-color: #191970;
                color: #ffffff;
                padding: 30px;
                text-align: center;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
            }
            .content {
                padding: 30px;
                color: #333333;
            }
            .content p {
                font-size: 16px;
                line-height: 1.6;
                margin: 10px 0;
            }
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            .confirm-button {
                display: inline-block;
                background-color: #191970;
                color: #ffffff;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 4px;
                font-weight: 600;
                font-size: 16px;
            }
            .confirm-button:hover {
                background-color: #0f0f4a;
            }
            .footer {
                background-color: #f4f4f4;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #666666;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Secure Drive!</h1>
            </div>
            <div class="content">
                <p>Hi there,</p>
                <p>Thank you for signing up. To complete your registration and secure your account, please confirm your email address by clicking the button below:</p>
                <div class="button-container">
                    <a href="${confirmationUrl}" class="confirm-button">Confirm Email</a>
                </div>
                <p>If you didn't create this account, you can safely ignore this email.</p>
                <p>Best regards,<br>The Secure Drive Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `;
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Confirm your email - Secure Drive',
        html: emailHtml,
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