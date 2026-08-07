/**
 * Paste into MongoDB Atlas: Data Explorer → UssrAuthentication → userAuthentication → Validation.
 *
 * Critical: with additionalProperties: false, you MUST declare _id — Mongo adds it on every insert.
 */
module.exports = {
  $jsonSchema: {
    bsonType: 'object',
    required: [
      'firstName',
      'lastName',
      'id',
      'password',
      'createdDate',
      'isActive',
      'tenantId',
    ],
    additionalProperties: false,
    properties: {
      _id: {
        bsonType: 'objectId',
        description: 'MongoDB document id (required in schema when additionalProperties is false)',
      },
      firstName: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 100,
      },
      lastName: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 100,
      },
      id: {
        bsonType: 'string',
        pattern: '^.+@.+\\..+$',
        description: 'Email (lowercase)',
      },
      password: {
        bsonType: 'string',
        minLength: 59,
        maxLength: 72,
        description: 'Bcrypt hash only',
      },
      createdDate: {
        bsonType: 'date',
      },
      isActive: {
        bsonType: 'bool',
      },
      tenantId: {
        bsonType: 'string',
        minLength: 1,
        maxLength: 48,
        pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
      },
    },
  },
};
