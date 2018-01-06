exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('purchaseItem', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        purchase_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'purchase',
                key: 'id'
            }
        },
        purchaseItem_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: true,
            references: {
                model: 'purchaseitem',
                key: 'id'
            }
        },
        qty: {
            type: sequelize.INTEGER(11),
            allowNull: false
        },
        productPurchase_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'productpurchase',
                key: 'id'
            }
        },
        person_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'person',
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
            allowNull: true,
            defaultValue: ''
        }
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.dropTable('purchaseItem');
};