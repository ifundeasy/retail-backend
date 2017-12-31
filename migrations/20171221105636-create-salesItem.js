exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('salesItem', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        sales_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'sales',
                key: 'id'
            }
        },
        salesItem_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: true,
            references: {
                model: 'salesitem',
                key: 'id'
            }
        },
        product_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'product',
                key: 'id'
            }
        },
        productPrice_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'productprice',
                key: 'id'
            }
        },
        qty: {
            type: sequelize.INTEGER(11),
            allowNull: false
        },
        person_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'person',
                key: 'id'
            }
        },
        status_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'status',
                key: 'id'
            }
        },
        notes: {
            type: sequelize.STRING(50),
            allowNull: true,
            defaultValue: ''
        }
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.dropTable('salesItem');
};