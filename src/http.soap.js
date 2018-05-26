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
                LEFT JOIN product r1 ON r1.id = z.product_id AND r1.op_id IN (1, 2)
                LEFT JOIN brand r2 ON r2.id = z.brand_id AND r2.op_id IN (1, 2)
                LEFT JOIN (
                    SELECT *
                    FROM (SELECT * FROM productCode WHERE op_id IN (1, 2) ORDER BY id DESC) a
                    GROUP BY product_id
                ) r3 ON r3.product_id = z.id
                LEFT JOIN (
                    SELECT b.*, \`unit\`.name unit_name, \`unit\`.short unit_shortname, \`type\`.name type_name
                    FROM (SELECT * FROM productPrice WHERE op_id IN (1, 2) ORDER BY id DESC) b
                    JOIN \`type\` ON \`type\`.id = b.type_id AND \`type\`.op_id IN (1, 2)
                    JOIN \`unit\` ON \`unit\`.id = b.unit_id AND \`unit\`.op_id IN (1, 2)
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
                        LEFT JOIN discount d2 ON d2.id = d1.discount_id AND d2.op_id IN (1, 2)
                        LEFT JOIN productPrice d3 ON d3.id = d1.productPrice_id AND d3.op_id IN (1, 2)
                        WHERE d1.op_id IN (1, 2)
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
                        LEFT JOIN tax e2 ON e2.id = e1.tax_id AND e2.op_id IN (1, 2)
                        LEFT JOIN productPrice e3 ON e3.id = e1.productPrice_id AND e3.op_id IN (1, 2)
                        WHERE e1.op_id IN (1, 2)
                    ) d
                    GROUP BY d.productPrice_id
                ) r6 ON r6.productPrice_id = r4.id
                LEFT JOIN (
                    SELECT e.product_id, GROUP_CONCAT(e.name SEPARATOR ', ') productTag_name
                    FROM (
                        SELECT c1.tag_id tag_id1, c2.tag_id tag_id2, c1.product_id, c2.name, c1.op_id FROM productTag c1
                        LEFT JOIN tag c2 ON c2.id = c1.tag_id AND c2.op_id IN (1, 2)
                        UNION
                        SELECT c2.tag_id tag_id1, c3.tag_id tag_id2, c1.product_id, c3.name, c1.op_id FROM productTag c1
                        LEFT JOIN tag c2 ON c2.id = c1.tag_id AND c2.op_id IN (1, 2)
                        LEFT JOIN tag c3 ON c3.id = c2.tag_id AND c3.op_id IN (1, 2)
                        ORDER BY tag_id2, tag_id1
                    ) e
                    WHERE op_id IN (1, 2)
                    GROUP BY product_id
                ) r7 ON r7.product_id = z.id
                LEFT JOIN \`status\` r8 ON r8.id = z.status_id AND r8.op_id IN (1, 2)
                WHERE (z.op_id IN (1, 2))
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
                    LEFT JOIN tag b ON b.id = a.tag_id AND b.op_id IN (1, 2)
                    LEFT JOIN tag c ON c.id = b.tag_id AND c.op_id IN (1, 2)
                    WHERE a.product_id in (${productIds.join(',')}) AND a.op_id IN (1, 2)
                `);
                if (tags.length) {
                    tags.forEach(function (tag) {
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
                    LEFT JOIN discount b ON b.id = a.discount_id AND b.op_id IN (1, 2)
                    WHERE a.productPrice_id in (${pricesIds.join(',')}) AND a.op_id IN (1, 2)
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
                    LEFT JOIN tax b ON b.id = a.tax_id AND b.op_id IN (1, 2)
                    WHERE a.productPrice_id in (${pricesIds.join(',')}) AND a.op_id IN (1, 2)
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
    route.get('/transaction', authorizing, async function (req, res, next) {
        let {query} = req;
        let {status, message} = httpCode.OK;
        try {
            let adtQuery = qbuilder(getAdtQuery({table: 'WTF'}, query)).raw;
            let transactionQuery = `
                SELECT
                    r1.id, r1.code, r1.type_id, r1.person_id,
                    r3.name person_name, r1.subject_id, r4.name subject_name, 
                    r1.numofprod, SUM(r2.TOTAL) total, r1.total paywith, r1.value applied, 
                    r1.change 'change', r1.tip tip, r1.balance balance, r1.dc
                FROM (
                    SELECT
                        z.id, z.code, z.person_id, z.subject_id, z.type_id, z.dc,
                        r2.numofprod, SUM(r1.total) total,
                        SUM(r1.value) 'value', SUM(r1.change) 'change', SUM(r1.tip) tip,
                        (SUM(r1.total) - SUM(r1.value) - SUM(r1.change) - SUM(r1.tip)) balance,
                        z.trans_id, z.notes
                    FROM trans z
                    LEFT JOIN transPayment r1 ON r1.trans_id = z.id AND r1.op_id IN (1, 2)
                    LEFT JOIN (
                    	SELECT trans_id, COUNT(num) numofprod FROM (
                            SELECT trans_id, COUNT(*) num FROM transItem
                            WHERE transItem_id IS NULL
                            GROUP BY productPrice_id
                        ) z
                    ) r2 ON r2.trans_id = z.id
                    GROUP BY z.id
                ) r1
                JOIN (
                    SELECT
                        z.id, (
                            r2.price - IF(r4.discount, r4.discount, 0) + IF(r5.tax, r5.tax, 0)
                        ) * r1.qty * IF(r1.transItem_id IS NOT NULL, -1, 1) TOTAL
                    FROM trans z
                    LEFT JOIN transItem r1 ON r1.trans_id = z.id AND r1.op_id IN (1, 2)
                    LEFT JOIN productPrice r2 ON r2.id = r1.productPrice_id AND r2.op_id IN (1, 2)
                    LEFT JOIN product r3 ON r3.id = r2.product_id AND r3.op_id IN (1, 2)
                    LEFT JOIN (
                        SELECT
                            z.id, z.transItem_id,
                            SUM(IF(r5.isPercent = 1, r5.value, r5.value/100 * r1.price)) discount
                        FROM transItem z
                        JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                        JOIN product r2 ON r2.id = r1.product_id AND r2.op_id IN (1, 2)
                        LEFT JOIN transItemDisc r3 ON r3.transItem_id = z.id AND r3.op_id IN (1, 2)
                        LEFT JOIN productPriceDisc r4 ON r4.id = r3.productPriceDisc_id AND r4.op_id IN (1, 2)
                        LEFT JOIN discount r5 ON r5.id = r4.discount_id AND r5.op_id IN (1, 2)
                        WHERE z.op_id IN (1, 2)
                        GROUP BY z.id
                    ) r4 ON r4.id = r1.id
                    LEFT JOIN (
                        SELECT
                            z.id, z.transItem_id,
                            SUM(IF(r5.isPercent = 1, r5.value, r5.value/100 * r1.price)) tax
                        FROM transItem z
                        JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                        JOIN product r2 ON r2.id = r1.product_id AND r2.op_id IN (1, 2)
                        LEFT JOIN transItemTax r3 ON r3.transItem_id = z.id AND r3.op_id IN (1, 2)
                        LEFT JOIN productPriceTax r4 ON r4.id = r3.productPriceTax_id AND r4.op_id IN (1, 2)
                        LEFT JOIN tax r5 ON r5.id = r4.tax_id AND r5.op_id IN (1, 2)
                        WHERE z.op_id IN (1, 2)
                        GROUP BY z.id
                    ) r5 ON r5.id = r1.id
                ) r2 ON r2.id = r1.id
                JOIN person r3 ON r3.id = person_id AND r3.op_id IN (1, 2)
                LEFT JOIN person r4 ON r4.id = subject_id AND r4.op_id IN (1, 2)
                GROUP BY r1.id
            `;
            let transaction = await compile(`
                SELECT * FROM (${transactionQuery}) sales
                ${adtQuery.indexOf('where') > 0 ? adtQuery.substr(adtQuery.indexOf('where')).replace(/WTF\./g, '') : ''}
            `);
            let total = await compile(`
                SELECT COUNT(*) xy FROM (${transactionQuery}) sales
                ${
                (adtQuery.indexOf('where') > 0 ? adtQuery.substr(adtQuery.indexOf('where')).replace(/WTF\./g, '') : '')
                .replace(/limit\s[0-9]+|offset\s[0-9]+/g, '')
                }
            `);
            res.send({status, message, total: total[0].xy, data: transaction});
        } catch (e) {
            if (e.message.indexOf('Unexpected token') === 0) {
                let error = 'Invalid query string for filter value, it should be JSON format. ' + e.message;
                next(new Error(error));
            } else next(e);
        }
    });
    route.get('/transactionItem', authorizing, async function (req, res, next) {
        let {query} = req;
        let {status, message} = httpCode.OK;
        try {
            let adtQuery = qbuilder(getAdtQuery({table: 'WTF'}, query)).raw;
            let transactionItemQuery = `
                SELECT
                    r1.id, r1.modifier_id, r2.name modifier_name, r1.transItem_id,
                    r4.id product_id, r4.name product_name, 
                    r8.id productCode_id, r8.code productCode_code, 
                    r3.price productPrice_price, 
                    qty, r1.qties, r3.unit_id, r7.name unit_name,
                    IF(r5.discount, r5.discount, 0) disc, IF(r6.tax, r6.tax, 0) tax,
                    (r3.price - IF(r5.discount, r5.discount, 0) + IF(r6.tax, r6.tax, 0)) * qty total,
                    r1.trans_id, r1.person_id, r9.name person_name, r1.notes
                FROM trans z
                JOIN (
                    SELECT 
                        z.*, IF(z.transItem_id IS NULL, r1.qty, NULL) qties
                    FROM transItem z
                    LEFT JOIN (
                        SELECT
                            r1.transItem_id, r1.productPrice_id, SUM(r1.qty) qty
                        FROM trans z
                        LEFT JOIN transItem r1 ON r1.trans_id = z.id AND r1.op_id IN (1, 2)
                        LEFT JOIN modifier r2 ON r2.id = r1.modifier_id AND r2.op_id IN (1, 2)
                        WHERE r1.transItem_id IS NOT NULL AND modifier_id IS NOT NULL
                        GROUP BY r1.productPrice_id, r1.transItem_id
                    ) r1 ON r1.productPrice_id = z.productPrice_id
                ) r1 ON r1.trans_id = z.id AND r1.op_id IN (1, 2)
                LEFT JOIN modifier r2 ON r2.id = r1.modifier_id AND r2.op_id IN (1, 2)
                JOIN productPrice r3 ON r3.id = r1.productPrice_id AND r3.op_id IN (1, 2)
                JOIN product r4 ON r4.id = r3.product_id AND r4.op_id IN (1, 2)
                LEFT JOIN (
                    SELECT
                        z.id, z.transItem_id,
                        SUM(IF(r5.isPercent = 1, r5.value, r5.value/100 * r1.price)) discount
                    FROM transItem z
                    JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                    JOIN product r2 ON r2.id = r1.product_id AND r2.op_id IN (1, 2)
                    LEFT JOIN transItemDisc r3 ON r3.transItem_id = z.id AND r3.op_id IN (1, 2)
                    LEFT JOIN productPriceDisc r4 ON r4.id = r3.productPriceDisc_id AND r4.op_id IN (1, 2)
                    LEFT JOIN discount r5 ON r5.id = r4.discount_id AND r5.op_id IN (1, 2)
                    WHERE z.op_id IN (1, 2)
                    GROUP BY z.id
                ) r5 ON r5.id = r1.id
                LEFT JOIN (
                    SELECT
                        z.id, z.transItem_id,
                        SUM(IF(r5.isPercent = 1, r5.value, r5.value/100 * r1.price)) tax
                    FROM transItem z
                    JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                    JOIN product r2 ON r2.id = r1.product_id AND r2.op_id IN (1, 2)
                    LEFT JOIN transItemTax r3 ON r3.transItem_id = z.id AND r3.op_id IN (1, 2)
                    LEFT JOIN productPriceTax r4 ON r4.id = r3.productPriceTax_id AND r4.op_id IN (1, 2)
                    LEFT JOIN tax r5 ON r5.id = r4.tax_id AND r5.op_id IN (1, 2)
                    WHERE z.op_id IN (1, 2)
                    GROUP BY z.id
                ) r6 ON r6.id = r1.id
                JOIN unit r7 ON r7.id = r3.unit_id AND r7.op_id IN (1, 2)
                LEFT JOIN (
                    SELECT * FROM productCode
                    WHERE op_id IN (1, 2)
                    GROUP BY product_id
                    ORDER BY dc DESC, id DESC
                ) r8 on r8.product_id = r4.id
                JOIN person r9 ON r9.id = r1.person_id AND r9.op_id IN (1, 2)
                ORDER BY r4.id, r1.id
            `;
            let transactionItem = await compile(`
                SELECT * FROM (${transactionItemQuery}) sales ${
                    adtQuery.indexOf('where') > 0 ? adtQuery.substr(adtQuery.indexOf('where')).replace(/WTF\./g, '') : ''
                }
            `);
            let total = await compile(`
                SELECT COUNT(*) xy FROM (${transactionItemQuery}) sales ${
                    (adtQuery.indexOf('where') > 0 ? adtQuery.substr(adtQuery.indexOf('where')).replace(/WTF\./g, '') : '')
                    .replace(/limit\s[0-9]+|offset\s[0-9]+/g, '')
                }
            `);
            res.send({status, message, total: total[0].xy, data: transactionItem});
        } catch (e) {
            if (e.message.indexOf('Unexpected token') === 0) {
                let error = 'Invalid query string for filter value, it should be JSON format. ' + e.message;
                next(new Error(error));
            } else next(e);
        }
    });
    return route;
};