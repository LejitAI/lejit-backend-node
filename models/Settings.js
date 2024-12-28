module.exports = (sequelize, DataTypes) => {
    const Settings = sequelize.define('Settings', {
        chatgptApiKey: {
            type: DataTypes.STRING,
            allowNull: true
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    });

    return Settings;
};
