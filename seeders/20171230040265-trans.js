'use strict';
const fs = require('fs');
const Promise = require('bluebird');
const Sequelize = require('Sequelize');
const data = {
    type: [
        {id: 1, name: 'Purchasing'},
        {id: 2, name: 'Sales'}
    ],
    typePost: [
        {id: 1, name: 'Void'},
        {id: 2, name: 'Returns'},
        {id: 3, name: 'Bonus'},
        {id: 4, name: 'Complimentary'},
        {id: 5, name: 'Sample'}
    ]
};
exports.up = (queryInterface) => {
    return Promise.mapSeries(Object.keys(data), async function (name) {
        return queryInterface.bulkInsert(name, data[name]);
    });
};
exports.down = (queryInterface) => {
    return Promise.mapSeries(Object.keys(data).reverse(), async function (name) {
        let ids = data[name].map(function (o) {
            return o.id
        });
        return queryInterface.bulkDelete(name, {
            [Sequelize.Op.in]: ids
        });
    });
};