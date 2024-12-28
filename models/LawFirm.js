module.exports = (sequelize, DataTypes) => {
    const LawFirm = sequelize.define('LawFirm', {
        lawFirmDetails: {
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
        createdBy: {
            type: DataTypes.INTEGER,
            references: {
                model: 'Users',
                key: 'id'
            }
        }
    }, {
        indexes: [
            {
                unique: true,
                fields: [sequelize.literal('("lawFirmDetails"->\'contactInfo\'->\'email\')')],
                name: 'law_firm_email_idx'
            }
        ]
    });

    LawFirm.associate = (models) => {
        LawFirm.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator'
        });
    };

    return LawFirm;
};
