const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany, filterILike } = require('../utils');


class Bucket extends Timestamps(Model) {
  static get tableName() {
    return 'bucket';
  }

  static get relationMappings() {
    const BucketPermission = require('./bucketPermission');
    

    return {
      bucketPermission: {
        relation: Model.HasManyRelation,
        modelClass: BucketPermission,
        join: {
          from: 'bucket.id',
          to: 'bucket_permission.bucketId'
        }
      },
      bucket: {
        relation: Model.HasManyRelation,
        modelClass: Bucket,
        join: {
          from: 'bucket.id',
          to: 'ObjectModel.bucketId'
        }
      }
    };
  }

  static get modifiers() {
    const BucketPermission = require('./bucketPermission');

    return {
      filterIds(query, value) {
        filterOneOrMany(query, value, 'id');
      },
      filterBucketName(query, value) {
        filterILike(query, value, 'bucketName');
      },
      filterProvider(query, value) {
        filterILike(query, value, 'provider');
      },
     
      filterPublic(query, value) {
        if (value !== undefined) query.where('public', value);
      },
      filterActive(query, value) {
        if (value !== undefined) query.where('active', value);
      },
      filterUserId(query, value) {
        if (value) {
          query.whereIn('id', BucketPermission.query()
            .distinct('bucketId')
            .where('userId', value));
        }
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'bucketName', 'provider'],
      properties: {
        id: { type: 'string', minLength: 1, maxLength: 255 },
        bucketName: { type: 'string', minLength: 1, maxLength: 255 },
        provider: { type: 'string', minLength: 1, maxLength: 255 },
        public: { type: 'boolean' },
        active: { type: 'boolean' },
        ...stamps
      },
      additionalProperties: false
    };
  }

}

module.exports = Bucket;
