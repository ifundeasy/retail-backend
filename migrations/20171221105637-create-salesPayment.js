exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('salesPayment', {
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
            allowNull: true
        }
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.dropTable('salesPayment');
};