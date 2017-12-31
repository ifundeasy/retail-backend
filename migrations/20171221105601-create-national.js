exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('national', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        iso2: {
            type: sequelize.STRING(2),
            allowNull: false,
            defaultValue: ''
        },
        iso3: {
            type: sequelize.STRING(3),
            allowNull: false
        },
        numcode: {
            type: sequelize.INTEGER(5).UNSIGNED,
            allowNull: true
        },
        name: {
            type: sequelize.STRING(50),
            allowNull: false,
            defaultValue: ''
        },
        phonecode: {
            type: sequelize.STRING(3),
            allowNull: true
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
    return queryInterface.dropTable('national');
};