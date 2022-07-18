const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');

// The table is "object" but Object is a bit of a reserved word :)
class ObjectModel extends Timestamps(Model) {
  static get tableName() {
    return 'object';
  }

  static get relationMappings() {
    const ObjectPermission = require('./objectPermission');
    const Bucket = require('./bucket');

    return {
      objectPermission: {
        relation: Model.HasManyRelation,
        modelClass: ObjectPermission,
        join: {
          from: 'object.id',
          to: 'object_permission.objectid'
        },
        object: {
          relation: Model.HasOneRelation,
          modelClass: Bucket,
          join: {
            from: 'object.bucketid',
            to: 'bucket.id'
          }
        }
      },
      
      
    };
  }

  static get modifiers() {
    const ObjectPermission = require('./objectPermission');

    return {
      filterIds(query, value) {
        filterOneOrMany(query, value, 'id');
      },
      filterOriginalName(query, value) {
        filterILike(query, value, 'originalName');
      },
      filterPath(query, value) {
        filterILike(query, value, 'path');
      },
      filterMimeType(query, value) {
        filterILike(query, value, 'mimeType');
      },
      filterPublic(query, value) {
        if (value !== undefined) query.where('public', value);
      },
      filterActive(query, value) {
        if (value !== undefined) query.where('active', value);
      },
      filterUserId(query, value) {
        if (value) {
          query.whereIn('id', ObjectPermission.query()
            .distinct('objectId')
            .where('userId', value));
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id',  'path',  'bucketId'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        bucketId:{ type: 'string', maxLength: 255 },
        path: { type: 'string', minLength: 1, maxLength: 1024 },
        public: { type: 'boolean' },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = ObjectModel;
