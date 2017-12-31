'use strict';
console.log(1)
const fs = require('fs');
const Promise = require('bluebird');
const csv = require('fast-csv');
const Sequelize = require('Sequelize');
const data = [
    {id: 1, name: 'active'},
    {id: 2, name: 'deactive'}
];
exports.up = (queryInterface) => {
    return queryInterface.bulkInsert('status', data, {});
};
exports.down = (queryInterface) => {
    let ids = data.map(function (obj) {
        return parseInt(obj.id)
    });
    return queryInterface.bulkDelete('status', {
        [Sequelize.Op.in]: ids
    });
};