exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('product', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: sequelize.STRING(30),
            allowNull: false,
            defaultValue: ''
        },
        product_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: true,
            references: {
                model: 'product',
                key: 'id'
            }
        },
        brand_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: true,
            references: {
                model: 'brand',
                key: 'id'
            }
        },
        op_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            defaultValue: 1,
            references: {
                model: 'op',
                key: 'id'
            }
        },
        status_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            defaultValue: 1,
            references: {
                model: 'status',
                key: 'id'
            }
        },
        notes: {
            type: sequelize.STRING(50),
            allowNull: true
        }
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.dropTable('product');
};