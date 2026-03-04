const expressJwt = require('express-jwt').expressjwt;

// jwt authentication middleware, restricts access to users without a json-web-token.
function authJwt() {
    const secret = process.env.secret;
    return expressJwt({
        secret,
        algorithms: ['HS256'],
    }).unless({
        path: [
            // public routes that don't require authentication
            `/users/login`,
            `/users/register`,
        ],
    });
}





module.exports = authJwt; 