const _temp = {};
const fs = require('fs');
const {Router} = require('express');
const route = Router();
const jsonParse = function (string) {
    try {
        throw JSON.parse(string);
    } catch (e) {
        return e
    }
};
const getAdtQuery = function (object, query = {}) {
    let filter, sorter, error = [], {table} = object;

    if (query.hasOwnProperty('filter')) {
        filter = jsonParse(query.filter);
        if (!filter) error.push(filter.message);
        if (!Object.keys(filter).length) error.push('query string for filter value');
    }
    if (query.hasOwnProperty('sort')) {
        sorter = jsonParse(query.sort);
        if (!sorter) error.push(sorter.message);
        if (sorter.length) {
            object.order = {};
            sorter.forEach(function (sort = {}, i) {
                let {property, direction} = sort;
                if (property && direction) {
                    object.order[property] = direction.toLowerCase();
                } else {
                    error.push(`query string for sort value at index-${i} require "property" and "direction" key`);
                }
            });
        }
    }
    if (error.length) return new Error(`Invalid ${error.join(',')}`);
    //
    filter = filter || {};
    object.type = 'select';
    object.where = filter;
    object.offset = parseInt(query.offset) || 0;
    object.limit = parseInt(query.limit) || 100;
    return object
};
//
module.exports = function ({Glob, locals, compile}) {
    const httpCode = require(`${Glob.home}/utils/http.code`);
    const qbuilder = require(`${Glob.home}/utils/query.builder`);
    const {name} = locals;
    const authorizing = async function (req, res, next) {
        let {method} = req,
            {routes} = req.logged,
            name = req._parsedUrl.pathname.substr(1),
            reqUrl = '/soap/' + name;

        try {
            //todo: uncomment 6 lines bellow!
            //if (!routes.hasOwnProperty(reqUrl)) {
            //    throw new Error(`You can't access ${reqUrl} route`);
            //}
            //if (routes[reqUrl].methods.indexOf(method) === -1) {
            //    throw new Error(`You can't access ${reqUrl} route with ${method}'s method`);
            //}
            return next();
        } catch (e) {
            return next(e);
        }
    };
    _temp.database = Glob.config.mysql.database;
    _temp.compileFn = compile;
    //
    route.get('/product', authorizing, async function (req, res, next) {
        let {query} = req;
        let {status, message} = httpCode.OK;
        try {
            let adtQuery = qbuilder(getAdtQuery({table: 'WTF'}, query)).raw;
            let productQuery = `
                SELECT
                    z.id, z.name,
                    r3.id productCode_id,
                    r3.code productCode_code,
                    z.brand_id, r2.name brand_name,
                    r4.id productPrice_id, r4.price productPrice_price,
                    r4.type_id, r4.type_name,
                    r4.unit_id, r4.unit_name, r4.unit_shortname,
                    r5.productPriceDisc_name, r5.productPriceDisc_value, r5.productPriceDisc_desc,
                    r6.productPriceTax_name, r6.productPriceTax_value, r6.productPriceTax_desc,
                        r7.productTag_name,
                    z.status_id, r8.name status_name,
                    z.notes,
                    z.product_id, r1.name product_name
                FROM product z
                LEFT JOIN product r1 ON r1.id = z.product_id AND r1.op_id = 1
                LEFT JOIN brand r2 ON r2.id = z.brand_id AND r2.op_id = 1
                LEFT JOIN (
                    SELECT *
                    FROM (SELECT * FROM productCode WHERE op_id = 1 ORDER BY id DESC) a
                    GROUP BY product_id
                ) r3 ON r3.product_id = z.id
                LEFT JOIN (
                    SELECT b.*, \`unit\`.name unit_name, \`unit\`.short unit_shortname, \`type\`.name type_name
                    FROM (SELECT * FROM productPrice WHERE op_id = 1 ORDER BY id DESC) b
                    JOIN \`type\` ON \`type\`.id = b.type_id AND \`type\`.op_id = 1
                    JOIN \`unit\` ON \`unit\`.id = b.unit_id AND \`unit\`.op_id = 1
                    GROUP BY product_id, b.type_id
                ) r4 ON r4.product_id = z.id
                LEFT JOIN (
                    SELECT
                        c.product_id, c.productPrice_id,
                        GROUP_CONCAT(c.discount_name SEPARATOR ', ') productPriceDisc_name,
                        GROUP_CONCAT(c.discount_value SEPARATOR ', ') productPriceDisc_value,
                        GROUP_CONCAT(c.discount_desc SEPARATOR ', ') productPriceDisc_desc
                    FROM (
                        SELECT
                            d3.product_id, d1.productPrice_id, d1.discount_id,
                            d2.name discount_name, IF (d2.isPercent = '1', CONCAT(d2.value, '%'), d2.value) discount_value,
                            CONCAT(d2.name, ' (', IF (d2.isPercent = '1', CONCAT(d2.value, '%'), d2.value), ')') discount_desc
                        FROM productPriceDisc d1
                        LEFT JOIN discount d2 ON d2.id = d1.discount_id AND d2.op_id = 1
                        LEFT JOIN productPrice d3 ON d3.id = d1.productPrice_id AND d3.op_id = 1
                        WHERE d1.op_id = 1
                    ) c
                    GROUP BY c.productPrice_id
                ) r5 ON r5.productPrice_id = r4.id
                LEFT JOIN (
                    SELECT
                        d.product_id, d.productPrice_id,
                        GROUP_CONCAT(d.tax_name SEPARATOR ', ') productPriceTax_name,
                        GROUP_CONCAT(d.tax_value SEPARATOR ', ') productPriceTax_value,
                        GROUP_CONCAT(d.tax_desc SEPARATOR ', ') productPriceTax_desc
                    FROM (
                        SELECT
                            e3.product_id, e1.productPrice_id, e1.tax_id,
                            e2.name tax_name, IF (e2.isPercent = '1', CONCAT(e2.value, '%'), e2.value) tax_value,
                            CONCAT(e2.name, ' (', IF (e2.isPercent = '1', CONCAT(e2.value, '%'), e2.value), ')') tax_desc
                        FROM productPriceTax e1
                        LEFT JOIN tax e2 ON e2.id = e1.tax_id AND e2.op_id = 1
                        LEFT JOIN productPrice e3 ON e3.id = e1.productPrice_id AND e3.op_id = 1
                        WHERE e1.op_id = 1
                    ) d
                    GROUP BY d.productPrice_id
                ) r6 ON r6.productPrice_id = r4.id
                LEFT JOIN (
                    SELECT e.product_id, GROUP_CONCAT(e.name SEPARATOR ', ') productTag_name
                    FROM (
                        SELECT c1.tag_id tag_id1, c2.tag_id tag_id2, c1.product_id, c2.name, c1.op_id FROM productTag c1
                        LEFT JOIN tag c2 ON c2.id = c1.tag_id AND c2.op_id = 1
                        UNION
                        SELECT c2.tag_id tag_id1, c3.tag_id tag_id2, c1.product_id, c3.name, c1.op_id FROM productTag c1
                        LEFT JOIN tag c2 ON c2.id = c1.tag_id AND c2.op_id = 1
                        LEFT JOIN tag c3 ON c3.id = c2.tag_id AND c3.op_id = 1
                        ORDER BY tag_id2, tag_id1
                    ) e
                    WHERE op_id = 1
                    GROUP BY product_id
                ) r7 ON r7.product_id = z.id
                LEFT JOIN \`status\` r8 ON r8.id = z.status_id AND r8.op_id = 1
                WHERE (z.op_id = 1)
            `;
            let tags = [], discounts = [], taxes = [], pricesIds = [], productIds = [];
            let total, products = await compile(`
                SELECT * FROM (${productQuery}) product
                ${adtQuery.indexOf('where') > 0 ? adtQuery.substr(adtQuery.indexOf('where')).replace(/WTF\./g, '') : ''}
            `);

            if (products.length) {
                productIds = products.map(function (product) {
                    let priceId = product.productPrice_id;
                    if (pricesIds.indexOf(priceId) < 0) {
                        pricesIds.push(product.productPrice_id);
                    }
                    return product.id
                });
                tags = await compile(`
                    SELECT
                        a.id, a.product_id,
                        a.tag_id, b.name tag_name,  
                        b.tag_id tag_tag_id, c.name tag_tag_name,
                        a.status_id, a.notes
                    FROM productTag a 
                    LEFT JOIN tag b ON b.id = a.tag_id AND b.op_id = 1
                    LEFT JOIN tag c ON c.id = b.tag_id AND c.op_id = 1
                    WHERE a.product_id in (${productIds.join(',')}) AND a.op_id = 1
                `);
                if (tags.length) {
                    tags.forEach(function(tag){
                        products.forEach(function (product) {
                            product.productTag = product.productTag || [];
                            if (product.id === tag.product_id) {
                                product.productTag.push(tag);
                            }
                        });
                    })
                }
            }
            if (pricesIds.length) {
                discounts = await compile(`
                    SELECT
                        a.id, a.productPrice_id,
                        a.discount_id,
                        b.name discount_name, 
                        b.isPercent discount_isPercent,
                        b.value discount_value,
                        b.notes discount_notes,
                        a.status_id, a.notes
                    FROM productPriceDisc a 
                    LEFT JOIN discount b ON b.id = a.discount_id AND b.op_id = 1
                    WHERE a.productPrice_id in (${pricesIds.join(',')}) AND a.op_id = 1
                `);
                taxes = await compile(`
                    SELECT
                        a.id, a.productPrice_id,
                        a.tax_id,
                        b.name tax_name, 
                        b.isPercent tax_isPercent,
                        b.value tax_value,
                        b.notes tax_notes,
                        a.status_id, a.notes
                    FROM productPriceTax a 
                    LEFT JOIN tax b ON b.id = a.tax_id AND b.op_id = 1
                    WHERE a.productPrice_id in (${pricesIds.join(',')}) AND a.op_id = 1
                `);
                if (discounts.length) {
                    pricesIds.forEach(function (priceId) {
                        let productPriceDisc = discounts.filter(function (discount) {
                            if (discount.productPrice_id === priceId) return 1;
                            return 0;
                        });
                        let productPriceTax = taxes.filter(function (discount) {
                            if (discount.productPrice_id === priceId) return 1;
                            return 0;
                        });
                        products.forEach(function (product) {
                            if (product.productPrice_id === priceId) {
                                product.productPriceDisc = productPriceDisc;
                                product.productPriceTax = productPriceTax
                            }
                        });
                    })
                }
            }
            total = await compile(`
                SELECT COUNT(*) xy FROM (${productQuery}) product
                ${
                    (adtQuery.indexOf('where') > 0 ? adtQuery.substr(adtQuery.indexOf('where')).replace(/WTF\./g, '') : '')
                    .replace(/limit\s[0-9]+|offset\s[0-9]+/g, '')
                }
            `);
            res.send({status, message, total: total[0].xy, data: products});
        } catch (e) {
            if (e.message.indexOf('Unexpected token') === 0) {
                let error = 'Invalid query string for filter value, it should be JSON format. ' + e.message;
                next(new Error(error));
            } else next(e);
        }
    });
    return route;
};