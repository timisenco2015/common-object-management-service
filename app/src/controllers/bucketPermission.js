const Problem = require('api-problem');

const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, getCurrentSubjectEmail, mixedQueryToArray } = require('../components/utils');
const { userService, bucketPermissionService } = require('../services');

const SERVICE = 'BucketPermissionService';

/**
 * The Permission Controller
 */
const controller = {
  /**
   * @function searchPermissions
   * Searches for all buckets with specified permissions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async searchPermissions(req, res, next) {
    try {

      let permCodes = undefined;
      let bucketIds = undefined;
      let userIds = undefined;
      
      if(req.body.permCodes && Array.isArray(req.body.permCodes)) {
        permCodes= req.body.permCodes.map(p=>p.permCode);
      }
        
      if(req.body.bucketIds && Array.isArray(req.body.bucketIds)) {
        bucketIds = req.body.bucketIds.map(p=>p.bucketId);
      }
        
      if (req.body.userIds && Array.isArray(req.body.userIds)) {
        userIds = req.body.userIds.map(p=>p.userId);
      }  
     
      const response = await bucketPermissionService.searchPermissions({
        permCode: mixedQueryToArray(permCodes),
        bucketId:mixedQueryToArray(bucketIds),
        userId:mixedQueryToArray(userIds),
      });
      res.status(200).json(response);
    
      
      
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function listPermissions
   * Returns the object permissions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async listPermissions(req, res, next) {
    try {
      let bucketId = req.params.bucketId;
      let userId = req.params.userId;
      let email = req.body.email;
      if(!userId && email){
        let user = await userService.readUserByEmail(email);
        userId = user.userId;
      }
      const response = await bucketPermissionService.searchPermissions({
        bucketId: addDashesToUuid(bucketId),
        userId: addDashesToUuid(userId),
      });
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function addPermissions
   * Grants object permissions to users
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async addPermissions(req, res, next) {
    try {
      // TODO: Do this kind of logic in validation layer/library instead
      if (!req.body || !Array.isArray(req.body) || !req.body.length) {
        return new Problem(422).send(res);
      }
      const email = getCurrentSubjectEmail(req.currentUser);
      const response = await bucketPermissionService.addPermissions(req.params.bucketId, req.body, email);
      res.status(201).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function removePermissions
   * Deletes object permissions for a user
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async removePermissions(req, res, next) {
    try {
      // TODO: Do this kind of logic in validation layer/library instead
      if (!req.body || !Array.isArray(req.body) || !req.body.length) {
        return new Problem(422).send(res);
      }
      const response = await bucketPermissionService.removePermissions(req.params.bucketId, req.body);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


};

module.exports = controller;
