const Promise = require('bluebird');
exports.up = function (queryInterface, sequelize) {
    let name = 'transItemTax';
    let model = {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        transItem_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: true,
            reff: {
                model: 'transItem',
                key: 'id'
            }
        },
        productPriceTax_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            reff: {
                model: 'productPriceTax',
                key: 'id'
            }
        },
        person_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            reff: {
                model: 'person',
                key: 'id'
            }
        },
        op_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            defaultValue: 1,
            reff: {
                model: 'op',
                key: 'id'
            }
        },
        status_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            defaultValue: 1,
            reff: {
                model: 'status',
                key: 'id'
            }
        },
        dc: {
            type: sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        notes: {
            type: sequelize.STRING(50),
            allowNull: true,
            defaultValue: ''
        }
    };
    return Promise.all(
        Promise.mapSeries([0].concat(Object.keys(model).filter(function (key) {
            if (model[key].reff) return 1;
            return 0
        })), function (key) {
            if (key) {
                let field = model[key];
                return queryInterface.sequelize.query(`
                    ALTER TABLE \`${name}\`
                    ADD FOREIGN KEY (\`${key}\`)
                    REFERENCES \`${field.reff.model}\` (\`${field.reff.key}\`)
                    ON DELETE RESTRICT ON UPDATE CASCADE
                `);
            }
            return queryInterface.createTable(name, model);
        })
    );
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.dropTable('transItemTax');
};