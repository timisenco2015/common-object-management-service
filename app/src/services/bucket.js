
const { Permissions } = require('../components/constants');
const { BucketModel } = require('../db/models');
const bucketPermission = require('./permissions/bucketPermission');

/**
 * The Object DB Service
 */
const service = {

  
  /**
   * @function create
   * Create an object DB record and give the uploader (if authed) permissions
   * @param {string} data.id The object uuid
   * @param {string} data.bucketName The bucket's name
   * @param {string} data.provider the hosted storage service name
   * @param {boolean} [data.public] The optional public flag - defaults to true if undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  create: async (data, etrx = undefined) => {
    let trx;
    try {
      trx = etrx ? etrx : await BucketModel.startTransaction(); 
      // Add bucket record to DB
      const obj = {
        id:data.id,
        bucketName: data.bucketName,
        provider: data.provider,
        public: data.public,
        createdBy: data.email
      };
      let bucket = await BucketModel.query(trx).insert(obj);
      // Add all permission codes for the uploader
      if (bucket.id) {
        const perms = Object.values(Permissions).map(p=>({"permCode":p}));
        const autoGrantPermission = [{'email':data.email,'permissions':perms}];
        await bucketPermission.addPermissions(bucket.id, autoGrantPermission, data.email, trx);
      }
      if (!etrx) await trx.commit();
      return await service.read(bucket.id);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function list
   * List all buckets
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  list: async () => {
    try {
     
      return await BucketModel.query();

    } catch (err) {
      throw err;
    }
  },
  /**
   * @function read
   * List all buckets
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
   read: async (bucketId) => {
    try {
     
      return await BucketModel.query().findById(bucketId);

    } catch (err) {
      throw err;
    }
  },

  /**
   * @function publicToggle
   * List all buckets
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
   publicToggle: async (bucketId, isPublic) => {
    try {
     
      return await BucketModel.query().patchAndFetchById(bucketId, {
        public: isPublic
      });

    } catch (err) {
      throw err;
    }
  },

  
};

module.exports = service;
