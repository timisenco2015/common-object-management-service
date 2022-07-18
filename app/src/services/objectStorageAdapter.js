const config = require('config');

const {addDashesToUuid,
          getCurrentSubject,
          isTruthy,
          mixedQueryToArray,
        } = require('../components/utils');
const { objectService} = require('../services');
const s3ObjectService = require('../services/s3ObjectService');
const azureObjectService = require('../services/azureObjectService');
const googleCloudObjectServices = require('../services/googleCloudObjectServices');
const iBMObjectService = require('../services/iBMObjectService');
const digitalOceanObjectService = require('../services/digitalOceanObjectService')

class ObjectStorageAdapter {
  constructor(storageService) {
    this._storageService = storageService;
  }


  /*putObject(imageData) {
    switch(this._storageService) {
      case 'Cloud Storage':
        cloudStorageService.uploadObject(imageData);
        break;
      case 'Azure BLOB':
        azureStorageService.uploadObject(imageData);
        break;
      case 'S3':
        s3StorageService.uploadSinglePartObject(imageData);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.uploadSinglePartObject(imageData);
        break;
      default:
        // code block
    }
  }
*/

  /**
   * @function updateObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
  */
  updateObject(req, res, next) {
    switch(this._storageService) {
      case 'Azure BLOB':
        azureObjectService.updateObject(req, res, next);
        break;
      case 'S3':
        s3ObjectService.updateObject(req, res, next);
        break;
      case 'Cloud Storage':
        googleCloudObjectServices.updateObject(req, res, next);
        break;
      case 'IBM Storage':
        iBMObjectService.updateObject(req, res, next);
        break;
      case 'S3':
        digitalOceanObjectService.updateObject(req, res, next);
      default:
        // code block   
    }
  }

  /**
   * @function putMultipartObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
  */
  async putMultipartObject(req, res, next) {
    switch(this._storageService) {
     case 'Cloud Storage':
        await googleCloudObjectServices.streamUploadObject(req, res, next);
        break;
      case 'Azure BLOB':
        await azureObjectService.createBlobFromReadStream(req, res, next);
        break;
      case 'S3':
        await s3ObjectService.createObjects(req, res, next);
        break;
      case 'DigitalOcean Storage':
        await digitalOceanObjectService.createObjects(req, res, next);
        break;
      case 'IBM Storage':
        await iBMObjectService.createObjects(req, res, next);
        break;
      default:
        // code block
    }
  }
  

  /**
   * @function getObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async getObject(req, res, next) {
    switch(this._storageService) {
      case 'Cloud Storage':
        googleCloudObjectServices.readObject(req, res, next);
        break;
      case 'Azure BLOB':
        azureObjectService.readObject(req, res, next);
        break;
      case 'S3':
        await s3ObjectService.readObject(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.readObject(req, res, next);
        break;
      case 'IBM Storage':
        await iBMObjectService.readObject(req, res, next);
        break;
      default:
        // code block
    }
  }

  /**
   * @function searchObjects
   * Search and filter for specific objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async searchObjects(req, res, next) {
    // TODO: Handle no database scenarios via S3 ListObjectsCommand?
    // TODO: Consider metadata/tagging query parameter design here?
    // TODO: Consider support for filtering by set of permissions?
    // TODO: handle additional parameters. Eg: deleteMarker, latest
    try {
      const objIds = mixedQueryToArray(req.query.objId);
      const params = {
        id: objIds ? objIds.map(id => addDashesToUuid(id)) : objIds,
        originalName: req.query.originalName,
        path: req.query.path,
        mimeType: req.query.mimeType,
        public: isTruthy(req.query.public),
        active: isTruthy(req.query.active)
      };

      // When using OIDC authentication, force populate current user as filter if available
      if (authMode === AuthMode.OIDCAUTH || authMode === AuthMode.FULLAUTH) {
        params.userId = getCurrentSubject(req.currentUser);
      }

      const response = await objectService.searchObjects(params);
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * @function addMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  addMetadata(req, res, next) {
    switch(this._storageService) {
      case 'S3':
        s3ObjectService.addMetadata(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.addMetadata(req, res, next);
        break;
      case 'Azure BLOB':
        azureObjectService.setBlobMetadata(req, res, next);
        break;
      
    }
  }


  /**
   * @function getBucketMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   getBucketMetadata(req, res, next) {
    switch(this._storageService) {
      case 'Cloud Storage':
        googleCloudObjectServices.getBucketMetadata(req, res, next);
        break;
      default:
        // code block
    }
  }


  
  
  /**
   * @function deleteMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  deleteMetadata(req, res, next) {
    switch(this._storageService) {
      case 'S3':
        s3ObjectService.deleteMetadata(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.deleteMetadata(req, res, next);
        break;
      case 'Azure BLOB':
        azureObjectService.setBlobMetadata(req, res, next);
        break;
    }
  }

  /**
   * @function replaceMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  replaceMetadata(req, res, next) {
    switch(this._storageService) {
      case 'S3':
        s3ObjectService.replaceMetadata(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.replaceMetadata(req, res, next);
        break;
      case 'Azure BLOB':
        azureObjectService.setBlobMetadata(req, res, next);
        break;
    }
  }

  listObjectVersion(req, res, next) {
    switch(this._storageService) {
      case 'S3':
        s3ObjectService.listObjectVersion(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.listObjectVersion(req, res, next);
        break;
    }
  }


  /**
   * @function toggleBucketVersioning
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  toggleBucketVersioning (req, res, next) {
    switch(this._storageService) {
      case 'Cloud Storage':
        googleCloudObjectServices.toggleBucketVersioning(req, res, next);
        break;
      
    }
  }

  /**
   * @function togglePublic
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async togglePublic(req, res, next) {
    try {
      const userId = getCurrentSubject(req.currentUser, SYSTEM_USER);
      const data = {
        id: addDashesToUuid(req.params.objId),
        public: isTruthy(req.query.public),
        updatedBy: userId
      };

      const response = await objectService.update(data);

      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  }



  
  /**
   * @function headObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  headObject (req, res ,next) {
    switch(this._storageService) {
      case 'S3':
        s3ObjectService.headObject(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.headObject(req, res, next);
        break;
    }
  }

  /**
   * @function headObject
   * Sets the public fdeleteObjectlag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  deleteObject(req, res, next) {
    switch(this._storageService) {
      case 'Cloud Storage':
        googleCloudObjectServices.deleteObject(req, res, next);
        break;
      case 'Azure BLOB':
        azureObjectService.deleteObject(req, res, next);
        break;
      case 'S3':
        s3ObjectService.deleteObject(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.deleteObject({objId,objPath});
        break;
      case 'IBM Storage':
        iBMObjectService.deleteObject(req, res, next);
        break;
      default:
        // code block
    }
  }

 /* listObjects(folderpath) {
    switch(this._storageService) {
      case 'Cloud Storage':
        cloudStorageService.listFilesByPrefix({folderpath});
        break;
      case 'Azure BLOB':
        azureStorageService.listObject({folderpath});
        break;
      case 'S3':
        s3StorageService.listObjects({folderpath});
        break;
      case 'IBM Storage':
        iBMStorageService.listObjects({folderpath});
        break;
      default:
        // code block
    }

  }
  */

  /**
   * @function createBucket
   * Sets the public fdeleteObjectlag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  createBucket(req, res, next) {
    switch(this._storageService) {
      case 'Azure BLOB':
        azureObjectService.createBucket(req, res, next);
        break;
      case 'IBM Storage':
        iBMObjectService.createBucket(req, res, next);
        break;
      case 'S3':
        s3ObjectService.createBucket(req, res, next);
        break;
      case 'Cloud Storage':
        googleCloudObjectServices.createBucket(req, res, next);
        break;
      case 'DigitalOcean Storage':
        digitalOceanObjectService.createBucket(req, res, next);
        break;
      default:
        // code block
    }

  }
  getSignedUrl() {

  }
 

}

const storageService = config.get('objectStorage.storageService');

let objectStorageAdapter = new ObjectStorageAdapter(storageService);
module.exports = objectStorageAdapter 
