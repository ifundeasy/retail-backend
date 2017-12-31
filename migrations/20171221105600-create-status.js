exports.up = function (queryInterface, sequelize) {
    return queryInterface.createTable('status', {
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
        notes: {
            type: sequelize.STRING(50),
            allowNull: true,
            defaultValue: ''
        }
    });
};

exports.down = (queryInterface, Sequelize) => {
    return queryInterface.dropTable('status');
};