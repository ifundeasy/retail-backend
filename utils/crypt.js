const crypto = require('crypto');
const algorithm = 'aes-256-ctr';
const password = 'wakwaaw.. password gw neh!';
module.exports = {
    en: function (text) {
        let cipher = crypto.createCipher(algorithm, password);
        let en = cipher.update(text, 'utf8', 'hex');
        en += cipher.final('hex');
        return en;
    },
    de: function (hash) {
        let decipher = crypto.createDecipher(algorithm, password);
        let de = decipher.update(hash, 'hex', 'utf8');
        de += decipher.final('utf8');
        return de;
    }
};