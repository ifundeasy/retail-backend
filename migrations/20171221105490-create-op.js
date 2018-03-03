exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('op', {
        id: {
            type: sequelize.INTEGER(11).UNSIGNED,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: sequelize.STRING(20),
            allowNull: false,
            defaultValue: ''
        },
        dc: {
            type: sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.dropTable('op');
};