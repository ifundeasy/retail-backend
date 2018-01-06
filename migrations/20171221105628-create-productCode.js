exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('productCode', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: sequelize.STRING(30),
            allowNull: false,
            unique: true
        },
        product_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'product',
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
    return queryInterface.dropTable('productCode');
};