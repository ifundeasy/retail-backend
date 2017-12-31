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
const urlCheck = function (param, method, query = {}, body = {}) {
    let error = [];
    if (['POST', 'PUT'].indexOf(method) > -1 && !Object.keys(body).length) {
        error.push('body payloads value');
    }
    //
    let filter;
    if (query.hasOwnProperty('filter') && method !== 'POST') {
        filter = jsonParse(query.filter);
        if (!filter) error.push(filter.message);
        if (!Object.keys(filter).length) error.push('query string for filter value');
    }
    //
    if (error.length) error = new Error(`Invalid ${error.join(',')}`);
    //
    if (method === 'POST') {
        param.type = 'update';
        param.values = body;
    } else if (method === 'PUT') {
        param.type = 'update';
        param.values = body;
        param.where = filter;
    } else if (method === 'DELETE') {
        param.type = 'delete';
        param.where = filter;
    } else if (method === 'GET') {
        param.alias = 'z';
        param.type = 'select';
        param.where = filter;
        param.offset = parseInt(query.offset) || 0;
        param.limit = parseInt(query.limit) || 100;
    }
    return {param, error}
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
const getUpJoin = async function (name, alias) {
    let upRelation = await getRelation(name, 'up');
    let mapper = [name].concat(upRelation);
    let columns = [], joins = [];

    await Promise.map(mapper, async function (relate, i) {
        let join = {};
        let table_name = i ? relate.table_ref : name;
        let cols = await describeColumns(table_name);
        let newAlias = relate.column ? relate.column.substr(0, relate.column.length - relate.column_ref.length - 1) : '';
        
        if (i) {
            join = {
                type: 'left',
                target: table_name,
                alias: 'r' + i,
                on: {[relate.column_ref]: `$z.${relate.column}$`}
            };
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

    return {columns, joins, upRelation}
};
//
module.exports = function ({Glob, locals, compile}) {
    const httpCode = require(`${Glob.home}/utils/http.code`);
    const qbuilder = require(`${Glob.home}/utils/query.builder`);
    const {name} = locals;
    const middleware = async function (req, res, next) {
        let {method, query, body} = req,
            {authorized} = req.logged,
            {name} = req.params,
            {status, message} = httpCode.OK;

        try {
            let param;
            if (Glob.tables.indexOf(name) === -1) {
                throw new Error(`Invalid route name for /api/${name}`);
            } else param = {table: name};
            if (!authorized[name]) throw new Error(`You can't access /api/${name} route`);
            if (authorized[name].methods.indexOf(method) === -1) {
                throw new Error(`You can't access /api/${name} route with ${method}'s method`);
            }
            //
            let url = urlCheck(param, method, query, body);
            if (url.error instanceof Error) throw new Error(url.error);
            param = url.param;
            if (method === 'GET') {
                let {columns, joins} = await getUpJoin(name, param.alias);
                Object.assign(param, {columns, joins});
            }
            //
            let sql = qbuilder(param);
            let request = {method, body, query, sql: sql.raw};
            let result = await compile(sql.raw);
            //
            if (result instanceof Error) throw result;
            else res.send({status, message, request, data: result});
        } catch (e) {
            if (e.message.indexOf('Unexpected token') === 0) {
                let s = 'Invalid query string for filter value, it should be JSON format. ' + e.message;
                next(new Error(s));
            } else next(e);
        }
    };
    _temp.database = Glob.config.mysql.database;
    _temp.compileFn = compile;
    //
    route.get('/_models', async function (req, res, next) {
        let tables = {};
        let lowerCaseTables = Glob.tables.map(function (table) {
            return table.toLowerCase();
        });
        let {status, message} = httpCode.OK;
        //
        await Promise.map(Glob.tables, async function (name) {
            let rawFields = await compile(`DESCRIBE ${name}`);
            let {columns, upRelation} = await getUpJoin(name, 'o');
            let self = {};
            rawFields.forEach(function (el) {
                self[el.Field] = {
                    type: el.Type,
                    //null: el.Null,
                    //key: el.Key,
                    //default: el.Default
                }
            });
            upRelation.forEach(function (relate) {
                let table = Glob.tables[lowerCaseTables.indexOf(relate.table_ref)];
                let prefix = relate.column.substr(0, relate.column.length - relate.column_ref.length - 1);
                self[relate.column].table_ref = table;
                self[relate.column].column_ref = relate.column_ref;
                if (prefix !== table) self[relate.column].prefix = prefix;
            });
            tables[name] = self;
        });

        //for (let name in tables) {
        //    let table = tables[name];
        //    for (let key in table) {
        //        let field = table[key];
        //        if (field.table_ref) {
        //            field.ref = field.table_ref === name ? 'self' : tables[field.table_ref]
        //        }
        //    }
        //}
        res.send({status, message, data: tables})
    });
    route.put('/:name', middleware);
    route.post('/:name', middleware);
    route.delete('/:name', middleware);
    route.get('/:name', middleware);
    return route;
};