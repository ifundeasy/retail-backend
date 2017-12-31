module.exports = async function () {
    let {env, reqTimeOut, name, description, version, ip, port} = require(`./glob`);
    let http = await require('./http.js')();
    try {
        const server = require('http').createServer(http);
        server.timeout = reqTimeOut;
        server.on('error', function onError(error) {
            if (error.syscall !== 'listen') throw error;
            let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
            switch (error.code) {
                case 'EACCES':
                    console.error(process.pid.toString(), `> ${bind} requires elevated privileges`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    console.error(process.pid.toString(), `> ${bind} is already in use`);
                    process.exit(2);
                    break;
                default:
                    throw error;
            }
        });
        server.on('listening', function onListening() {
            let host = server.address();
            let port = typeof host === 'string' ? host : host.port;
            host = host == '::' ? 'localhost' : host.address;
            host = ip ? ip : host;
            console.log(process.pid.toString(), `> Env: ${env}, ${name} v${version} listen on ${host}:${port}`);
        });
        server.listen(port);
        return server;
    } catch (e) {
        console.log(process.pid.toString(), `> ${e.message}`);
        process.exit(0);
    }
};