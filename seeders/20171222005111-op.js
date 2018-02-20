'use strict';
const fs = require('fs');
const Promise = require('bluebird');
const csv = require('fast-csv');
const Sequelize = require('Sequelize');
const data = [
    {id: 1, name: 'permanent'},
    {id: 2, name: 'exist'},
    {id: 3, name: 'deleted'},
];
exports.up = (queryInterface) => {
    return queryInterface.bulkInsert('op', data, {});
};
exports.down = (queryInterface) => {
    let ids = data.map(function (obj) {
        return parseInt(obj.id)
    });
    return queryInterface.bulkDelete('op', {
        [Sequelize.Op.in]: ids
    });
};