'use strict';
const Promise = require('bluebird');
const Indexes = [
    ['national', {name: 'idx_name', fields: ['name']}],
    ['state', {name: 'idx_name', fields: ['name']}],
    ['regency', {name: 'idx_name', fields: ['name']}],
    ['district', {name: 'idx_name', fields: ['name']}],
    ['village', {name: 'idx_name', fields: ['name']}],
    ['village', {name: 'idx_zipcode', fields: ['zipcode']}],
    ['type', {name:'idx_value', unique: true, fields: ['name']}],
    ['tag', {name:'idx_value', unique: true, fields: ['name']}],
    ['code', {name:'idx_value', unique: true, fields: ['value']}],
    ['brand', {name:'idx_name',  unique: true, fields: ['name'] }],
    ['contact', {name:'idx_name', unique: true, fields: ['name']}],
    ['person', {name: 'idx_name', fields: ['name']}],
    ['person', {name: 'idx_username', unique: true, fields: ['username']}],
    ['personContact', {name: 'idx_value', unique: true, fields: ['value']}],
    ['product', {name: 'idx_name', fields: ['name']}],
    ['trans', {name: 'idx_code', unique: true, fields: ['code']}]
];

exports.up = async (queryInterface, Sequelize) => {
    Promise.all(Indexes).map(function (el) {
        return queryInterface.addIndex(el[0], el[1]);
    });
};

exports.down = async (queryInterface, Sequelize) => {
    /*
    //notes : this code is harmful for removing index when migration is step by step to do
    let indexes = {}, result = await queryInterface.sequelize.query(`
        SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE INDEX_SCHEMA = 'retail-dev' AND INDEX_NAME LIKE 'idx_%';
    `);

    result[0].forEach(function (row) {
        indexes[row.TABLE_NAME] = indexes[row.TABLE_NAME] || [];
        indexes[row.TABLE_NAME].push(row.INDEX_NAME)
    });

    Promise.all(Object.keys(indexes)).map(function (table) {
        return Promise.all(indexes[table]).map(function (idx) {
            return queryInterface.removeIndex(table, idx);
        });
    });
    */

    Promise.all(Indexes).map(function (el) {
        return queryInterface.removeIndex(el[0], el[1].name);
    });
};