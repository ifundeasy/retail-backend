exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('personAddress', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        value: {
            type: sequelize.STRING(50),
            allowNull: false,
            defaultValue: ''
        },
        person_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'person',
                key: 'id'
            }
        },
        village_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            references: {
                model: 'village',
                key: 'id'
            }
        },
        latitude: {
            type: sequelize.FLOAT,
            allowNull: false
        },
        longitude: {
            type: sequelize.FLOAT,
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
    return queryInterface.dropTable('personAddress');
};