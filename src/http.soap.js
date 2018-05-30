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
const whereOrderLimit = function (sql) {
    let w = sql.indexOf('where');
    let o = sql.indexOf('order by');
    let l = sql.indexOf('order by');
    if (w > -1) return sql.substr(w).replace(/WTF\./g, '');
    if (o > -1) return sql.substr(o).replace(/WTF\./g, '');
    if (l > -1) return sql.substr(l).replace(/WTF\./g, '');
    return ''
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
                    z.id, z.name, z.product_id, z.dc, z.notes,
                    r1.id brand_id, r1.name brand_name, r1.dc brand_dc, r1.notes brand_notes,
                    r2.id productCode_id, r2.code productCode_code, r2.dc productCode_dc, r2.notes productCode_notes
                FROM product z
                LEFT JOIN brand r1 ON r1.id = z.brand_id AND r1.op_id IN (1, 2)
                LEFT JOIN (SELECT * FROM productCode ORDER BY dc DESC) r2 ON r2.product_id = z.id AND r2.op_id IN (1, 2)
                WHERE z.op_id IN (1, 2)
            `;
            let total, productIds = [],
                products = await compile(`SELECT * FROM (${productQuery}) product ${whereOrderLimit(adtQuery)}`);

            if (products.length) {
                let tags = await compile(`
                    SELECT
                        z.id, z.product_id, z.dc, z.notes,
                        r1.id tag_id, r1.name tag_name, r1.tag_id tag_tag_id, r1.dc tag_dc, r1.notes tag_notes
                    FROM productTag z
                    LEFT JOIN (SELECT * FROM tag ORDER BY dc DESC) r1 ON r1.id = z.tag_id AND r1.op_id IN (1, 2)
                `);

                products.forEach(function (product) {
                    if (productIds.indexOf(product.id) < 0) productIds.push(product.id);
                });

                let priceIds = [], prices = await compile(`
                    SELECT
                        z.id, r3.product_id, z.price, z.dc, z.notes,
                        r1.id type_id, r1.name type_name, r1.dc type_dc, r1.notes type_notes,
                        r2.id unit_id, r2.short unit_short, r2.name unit_name, r2.dc unit_dc, r2.notes unit_notes
                    FROM productPrice z
                    JOIN \`type\` r1 ON r1.id = z.type_id AND r1.op_id IN (1, 2)
                    JOIN \`unit\` r2 ON r2.id = z.unit_id AND r2.op_id IN (1, 2)
                    JOIN productCode r3 ON r3.id = z.productCode_id AND r3.op_id IN (1, 2)
                    WHERE r3.product_id IN (${productIds.join()}) AND z.op_id IN (1, 2) 
                    ORDER BY z.dc DESC
                `);

                prices.forEach(function (price) {
                    if (priceIds.indexOf(price.id) < 0) priceIds.push(price.id);

                    products.forEach(function (product) {
                        product.prices = product.prices || [];
                        if (product.id === price.product_id) {
                            product.prices.push(price)
                        }
                    })
                });

                tags.forEach(function (tag) {
                    products.forEach(function (product) {
                        product.tags = product.tags || [];
                        if (product.id === tag.product_id) {
                            product.tags.push(tag)
                        }
                    })
                });

                if (priceIds.length) {
                    let discounts = await compile(`
                        SELECT
                            z.id, z.productPrice_id, z.dc, z.notes,
                            r1.id discount_id, r1.name discount_name, r1.isPercent discount_isPercent, 
                            r1.value discount_value, r1.dc discount_dc, r1.notes discount_notes
                        FROM productPriceDisc z
                        JOIN discount r1 ON r1.id = z.discount_id AND r1.op_id IN (1, 2)
                        WHERE z.productPrice_id IN (${priceIds.join()}) AND z.op_id IN (1, 2)
                        ORDER BY z.dc DESC
                    `);
                    let taxes = await compile(`
                        SELECT
                            z.id, z.productPrice_id, z.dc, z.notes,
                            r1.id tax_id, r1.name tax_name, r1.isPercent tax_isPercent, 
                            r1.value tax_value, r1.dc tax_dc, r1.notes tax_notes
                        FROM productPriceTax z
                        JOIN tax r1 ON r1.id = z.tax_id AND r1.op_id IN (1, 2)
                        WHERE z.productPrice_id IN (${priceIds.join()}) AND z.op_id IN (1, 2)
                        ORDER BY z.dc DESC
                    `);
                    discounts.forEach(function (discount) {
                        prices.forEach(function (price) {
                            price.discounts = price.discounts || [];
                            if (price.id === discount.productPrice_id) {
                                price.discounts.push(discount)
                            }
                        })
                    });
                    taxes.forEach(function (tax) {
                        prices.forEach(function (price) {
                            price.taxes = price.taxes || [];
                            if (price.id === tax.productPrice_id) {
                                price.taxes.push(tax)
                            }
                        })
                    });
                }
            }

            total = await compile(`
                SELECT COUNT(*) xy FROM (${productQuery}) product
                ${whereOrderLimit(adtQuery).replace(/limit\s[0-9]+|offset\s[0-9]+/g, '')}
            `);
            res.send({status, message, total: total[0].xy, data: products});
        } catch (e) {
            if (e.message.indexOf('Unexpected token') === 0) {
                let error = 'Invalid query string for filter value, it should be JSON format. ' + e.message;
                next(new Error(error));
            } else next(e);
        }
    });
    route.get('/productSummary', authorizing, async function (req, res, next) {
        let {query} = req;
        let {status, message} = httpCode.OK;
        try {
            let adtQuery = qbuilder(getAdtQuery({table: 'WTF'}, query)).raw;
            let productQuery = `
                SELECT
                    z.id, z.name,
                    r1.name product_name,
                    r2.id brand_id, r2.name brand_name,
                    r3.productPrice_price, r3.productCode_code, r3.type_name, r3.unit_name, r3.unit_shortname,
                    r4.productPriceDisc_name, r4.productPriceDisc_value, r4.productPriceDisc_desc,
                    r5.productPriceTax_name, r5.productPriceTax_value, r5.productPriceTax_desc,
                    r6.productTag_name, r7.id status_id, r7.name status_name
                FROM product z
                LEFT JOIN product r1 ON r1.id = z.product_id AND r1.op_id IN (1, 2)
                JOIN brand r2 ON r2.id = z.brand_id AND r2.op_id IN (1, 2)
                LEFT JOIN (
                    SELECT
                        product_id,
                        GROUP_CONCAT(DISTINCT price SEPARATOR ', ') productPrice_price,
                        GROUP_CONCAT(DISTINCT productCode_code SEPARATOR ', ') productCode_code,
                        GROUP_CONCAT(DISTINCT type_name SEPARATOR ', ') type_name,
                        GROUP_CONCAT(DISTINCT unit_name SEPARATOR ', ') unit_name,
                        GROUP_CONCAT(DISTINCT unit_shortname SEPARATOR ', ') unit_shortname
                    FROM (
                        SELECT 
                            z.*, r1.product_id, r1.code productCode_code, r2.name type_name, r3.name unit_name, r3.short unit_shortname
                        FROM (SELECT * FROM productPrice WHERE op_id IN (1, 2) ORDER BY id DESC) z
                        JOIN productCode r1 ON r1.id = z.productCode_id AND r1.op_id IN (1, 2)
                        JOIN \`type\` r2 ON r2.id = z.type_id AND r2.op_id IN (1, 2)
                        JOIN unit r3 ON r3.id = z.unit_id AND r3.op_id IN (1, 2)
                        GROUP BY z.productCode_id, z.type_id, z.unit_id
                    ) z
                    GROUP BY product_id
                ) r3 ON r3.product_id = z.id
                LEFT JOIN (
                    SELECT
                        product_id,
                        GROUP_CONCAT(DISTINCT discount_name SEPARATOR ', ') productPriceDisc_name,
                        GROUP_CONCAT(DISTINCT discount_value SEPARATOR ', ') productPriceDisc_value,
                        GROUP_CONCAT(DISTINCT discount_desc SEPARATOR ', ') productPriceDisc_desc
                    FROM (
                        SELECT
                            r3.product_id,
                            r1.name discount_name, IF (r1.isPercent = '1', CONCAT(r1.value, '%'), r1.value) discount_value,
                            CONCAT(r1.name, ' (', IF (r1.isPercent = '1', CONCAT(r1.value, '%'), r1.value), ')') discount_desc
                        FROM productPriceDisc z
                        LEFT JOIN discount r1 ON r1.id = z.discount_id AND r1.op_id IN (1, 2)
                        LEFT JOIN productPrice r2 ON r2.id = z.productPrice_id AND r2.op_id IN (1, 2)
                        LEFT JOIN productCode r3 ON r3.id = r2.productCode_id AND r3.op_id IN (1, 2)
                        WHERE z.op_id IN (1, 2)
                    ) z
                    GROUP BY product_id
                ) r4 ON r4.product_id = z.id
                LEFT JOIN (
                    SELECT
                        product_id,
                        GROUP_CONCAT(DISTINCT tax_name SEPARATOR ', ') productPriceTax_name,
                        GROUP_CONCAT(DISTINCT tax_value SEPARATOR ', ') productPriceTax_value,
                        GROUP_CONCAT(DISTINCT tax_desc SEPARATOR ', ') productPriceTax_desc
                    FROM (
                        SELECT
                            r3.product_id,
                            r1.name tax_name, IF (r1.isPercent = '1', CONCAT(r1.value, '%'), r1.value) tax_value,
                            CONCAT(r1.name, ' (', IF (r1.isPercent = '1', CONCAT(r1.value, '%'), r1.value), ')') tax_desc
                        FROM productPriceTax z
                        LEFT JOIN tax r1 ON r1.id = z.tax_id AND r1.op_id IN (1, 2)
                        LEFT JOIN productPrice r2 ON r2.id = z.productPrice_id AND r2.op_id IN (1, 2)
                        LEFT JOIN productCode r3 ON r3.id = r2.productCode_id AND r3.op_id IN (1, 2)
                        WHERE z.op_id IN (1, 2)
                    ) z
                    GROUP BY product_id
                ) r5 ON r5.product_id = z.id
                LEFT JOIN (
                    SELECT product_id, GROUP_CONCAT(DISTINCT name SEPARATOR ', ') productTag_name
                    FROM (
                        SELECT z.tag_id tag_id1, r1.tag_id tag_id2, z.product_id, r1.name, z.op_id FROM productTag z
                        LEFT JOIN tag r1 ON r1.id = z.tag_id AND r1.op_id IN (1, 2)
                        UNION
                        SELECT r1.tag_id tag_id1, r2.tag_id tag_id2, z.product_id, r2.name, z.op_id FROM productTag z
                        LEFT JOIN tag r1 ON r1.id = z.tag_id AND r1.op_id IN (1, 2)
                        LEFT JOIN tag r2 ON r2.id = r1.tag_id AND r2.op_id IN (1, 2)
                        ORDER BY tag_id2, tag_id1
                    ) z
                    WHERE op_id IN (1, 2)
                    GROUP BY product_id
                ) r6 ON r6.product_id = z.id
                LEFT JOIN \`status\` r7 ON r7.id = z.status_id AND r7.op_id IN (1, 2)
                WHERE (z.op_id IN (1, 2))
                ORDER BY z.id DESC
            `;
            let products = await compile(`SELECT * FROM (${productQuery}) product ${whereOrderLimit(adtQuery)}`);
            let total = await compile(`
                SELECT COUNT(*) xy FROM (${productQuery}) product
                ${whereOrderLimit(adtQuery).replace(/limit\s[0-9]+|offset\s[0-9]+/g, '')}
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
                        GROUP BY trans_id
                    ) r2 ON r2.trans_id = z.id
                    GROUP BY z.id
                ) r1
                JOIN (
                    SELECT
                        z.id, (
                            r2.price - IF(r3.discount, r3.discount, 0) + IF(r4.tax, r4.tax, 0)
                        ) * r1.qty * IF(r1.transItem_id IS NOT NULL, -1, 1) TOTAL
                    FROM trans z
                    LEFT JOIN transItem r1 ON r1.trans_id = z.id AND r1.op_id IN (1, 2)
                    LEFT JOIN productPrice r2 ON r2.id = r1.productPrice_id AND r2.op_id IN (1, 2)
                    LEFT JOIN (
                        SELECT
                            z.id, z.transItem_id,
                            SUM(IF(r4.isPercent = 1, r4.value, r4.value/100 * r1.price)) discount
                        FROM transItem z
                        JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                        LEFT JOIN transItemDisc r2 ON r2.transItem_id = z.id AND r2.op_id IN (1, 2)
                        LEFT JOIN productPriceDisc r3 ON r3.id = r2.productPriceDisc_id AND r3.op_id IN (1, 2)
                        LEFT JOIN discount r4 ON r4.id = r3.discount_id AND r4.op_id IN (1, 2)
                        WHERE z.op_id IN (1, 2)
                        GROUP BY z.id
                    ) r3 ON r3.id = r1.id
                    LEFT JOIN (
                        SELECT
                            z.id, z.transItem_id,
                            SUM(IF(r4.isPercent = 1, r4.value, r4.value/100 * r1.price)) tax
                        FROM transItem z
                        JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                        LEFT JOIN transItemTax r2 ON r2.transItem_id = z.id AND r2.op_id IN (1, 2)
                        LEFT JOIN productPriceTax r3 ON r3.id = r2.productPriceTax_id AND r3.op_id IN (1, 2)
                        LEFT JOIN tax r4 ON r4.id = r3.Tax_id AND r4.op_id IN (1, 2)
                        WHERE z.op_id IN (1, 2)
                        GROUP BY z.id
                    ) r4 ON r4.id = r1.id
                ) r2 ON r2.id = r1.id
                JOIN person r3 ON r3.id = person_id AND r3.op_id IN (1, 2)
                LEFT JOIN person r4 ON r4.id = subject_id AND r4.op_id IN (1, 2)
                GROUP BY r1.id
            `;
            let transaction = await compile(`SELECT * FROM (${transactionQuery}) sales ${whereOrderLimit(adtQuery)}`);
            let total = await compile(`
                SELECT COUNT(*) xy FROM (${transactionQuery}) sales
                ${whereOrderLimit(adtQuery).replace(/limit\s[0-9]+|offset\s[0-9]+/g, '')}
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
                    r5.id product_id, r5.name product_name, 
                    r3.price productPrice_price, r3.productCode_id, r9.code productCode_code,
                    qty, r1.qties, r3.unit_id, r8.name unit_name,
                    IF(r6.discount, r6.discount, 0) disc, IF(r7.tax, r7.tax, 0) tax,
                    (r3.price - IF(r6.discount, r6.discount, 0) + IF(r7.tax, r7.tax, 0)) * qty total,
                    r1.trans_id, r1.person_id, r10.name person_name, r1.notes
                FROM trans z
                JOIN (
                    SELECT 
                        z.*, IF(z.transItem_id IS NULL, r1.qty, NULL) qties
                    FROM transItem z
                    LEFT JOIN (
                        SELECT
                            z.id trans_id, r1.id, r1.transItem_id, r1.productPrice_id, sum(r1.qty) qty
                        FROM trans z
                        LEFT JOIN transItem r1 ON r1.trans_id = z.id AND r1.op_id IN (1, 2)
                        LEFT JOIN modifier r2 ON r2.id = r1.modifier_id AND r2.op_id IN (1, 2)
                        WHERE r1.transItem_id IS NOT NULL AND modifier_id IS NOT NULL
                        GROUP BY r1.productPrice_id, r1.transItem_id
                    ) r1 ON r1.productPrice_id = z.productPrice_id AND r1.trans_id = z.trans_id
                ) r1 ON r1.trans_id = z.id AND r1.op_id IN (1, 2)
                LEFT JOIN modifier r2 ON r2.id = r1.modifier_id AND r2.op_id IN (1, 2)
                JOIN productPrice r3 ON r3.id = r1.productPrice_id AND r3.op_id IN (1, 2)
                JOIN productCode r4 ON r4.id = r3.productCode_id AND r4.op_id IN (1, 2)
                JOIN product r5 ON r5.id = r4.product_id AND r5.op_id IN (1, 2)
                LEFT JOIN (
                    SELECT
	                    z.id, z.transItem_id,
                        SUM(IF(r4.isPercent = 1, r4.value, r4.value/100 * r1.price)) discount
                    FROM transItem z
                    JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                    LEFT JOIN transItemDisc r2 ON r2.transItem_id = z.id AND r2.op_id IN (1, 2)
                    LEFT JOIN productPriceDisc r3 ON r3.id = r2.productPriceDisc_id AND r3.op_id IN (1, 2)
                    LEFT JOIN discount r4 ON r4.id = r3.discount_id AND r4.op_id IN (1, 2)
                    WHERE z.op_id IN (1, 2)
    	            GROUP BY z.id
                ) r6 ON r6.id = r1.id
                LEFT JOIN (
                    SELECT
                        z.id, z.transItem_id,
                        SUM(IF(r4.isPercent = 1, r4.value, r4.value/100 * r1.price)) tax
                    FROM transItem z
                    JOIN productPrice r1 ON r1.id = z.productPrice_id AND r1.op_id IN (1, 2)
                    LEFT JOIN transItemTax r2 ON r2.transItem_id = z.id AND r2.op_id IN (1, 2)
                    LEFT JOIN productPriceTax r3 ON r3.id = r2.productPriceTax_id AND r3.op_id IN (1, 2)
                    LEFT JOIN tax r4 ON r4.id = r3.Tax_id AND r4.op_id IN (1, 2)
                    WHERE z.op_id IN (1, 2)
                    GROUP BY z.id
                ) r7 ON r7.id = r1.id
                JOIN unit r8 ON r8.id = r3.unit_id AND r8.op_id IN (1, 2)
                JOIN productCode r9 ON r9.id = r3.productCode_id AND r9.op_id IN (1, 2)
                JOIN person r10 ON r10.id = r1.person_id AND r10.op_id IN (1, 2)
                ORDER BY r1.id, r4.id
            `;
            let transactionItem = await compile(`SELECT * FROM (${transactionItemQuery}) sales ${whereOrderLimit(adtQuery)}`);
            let total = await compile(`
                SELECT COUNT(*) xy FROM (${transactionItemQuery}) sales
                ${whereOrderLimit(adtQuery).replace(/limit\s[0-9]+|offset\s[0-9]+/g, '')}
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