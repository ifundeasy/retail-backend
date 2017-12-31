'use strict';
const Promise = require('bluebird');
const TablesAndComment = [
    ['actor', 'role'],
    ['actorRoute', 'role'],
    ['api', 'role'],
    ['apiRoute', 'role'],
    ['brand', 'master'],
    ['code', 'master'],
    ['contact', 'account'],
    ['discount', 'master'],
    ['district', 'location'],
    ['http', 'role'],
    ['media', 'master'],
    ['national', 'location'],
    ['paymethod', 'master'],
    ['person', 'account'],
    ['personActor', 'account'],
    ['personAddress', 'account'],
    ['personContact', 'account'],
    ['personSession', 'account'],
    ['product', 'product'],
    ['productCode', 'product'],
    ['productDiscount', 'product'],
    ['productMedia', 'product'],
    ['productPrice', 'product'],
    ['productTag', 'product'],
    ['productTax', 'product'],
    ['purchase', 'purchase'],
    ['purchaseItem', 'purchase'],
    ['purchasePayment', 'purchase'],
    ['regency', 'location'],
    ['sales', 'sales'],
    ['salesItem', 'sales'],
    ['salesPayment', 'sales'],
    ['state', 'location'],
    ['status', 'root'],
    ['tag', 'master'],
    ['tax', 'master'],
    ['unit', 'master'],
    ['village', 'location']
];
exports.up = (queryInterface, Sequelize) => {
    Promise.all(TablesAndComment).map(function (el) {
        return queryInterface.sequelize.query(`ALTER TABLE \`${el[0]}\` COMMENT = '${el[1]}'`);
    });
};
exports.down = (queryInterface, Sequelize) => {
    Promise.all(TablesAndComment).map(function (el) {
        return queryInterface.sequelize.query(`ALTER TABLE \`${el[0]}\` COMMENT = ''`);
    });
};