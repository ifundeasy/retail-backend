exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('media', {
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
        TABLENAME: {
            type: sequelize.STRING(20),
            allowNull: false,
            defaultValue: ''
        },
        TABLENAME_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false
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
    return queryInterface.dropTable('media');
};