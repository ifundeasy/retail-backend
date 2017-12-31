exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('code', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        TABLENAME: {
            type: sequelize.STRING(20),
            allowNull: true
        },
        value: {
            type: sequelize.STRING(30),
            allowNull: false,
            defaultValue: ''
        },
        count: {
            type: sequelize.INTEGER(11).UNSIGNED,
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
    return queryInterface.dropTable('code');
};