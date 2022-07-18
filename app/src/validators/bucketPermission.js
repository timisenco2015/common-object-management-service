const { validate, Joi } = require('express-validation');
const { scheme, type } = require('./common');
const { Permissions } = require('../components/constants');

const schema = {
  searchPermissions: {
    body: Joi.object({
      permCodes: Joi.array().items(
        Joi.object().keys({
          permCode:Joi.string().max(255).required().valid(...Object.values(Permissions))})),
      userIds: Joi.array().items(
        Joi.object().keys({
          userId:scheme.guid })),
      bucketIds: Joi.array().items(
        Joi.object().keys({
          bucketId:scheme.guid }))
    })
  },

  listPermissions: {
    params: Joi.object({
      bucketId: scheme.guid,
      userId:scheme.guid
    }),
    body: Joi.object({
      email: type.email
     })
  },

  addPermissions: {
    params: Joi.object({
     bucketId: type.uuidv4
    }),
    body: Joi.array().items(
      Joi.object().keys({
        email: type.email.required(),
        permissions: Joi.array().items(Joi.object().keys({
            permCode:Joi.string().max(255).required().valid(...Object.values(Permissions))}))
      })
    ).required(),
  },

  removePermissions: {
    params: Joi.object({
      bucketId: type.uuidv4
     }),
     body: Joi.array().items(
       Joi.object().keys({
         email: type.email.required(),
         permissions: Joi.array().items(Joi.object().keys({
             permCode:Joi.string().max(255).required().valid(...Object.values(Permissions))}))
       })
      ).required(),
  },

};

const validator = {
  searchPermissions: validate(schema.searchPermissions, { statusCode: 422 }),
  listPermissions: validate(schema.listPermissions, { statusCode: 422 }),
  addPermissions: validate(schema.addPermissions, { statusCode: 422 }),
  removePermissions: validate(schema.removePermissions, { statusCode: 422 }),
};

module.exports = validator;
module.exports.schema = schema;
