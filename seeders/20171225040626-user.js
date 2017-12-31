'use strict';

const crypto = require('crypto');
const Promise = require('bluebird');
const Sequelize = require('sequelize');
const randomString = require(`./../utils/random.string`);
const sha512 = function (string, salt) {
    let hash = crypto.createHmac('sha512', salt);
    hash.update(string);
    return hash.digest('hex');
};

const status_id = 1, username = 'root', salt = randomString(16);
const loadData = async function (qi) {
    let actor = [
        {id: 1, name: 'root', status_id}
    ];
    let actorRoute = [];
    let person = [
        {
            id: 1, name: 'Mr. Creator', username,
            password: sha512(username, salt),
            salt, gender: 1, status_id
        }
    ];
    let personActor = [
        {id: 1, person_id: person[0].id, actor_id: actor[0].id, status_id}
    ];
    let http = [
        {id: 1, name: 'create', code: 'POST', status_id},
        {id: 2, name: 'read', code: 'GET', status_id},
        {id: 3, name: 'update', code: 'PUT', status_id},
        {id: 4, name: 'delete', code: 'DELETE', status_id}
    ];
    let api = [], apiRoute = [];
    let routes = {}, raw = await qi.sequelize.query(`
        SELECT TABLE_COMMENT, TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA='${process.env.DB_NAME}' AND TABLE_COMMENT REGEXP('.')
        ORDER BY TABLE_COMMENT, TABLE_NAME
    `);
    //
    raw[0].forEach(function (el) {
        let {TABLE_COMMENT, TABLE_NAME} = el;
        routes[TABLE_COMMENT] = routes[TABLE_COMMENT] || {};
        routes[TABLE_COMMENT].id = Object.keys(routes).length;
        routes[TABLE_COMMENT].children = routes[TABLE_COMMENT].children || [];
        routes[TABLE_COMMENT].children.push(TABLE_NAME);
        http.forEach(function (el) {
            let d = {
                id: apiRoute.length + 1,
                name: TABLE_NAME,
                api_id: routes[TABLE_COMMENT].id,
                http_id: el.id,
                status_id
            };
            apiRoute.push(d);
            actorRoute.push({
                id: actorRoute.length + 1,
                actor_id: actor[0].id,
                api_id: d.api_id,
                apiRoute_id: d.id,
                status_id
            })
        })
    });
    Object.keys(routes).forEach(function (key) {
        let {id} = routes[key];
        api.push({id, name: key, status_id})
    });
    return {http, api, apiRoute, actor, actorRoute, person, personActor};
};
exports.up = async (queryInterface, Sequelize) => {
    let data = await loadData(queryInterface);
    return await Promise.mapSeries(Object.keys(data), async function (name) {
        return queryInterface.bulkInsert(name, data[name]);
    });
};
exports.down = async (queryInterface) => {
    let data = await loadData(queryInterface);
    let revKeys = Object.keys(data).reverse();
    return await Promise.mapSeries(revKeys, async function (name) {
        let ids = data[name].map(function (obj) {
            return obj.id
        });
        return queryInterface.bulkDelete(name, {
            id: {[Sequelize.Op.in]: ids}
        });
    });
};