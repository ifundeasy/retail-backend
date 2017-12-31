module.exports = function (index) {
    let ip = [];
    let idx = index || 0;
    let ifaces = require('os').networkInterfaces();
    for (let k in ifaces) {
        if (ifaces.hasOwnProperty(k)) {
            let addrs = ifaces[k];
            addrs.forEach(function (addr) {
                if (addr.family == 'IPv4' && addr.internal === false) {
                    ip.indexOf(addr.address) === -1 ? ip.push(addr.address) : null;
                }
            });
        }
    }
    return ip[idx];
};