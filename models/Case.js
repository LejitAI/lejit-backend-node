// models/Case.js
module.exports = (sequelize, DataTypes) => {
    const Case = sequelize.define('Case', {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        startingDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        caseType: {
            type: DataTypes.STRING,
            allowNull: false
        },
        client: {
            type: DataTypes.STRING,
            allowNull: false
        },
        oppositeClient: {
            type: DataTypes.STRING
        },
        caseWitness: {
            type: DataTypes.STRING
        },
        caseDescription: {
            type: DataTypes.TEXT
        },
        documents: {
            type: DataTypes.ARRAY(DataTypes.STRING)
        },
        createdBy: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        }
    }, {
        timestamps: true
    });

    Case.associate = (models) => {
        Case.belongsTo(models.User, {
            foreignKey: 'createdBy',
            as: 'creator'
        });
    };

    return Case;
};
