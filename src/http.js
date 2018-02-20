const fs = require('fs'),
    path = require('path'),
    Promise = require('bluebird'),
    express = require('express'),
    crypto = require('crypto'),
    bodyParser = require('body-parser'),
    cors = require('cors'),
    nodemailer = require('nodemailer'),
    uuid = require('uuid'),
    mysql = require('promise-mysql');
//
const {STATUS_CODES} = require('http'),
    Glob = require(`./glob`),
    request = require('request'),
    randomString = require(`${Glob.home}/utils/random.string`),
    httpCode = require(`${Glob.home}/utils/http.code`),
    Code4 = require(`${Glob.home}/utils/code4`),
    Crypt = require(`${Glob.home}/utils/crypt`),
    Upload = require(`${Glob.home}/utils/upload`)(Glob.upload);
//
const {env, name, description, author, reqTimeOut, version, session, ip, port, home, config} = Glob;
const sha512 = function (string, salt) {
    let hash = crypto.createHmac('sha512', salt);
    hash.update(string);

    return hash.digest('hex');
};
const http = async function (pool, compile) {
    let locals, app = express();
    let src = `${Glob.home}/src`;
    let Authentication = require(`${src}/authentication`);
    let Authorization = require(`${Glob.home}/src/authorization`)(compile);
    //
    locals = app.locals.client = {};
    //
    locals.name = name;
    locals.version = version;
    locals.description = description;
    locals.author = author;
    //
    /** **************************************************************************
     ** express.js setup
     ** **************************************************************************/
    app.set('env', Glob.env);
    app.set('title', Glob.name);
    app.set('port', port);
    app.set('x-powered-by', false);
    /** **************************************************************************
     ** commonly middleware setup
     ** **************************************************************************/
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));
    app.use(express.static(path.join(Glob.home, 'public')));
    app.use(cors(), function (req, res, next) {
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
    if (app.get('env') === 'production') {
        app.set('trust proxy', 1);
    }
    app.use(async function (req, res, next) {
        let url = req._parsedUrl.pathname;
        let {method, headers, params, query, body} = req;
        let token = headers['x-token'];
        let request = {method, url, token, params, query, body};

        ['params', 'query', 'body'].forEach(function (key) {
            if (Object.keys(request[key]).length < 1) delete request[key];
        });
        //
        console.log(process.pid.toString(), '>', JSON.stringify(request));
        next();
    });
    app.use(Authentication(Glob, locals, compile), function (req, res, next) {
        if (req.logged) {
            //let session = {'username': req.logged.user.username};
            //Object.assign(session, req.logged.session);
            //req.logger.save('session', session);
        }
        next();
    });
    app.all('/', function (req, res, next) {
        let {storageKey, clientVar, protocol} = Glob;
        let logged = req.logged ? true : false;
        res.send({
            text: 'Welcome',
            name, description, version, author,
            ip, port, env, reqTimeOut, logged,
            protocol, storageKey, clientVar
        });
    });
    app.post('/login', async function (req, res, next) {
        if (req.logged) {
            let {status, message} = httpCode.OK;
            let {user, session} = req.logged;
            let logged = {
                id: session.id,
                name: user.name,
                userId: user.id,
                username: user.username,
                token: session.value,
                expires: session.expires
            };
            res.send({status, message, data: logged});
        } else {
            let {username, password} = req.body;
            try {
                //checking username
                let data = await compile(`SELECT * FROM person WHERE username = ? AND op_id IN (1, 2)`, username);
                if (data instanceof Error || data.length !== 1) throw (new Error('Invalid username'));

                //checking password
                let user = data[0];
                let hash = sha512(password, user.salt);
                if (hash !== user.password) throw (new Error('Invalid password'));

                //generate token
                let token = uuid.v4(),
                    expires = new Date(new Date().getTime() + Glob.token.expires),
                    addSession = await compile(
                        `INSERT INTO personSession set value = ?, expires = ?, person_id = ?, status_id = ?`,
                        [token, expires, user.id, user.status_id]
                    );

                if (addSession instanceof Error) throw (new Error('Failed generate new token'));

                //update login count
                let updateUser = await compile(
                    `UPDATE person SET loginCount = ? WHERE id = ? AND op_id IN (1, 2)`,
                    [user.loginCount + 1, user.id]
                );
                if (updateUser instanceof Error) throw (new Error('Failed set login counter'));

                let {status, message} = httpCode.OK,
                    logged = {
                        id: addSession.insertId,
                        name: user.name,
                        userId: user.id,
                        username: user.username,
                        token, expires
                    },
                    bodySend = {status, message, data: logged};

                req.logged = logged;
                res.send(bodySend);
            } catch (e) {
                if (e.message === 'Invalid username' || e.message === 'Invalid password') {
                    let {status, message} = httpCode.OK;
                    res.send({
                        status, message,
                        trace: e.message
                    });
                } else next(e)
            }
        }
    });
    app.all('/logout', async function (req, res, next) {
        res.send({
            text: 'Welcome',
            name, description, version, author,
            ip, port, env, reqTimeOut, logged: false
        });
    });
    app.get('/me', Authorization, async function (req, res, next) {
        let {status, message} = httpCode.OK;
        let {user, actor, modules, routes} = req.logged;
        delete user.password;
        delete user.salt;
        res.send({status, message, data: {user, actor, modules, routes}})
    });
    app.post('/changePassword', async function (req, res, next) {
        let {currentPassword, newPassword1, newPassword2} = req.body;
        let {status, message} = httpCode.OK;
        if (req.logged) {
            let {user} = req.logged;
            let {username, salt} = user;
            let is = false, error = '';

            if (!currentPassword || !newPassword1 || !newPassword2) {
                message = 'Please completing the form..';
            } else {
                let hashed = sha512(currentPassword || '', salt);
                let avoids = ['password', '1234', '123456', '098765'];

                if (user.password !== hashed) {
                    error = 'Old password is wrong!'
                } else if (newPassword1 !== newPassword2) {
                    error = 'New password doesn\'t match!'
                } else if (avoids.indexOf(newPassword1) > -1) {
                    error = 'New password doesn\'t allowed!';
                } else if (newPassword1.length < 6) {
                    error = 'New password too short!';
                } else if (newPassword1 === username) {
                    error = 'New password must different with username!';
                } else if (newPassword1 === currentPassword) {
                    error = 'New password must different with old password!';
                } else {
                    is = true;
                }
            }

            if (!is) return next(new Error(error));
            else {
                let newPassword = sha512(newPassword1, salt);
                try {
                    let query = compile(
                        'UPDATE person SET password = ? WHERE id = ? AND op_id IN (1, 2)',
                        [newPassword, user.id]
                    );
                    return res.send({status, message, data: query})
                } catch (e) {
                    next(e);
                }
            }
        } else {
            next(new Error('Wrong token or expired, login required!'));
        }
    });
    app.use('/api', Authorization, require(`${src}/http.api`)({Glob, locals, compile}));
    app.use('/soap', Authorization, require(`${src}/http.soap`)({Glob, locals, compile}));
    /** **************************************************************************
     ** error handling : http request
     ** **************************************************************************/
    app.use(function (req, res, next) {
        let code = httpCode.NOTFOUND;
        let err = new Error();
        err.status = code.status;
        err.message = code.message;
        next(err);
    });
    app.use(function (err, req, res, next) {
        // avoid .map file error request
        let verb1 = req.url.length - 7 == req.url.lastIndexOf('.js.map');
        let verb2 = req.url.length - 8 == req.url.lastIndexOf('.css.map');
        let verb3 = '/favicon.ico';
        let code = httpCode.INTERNALSERVERERROR;
        let status = err.status || code.status;
        let message = err.message || code.message;
        locals.ERR = {status, message, error: err.errors};
        if (STATUS_CODES[status] !== err.message) {
            locals.ERR.message = code.message;
            locals.ERR.trace = err.message;
        }
        //
        if (!(verb1 || verb2 || verb3)) console.log(process.pid.toString(), '> SERVER ERROR HANDLING!', JSON.stringify(locals.ERR, 0, 2));
        if (app.get('env') === 'development' && err.stack) {
            // comment next line for skip logging error stack
            locals.ERR.stack = err.stack;
            if ((!(verb1 || verb2)) && locals.ERR.hasOwnProperty('stack')) {
                console.log(process.pid.toString(), '> SERVER ERROR STACK!');
                console.log(locals.ERR.stack);
            }
        }
        res.status(locals.ERR.status);
        return (req.xhr || req.headers.accept.indexOf('json') > -1) ? res.json(locals.ERR) : res.send(locals.ERR);
    });
    //
    return app;
};

module.exports = async function () {
    let pool = await mysql.createPool(config.mysql);
    let compile = async function (query, data) {
        query = query.replace(/\n/g, '').replace(/\t/g, ' ').replace(/\s\s+/g, ' ').trim();
        try {
            let conn = await pool.getConnection();
            if (conn instanceof Error) throw new Error(conn);

            let result = await conn.query(query, data);
            if (result instanceof Error) throw result;

            pool.releaseConnection(conn);

            return result;
        } catch (e) {
            return e
        }
    };
    let tables = await compile(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA='${Glob.config.mysql.database}'
        AND TABLE_COMMENT != 'hidden'
        AND TABLE_NAME NOT IN('_migration', '_seeder')
        ORDER BY TABLE_COMMENT, TABLE_NAME
    `);
    if (tables instanceof Error) {
        console.log(process.pid.toString(), `> ${tables.message}`);
        process.exit(1);
        return;
    }
    //
    Glob.tables = tables.map(function (o) {
        return o.TABLE_NAME;
    });
    return http(pool, compile);
};