const _temp = {};
const fs = require('fs');
const Promise = require('bluebird');
const {Router} = require('express');
const route = Router();
const avoidFields = ['salt', 'password'];
const jsonParse = function (string) {
    try {
        throw JSON.parse(string);
    } catch (e) {
        return e
    }
};
const describeColumns = async function (name) {
    let columns = await _temp.compileFn(`DESCRIBE \`${name}\``);
    return columns.map(function (row) {
        return row.Field;
    });
};
const getRelation = async function (name, mode) {
    let up = [], down = [];
    let relation = await _temp.compileFn(`
        SELECT
          IF (TABLE_NAME = '${name}', 0, 1) IS_CHILD,
          TABLE_NAME 'TABLE',
          COLUMN_NAME 'COLUMN',
          REFERENCED_TABLE_NAME TABLE_REF,
          REFERENCED_COLUMN_NAME COLUMN_REF
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE
          COLUMN_NAME != 'id' AND 
          REFERENCED_TABLE_SCHEMA = '${_temp.database}' AND 
          TABLE_SCHEMA = '${_temp.database}' AND
          (TABLE_NAME = '${name}' OR REFERENCED_TABLE_NAME = '${name}')
        ORDER BY IF (TABLE_NAME = '${name}', 0, 1);
    `);
    relation.forEach(function (row) {
        let o = {
            table: row.TABLE,
            column: row.COLUMN,
            table_ref: row.TABLE_REF,
            column_ref: row.COLUMN_REF
        };
        if (row.IS_CHILD) down.push(o);
        else up.push(o);
    });
    return !mode ? {up, down} : mode === 'up' ? up : down;
};
const getParentRelations = async function (name, alias) {
    let parents = await getRelation(name, 'up');
    let mapper = [name].concat(parents);
    let columns = [], joins = [];

    await Promise.map(mapper, async function (relate, i) {
        let join = {};
        let table_name = i ? relate.table_ref : name;
        let cols = await describeColumns(table_name);
        let newAlias = relate.column ? relate.column.substr(0, relate.column.length - relate.column_ref.length - 1) : '';

        if (i) {
            join = {
                target: table_name,
                alias: 'r' + i,
                on: {[relate.column_ref]: `$z.${relate.column}$`}
            };

            if (table_name !== 'op') join.on['op_id'] = 1;
            if (table_name === name) join.type = 'left';
            joins.push(join);
        }

        cols.forEach(function (col) {
            let columnName = [join.alias || alias, col].join('.');
            let asColumn = i ? [newAlias, col].join('_') : join.alias ? columnName : col;
            let isExist = columns.filter(function (col) {
                let avoid = avoidFields.filter(function (field) {
                    if (asColumn.indexOf(field) > -1) return 0;
                    return 1;
                });
                let added = avoid.length === avoidFields.length;
                if ((col.as === asColumn) || !added) return 1;
                return 0;
            });
            if (!isExist.length) {
                columns.push({
                    name: columnName,
                    as: asColumn
                });
            }
        })
    });

    return {columns, joins, parents}
};
const setQuery = async function (object, method, query = {}, body = {}) {
    let filter, error = [], {table} = object,
        columns = await describeColumns(object.table);

    if (['POST', 'PUT'].indexOf(method) > -1 && !Object.keys(body).length) {
        error.push('body payloads value');
    }
    if (query.hasOwnProperty('filter') && method !== 'POST') {
        filter = jsonParse(query.filter);
        if (!filter) error.push(filter.message);
        if (!Object.keys(filter).length) error.push('query string for filter value');
    }
    if (error.length) return new Error(`Invalid ${error.join(',')}`);
    //
    if (method === 'POST') {
        body = body.constructor === Object ? [body] : body;
        object.type = 'insert';
        object.values = body.map(function (row) {
            let data = {};

            columns.forEach(function (field) {
                if (row[field]) data[field] = row[field];
            });
            data.op_id = 1;

            return data
        });
    } else if (method === 'PUT') {
        object.operations = [];
        body = body.constructor === Object ? [body] : body;
        body.forEach(function (row) {
            let data = {};
            let condition = row._;
            let {id} = condition;
            columns.forEach(function (field) {
                if (row.hasOwnProperty(field)) {
                    if (((field.slice(-3) === '_id') && !row[field]) || !row[field]) data[field] = null;
                    else data[field] = row[field]
                }
            });
            data.op_id = 1;

            if (condition.hasOwnProperty('id') && id) {
                object.operations.push({
                    table: table,
                    type: 'update',
                    updates: data,
                    where: {id}
                })
            } else {
                object.operations.push({
                    table: table,
                    type: 'insert',
                    values: data
                })
            }
        });
    } else if (method === 'DELETE') {
        body = body.constructor === Object ? [body] : body;
        object.type = 'update';
        let $in = body.filter(function (o) {
            if (o.id) return 1;
            return 0;
        }).map(function (o) {
            return o.id
        });
        object.updates = {op_id: 2};
        object.where = {id: {$in}};
    } else if (method === 'GET') {
        let parents;

        filter = filter || {};
        filter.op_id = 1;
        object.alias = 'z';
        object.type = 'select';
        object.where = filter;
        object.offset = parseInt(query.offset) || 0;
        object.limit = parseInt(query.limit) || 100;
        try {
            let sorter = JSON.parse(query.sort);
            if (sorter.length) {
                object.order = {};
                sorter.forEach(function (sort) {
                    let {property, direction} = sort;
                    object.order[property] = direction.toLowerCase();
                });
            }
        } catch (e) {
            //
        }
        parents = await getParentRelations(table, object.alias);
        object.columns = parents.columns;
        object.joins = parents.joins;
    }
    return object
};
//
module.exports = function ({Glob, locals, compile}) {
    const httpCode = require(`${Glob.home}/utils/http.code`);
    const qbuilder = require(`${Glob.home}/utils/query.builder`);
    const {name} = locals;
    const authorizing = async function (req, res, next) {
        let {method, query, body} = req,
            {routes} = req.logged,
            name = req._parsedUrl.pathname.substr(1),
            {status, message} = httpCode.OK,
            reqUrl = '/soap/' + name;

        try {
            //todo: uncomment 6 lines bellow!
            //if (!routes.hasOwnProperty(reqUrl)) {
            //    throw new Error(`You can't access ${reqUrl} route`);
            //}
            //if (routes[reqUrl].methods.indexOf(method) === -1) {
            //    throw new Error(`You can't access ${reqUrl} route with ${method}'s method`);
            //}
            //
            req.queryObj = await setQuery({table: name}, method, query, body);
            if (req.queryObj instanceof Error) throw req.queryObj;
            return next();
        } catch (e) {
            return next(e);
        }
    };
    _temp.database = Glob.config.mysql.database;
    _temp.compileFn = compile;
    //
    route.get('/product', authorizing, function (req, res, next) {
        let {status, message} = httpCode.OK;
        let {method, query, body, queryObj} = req;
        let nestedSelection = {
            type:  'select',
            table: 'state',
            alias: 'z',
            joins: [
                {
                    type: 'left',
                    target: {
                        type: 'select',
                        alias: 'regency',
                        table: {
                            type: 'select',
                            table: 'regency',
                            where: {
                                op_id: 1,
                                name: {
                                    $like : '%art%'
                                }
                            },
                            order: {
                                name: 'DESC'
                            }
                        },
                        groupBy: ['state_id']
                    },
                    alias: 'r1',
                    on: {
                        id: '$z.status_id$',
                        op_id: 1
                    }
                }
            ]
        };
        res.send(qbuilder(nestedSelection))
    });
    return route;
};