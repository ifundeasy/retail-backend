exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('moduleRoute', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        module_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'module',
                key: 'id'
            }
        },
        TABLENAME: {
            type: sequelize.STRING(30),
            allowNull: true
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
    return queryInterface.dropTable('moduleRoute');
};