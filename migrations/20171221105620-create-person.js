exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('person', {
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
        username: {
            type: sequelize.STRING(20),
            allowNull: false,
            defaultValue: '',
            unique: true
        },
        password: {
            type: sequelize.STRING(128),
            allowNull: false,
            defaultValue: ''
        },
        salt: {
            type: sequelize.STRING(20),
            allowNull: false,
            defaultValue: ''
        },
        media_id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: true,
            references: {
                model: 'media',
                key: 'id'
            }
        },
        gender: {
            type: sequelize.ENUM('0', '1'),
            allowNull: false,
            defaultValue: '0'
        },
        loginCount: {
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
    return queryInterface.dropTable('person');
};