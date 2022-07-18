const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const { BucketPermission } = require('../../db/models');
const { Permissions } = require('../../components/constants');
const user = require('../user');


/**
 * The Permission DB Service
 */
const service = {
  /**
   * @function addPermissions
   * Grants object permissions to users
   * @param {string} bucketId The objectId uuid
   * @param {object[]} data Incoming array of `userId` and `permCode` tuples to add for this `objId`
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  addPermissions: async (bucketId, data, currentUserId = SYSTEM_USER, etrx = undefined) => {
    if (!bucketId) {
      throw new Error('Invalid objId supplied');
    }
    if (!data || !Array.isArray(data) || !data.length) {
      throw new Error('Invalid data supplied');
    }

    let trx;
    try {

      let obj = [];

      for (let perm of data){
        let fecthedUser = await user.readUserByEmail(perm.email);
        const currentPerms = await service.searchPermissions({ bucketId, userId:fecthedUser.userId });
        perm.permissions
        // Ensure all codes are upper cased
        .map(p => ({userId:fecthedUser.userId, code: p.permCode.toUpperCase().trim() }))
        // Filter out any invalid code values
        .filter(p => Object.values(Permissions).some(perm => perm === p.code))
        // Filter entry tuples that already exist
        .filter(p => !currentPerms.some(cp => cp.userId === p.userId && cp.permCode === p.code))
        // Create DB objects to insert
        .forEach(p => {obj.push({
          id: uuidv4(),
          userId: p.userId,
          bucketId: bucketId,
          permCode: p.code,
          createdBy: currentUserId,
        })});
      }

      trx = etrx ? etrx : await BucketPermission.startTransaction();

    // Insert missing entries
    if (obj.length) {
      response = await BucketPermission.query(trx).insertAndFetch(obj);
    }
    if (!etrx) await trx.commit();
    return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function removePermissions
   * Deletes object permissions for a user
   * @param {string} bucketId The objectId uuid
   * @param {object[]} data Incoming array of `email` and `permCode` tuples to add for this `bucketId`
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  removePermissions: async (bucketId, data, etrx = undefined) => {
    if (!bucketId) {
      throw new Error('Invalid objId supplied');
    }
    if (!data || !Array.isArray(data) || !data.length) {
      throw new Error('Invalid data supplied');
    }

    let trx;

    try {
      
      let obj = [];

      trx = etrx ? etrx : await BucketPermission.startTransaction();

      for (let perm of data) {
        let fecthedUser = await user.readUserByEmail(perm.email);
        perm.permissions
        .map(p => ({userId:fecthedUser.userId, code: p.permCode.trim() }))
        .forEach(p => {obj.push([
          p.userId,
          bucketId,
          p.code,
        ])})
      }

      const response = await BucketPermission.query(trx)
        .delete()
        .whereInComposite(['userId','bucketId','permCode'],obj)
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*');
      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  
   /**
   * @function searchPermissions
   * Search and filter for specific bucket permissions
   * can also search and filter user permissions on specific bucket
   * @param {string|string[]} [params.userId] Optional string or array of uuids representing the user
   * @param {string|string[]} [params.bucketId] Optional string or array of uuid representing the object
   * * @param {string|string[]} [params.permCode] Optional string or array of all permissions
   * @returns {Promise<object>} The result of running the find operation
   */
    searchPermissions: (params) => {
      return BucketPermission.query()
      .modify('filterPermissionCode', params.permCode)
      .modify('filterBucketId', params.bucketId)
      .modify('filterUserId', params.userId)
    }
};

module.exports = service;
