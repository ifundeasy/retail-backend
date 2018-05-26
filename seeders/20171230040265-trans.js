'use strict';
const fs = require('fs');
const Promise = require('bluebird');
const Sequelize = require('Sequelize');
const data = {
    type: [
        {id: 1, name: 'Purchasing'},
        {id: 2, name: 'Sales'},
        {id: 3, name: 'Operational'}
    ],
    modifier: [
        {id: 1, name: 'Void/Returns'},
        {id: 2, name: 'Bonus'},
        {id: 3, name: 'Complimentary'},
        {id: 4, name: 'Sample'}
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