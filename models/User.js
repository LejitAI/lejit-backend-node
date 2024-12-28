const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        law_firm: {
            type: DataTypes.STRING
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('lawyer', 'citizen'),
            defaultValue: 'citizen'
        },
        userType: {
            type: DataTypes.ENUM('citizen', 'corporate', 'lawfirm'),
            allowNull: false
        },
        validated: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        hooks: {
            beforeSave: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });

    User.prototype.matchPassword = async function(enteredPassword) {
        return await bcrypt.compare(enteredPassword, this.password);
    };

    User.associate = (models) => {
        User.hasMany(models.Case, {
            foreignKey: 'createdBy',
            as: 'cases'
        });
    };

    return User;
};
