const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const TeamMember = sequelize.define('TeamMember', {
        personalDetails: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        professionalDetails: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        bankAccountDetails: {
            type: DataTypes.JSONB,
            allowNull: false
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        createdBy: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Users',
                key: 'id'
            }
        }
    }, {
        hooks: {
            beforeSave: async (member) => {
                if (member.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    member.password = await bcrypt.hash(member.password, salt);
                }
            }
        },
        indexes: [
            {
                unique: true,
                fields: [sequelize.literal('("personalDetails"->\'email\')')],
                name: 'team_member_email_idx'
            }
        ]
    });

    TeamMember.associate = (models) => {
        TeamMember.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator'
        });
    };

    return TeamMember;
};
