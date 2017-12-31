const domain = 'localhost';
const fs = require('fs');
const ENV = process.env;
const env = ENV.APP_ENV || 'development';
const home = `${process.env.PWD || __dirname + '/..'}`;
const port = ENV.APP_PORT || 8000;
const mysql = {
    connectionLimit: parseInt(ENV.DB_CONN_LIMIT),
    host: ENV.DB_HOST,
    user: ENV.DB_USER,
    password: ENV.DB_PASS,
    database: ENV.DB_NAME,
    port: ENV.DB_PORT,
    multipleStatements: (ENV.DB_MULTI_STATEMENT == 'true')
};
const getIp = function () {
    try {
        return require(`${home}/utils/getip`)();
    } catch (e) {
        return domain;
    }
};
module.exports = {
    env: env,
    token: {
        header: 'X-Token',
        expires: parseInt(ENV.APP_TOKEN_EXPIRES) || 15 * 60 * 1000,
        extend: (ENV.APP_TOKEN_EXTEND == 'true') || true,
        regen: (ENV.APP_TOKEN_REGEN == 'true') || false,
        resave: (ENV.APP_TOKEN_RESAVE == 'true') || true //if 'false' regen value will force to true
    },
    reqTimeOut: parseInt(eval(ENV.npm_package_reqTimeOut)) || 1 * 60 * 1000,
    name: ENV.APP_NAME || JSON.parse(fs.readFileSync(`${home}/package.json`)).name,
    description: ENV.npm_package_description || JSON.parse(fs.readFileSync(`${home}/package.json`)).description,
    version: ENV.npm_package_version || JSON.parse(fs.readFileSync(`${home}/package.json`)).version,
    author: ENV.npm_package_author || JSON.parse(fs.readFileSync(`${home}/package.json`)).author,
    ip: getIp(),
    port: port,
    home: home,
    config: {mysql},
    protocol: ENV.APP_IS_HTTPS === 'true' ? 'https://' : 'http://',
    storageKey: 'retail-backend',
    upload: {
        uploadDir: `${home}/media`,
        maxFilesSize: 5000000,
        fieldName: 'media',
    },
    maxPaging: 10000
};