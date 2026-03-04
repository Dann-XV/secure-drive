const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// Authentication
router.post('/register', async (req, res) => {
    let user = new User({
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
    });
    
    user = await user.save();
    res.json({message: 'registration successful'})
})

router.post('/login', async (req, res) => {
    const user = await User.findOne({email: req.body.email});
    const secret = process.env.secret;
    if (!user) {
        return res.status(400).send('This user does not exist');
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

module.exports = router;