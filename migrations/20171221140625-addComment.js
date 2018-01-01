'use strict';
const Promise = require('bluebird');
const TablesAndComment = [
    ['op', 'hidden']
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