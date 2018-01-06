exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('purchasePayment', {
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
        paymethod_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'paymethod',
                key: 'id'
            }
        },
        number: {
            type: sequelize.STRING(20),
            allowNull: true
        },
        total: {
            type: "DOUBLE",
            allowNull: false,
            defaultValue: '0'
        },
        value: {
            type: "DOUBLE",
            allowNull: false,
            defaultValue: '0'
        },
        change: {
            type: "DOUBLE",
            allowNull: false,
            defaultValue: '0'
        },
        tip: {
            type: "DOUBLE",
            allowNull: false,
            defaultValue: '0'
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
    return queryInterface.dropTable('purchasePayment');
};