const {STATUS_CODES} = require('http');
const CODE = {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOTFOUND: 404,
    UNAVAILABLE: 503,
    INTERNALSERVERERROR : 500
};
for (let c in CODE) CODE[c] = {status: CODE[c], message: STATUS_CODES[CODE[c]]};
module.exports = CODE;