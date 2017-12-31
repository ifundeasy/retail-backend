'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const csv = require('fast-csv');
const Sequelize = require('Sequelize');
const csvPath = `${__dirname}/../data/`;
const tables = ['national', 'state', 'regency', 'district', 'village'];
const helper = function (name, handler) {
    let temp = [];
    let stream = fs.createReadStream(`${csvPath + name}.csv`);
    let command = csv.fromStream(stream, {headers: true});
    return new Promise(function (resolve, reject) {
        command.on('error', reject);
        command.on('data', async function (data) {
            temp.push(data);
            if (temp.length == 100) {
                let buffer = temp.slice(0);

                temp = [];
                await handler(buffer);
            }
        });
        command.on('end', async function (d) {
            if (temp.length) {
                let buffer = temp.slice(0);

                temp = [];
                await handler(buffer);
            }
            return await resolve(d)
        });
    });
};
exports.up = (queryInterface, Sequelize) => {
    return Promise.mapSeries(tables, async function (name) {
        return helper(name, async function (buffer) {
            await queryInterface.bulkInsert(name, buffer);
        });
    });
};
exports.down = (queryInterface) => {
    return Promise.mapSeries(tables.reverse(), async function (name) {
        return helper(name, async function (buffer) {
            let ids = buffer.map(function (obj) {
                return parseInt(obj.id)
            });
            await queryInterface.bulkDelete(name, {
                [Sequelize.Op.in]: ids
            });
        });
    });
};