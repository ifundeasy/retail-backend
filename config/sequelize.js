require('async-to-gen/register');
require('dotenv').load();

const {mysql} = require(`${__dirname}/../src/glob`).config;

module.exports = {
    [process.env.APP_ENV]: {
        username: mysql.user,
        password: mysql.password,
        database: mysql.database,
        host: mysql.host,
        port: mysql.port,
        freezeTableName: true,
        operatorsAliases: false,
        dialect: 'mysql',
        migrationStorage: 'sequelize',
        migrationStorageTableName: '_migration',
        seederStorage: 'sequelize',
        seederStorageTableName: '_seeder',
        pool: {
            min: 0,
            max: mysql.connectionLimit,
            idle: 15000,
            acquire: 20000,
            evict: 30000,
            handleDisconnects: true
        }
    }
};