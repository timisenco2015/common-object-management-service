const errorToProblem = require('../components/errorToProblem');
const objectStorageAdapter = require('../services/objectStorageAdapter');
const {bucketService} = require('../services');
const {stringToBoolean} = require('../components/utils');


const SERVICE = 'ObjectService';


/**
 * The Object Controller
*/
const controller = {
  

  /**
   * @function createBucket
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
  */
  async createBucket(req, res, next) {
  
    
    try { 
      return await objectStorageAdapter.createBucket(req, res, next);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


  /**
   * @function listBuckets
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async listBuckets(req, res, next) {
    try {
     let buckets = await bucketService.list();
     res.status(200).json(buckets);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function getBucket
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async getBucket(req, res, next) {
    try {
      let bucketId = req.params.bucketId;
      let bucket = await bucketService.read(bucketId);
      res.status(200).json(bucket);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function publicToggle
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async publicToggle(req, res, next) {
    try {
      let bucketId = req.params.bucketId;
      let isPublic = stringToBoolean(req.params.isPublic);
      let bucket = await bucketService.publicToggle(bucketId, isPublic);
      res.status(200).json(bucket);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


  
  /**
   * @function toggleBucketVersioning
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async toggleBucketVersioning(req, res, next) {
    try {
      await objectStorageAdapter.toggleBucketVersioning(req, res, next);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


  


};

module.exports = controller;