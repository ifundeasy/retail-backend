'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
const sha512 = function (string, salt) {
    let hash = crypto.createHmac('sha512', salt);
    hash.update(string);
    return hash.digest('hex');
};
const data = require('./../config/build.data');
const parse = function ({fields, values}) {
    return values.map(function (values) {
        let o = {};
        values.forEach(function (val, i) {
            o[fields[i]] = val
        });
        return o
    });
};

exports.up = async (queryInterface, Sequelize) => {
    return await Promise.mapSeries(Object.keys(data), async function (name) {
        return queryInterface.bulkInsert(name, parse(data[name]));
    });
};
exports.down = async (queryInterface) => {
    let reversed = Object.keys(data).reverse();
    return await Promise.mapSeries(reversed, async function (name) {
        let ids = data[name].values.map(function (obj) {
            return obj[0]
        });
        ids.sort(function (a, b) {
            return b - a;
        });
        return await Promise.mapSeries(ids, function (id) {
            return queryInterface.bulkDelete(name, {
                id: {[Sequelize.Op.in]: [id]}
            });
        });
    });
};