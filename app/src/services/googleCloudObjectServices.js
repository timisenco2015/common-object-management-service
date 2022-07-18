const busboy = require('busboy');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  getCurrentSubject,
  getPath,
  isObject,
  getCurrentSubjectEmail
} = require('../components/utils');

const  {Readable} = require('stream');
const {googleCloudStorageService} = require('../services/storages')
const { objectService, versionService, bucketService } = require('../services');

const SERVICE = 'ObjectService';

/**
 * The Google Object Service
 */
 const service = {

    /**
   * @function _setGCSHeaders
   * Accepts a typical GCS response object and inserts appropriate express response headers
   * @param {object} s3Resp S3 response object
   * @param {object} res Express response object
   */
     _setGCSHeaders(gcsResp, res) {
      // TODO: Consider looking around for express-based header middleware
      if (gcsResp.cacheControl) res.set('Cache-control', gcsResp.cacheControl);
      if (gcsResp.componentCount) res.set('Component-count', gcsResp.componentCount);
      if (gcsResp.contentDisposition) res.set('Content-disposition', gcsResp.contentDisposition);
      if (gcsResp.contentEncoding) res.set('Content-encoding', gcsResp.contentEncoding);
      if (gcsResp.contentLanguage) res.set('Content-language', gcsResp.contentLanguage);
      if (gcsResp.contentType) res.set('Content-type', gcsResp.contentType);
      if (gcsResp.customTime) res.set('Custom-time', gcsResp.customTime);
      if (gcsResp.crc32c) res.set('Crc-32c', gcsResp.crc32c);
      if (gcsResp.etag) res.set('E-Tag', gcsResp.etag);
      if (gcsResp.generation) res.set('Generation', gcsResp.generation);
      if (gcsResp.id) res.set('Id', gcsResp.id);
      if (gcsResp.kmsKeyName) res.set('Kms-keyName', gcsResp.kmsKeyName);
      if (gcsResp.md5Hash) res.set('MD5Hash', gcsResp.md5Hash);
      if (gcsResp.mediaLink) res.set('Media-Link', gcsResp.mediaLink);
      if (gcsResp.metageneration) res.set('Meta-generation', gcsResp.metageneration);
      if (gcsResp.name) res.set('Name', gcsResp.name);
      if (gcsResp.size) res.set('Size', gcsResp.size);
      if (gcsResp.storageClass) res.set('Storage-class', gcsResp.storageClass);
      if (gcsResp.timeCreated) res.set('Time-created', gcsResp.timeCreated);
      if (gcsResp.updated) res.set('Last-metadata-update', gcsResp.updated);
      if (gcsResp.rpo) res.set('Turbo-replication', gcsResp.rpo);
      if(gcsResp.temporaryHold) {
         res.set('Temporary-hold', 'enabled');
      } else {
        res.set('Temporary-hold', 'disabled');
      }
      if(gcsResp.eventBasedHold) {
        res.set('Event-basedHold', 'enabled');
      } else {
       res.set('Event-basedHold', 'disabled');
      }
      if (gcsResp.retentionExpirationTime) res.set('Retention-expiration-time', gcsResp.retentionExpirationTime);
      
      if (gcsResp.metadata) {
        for (const key in metadata.metadata) {
          res.set(key, metadata.metadata[key]);
        }
      }
    },
  

  /**
   * @function createBucket
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async createBucket(req, res, next) {
    try {

      let email = getCurrentSubjectEmail(req.currentUser);

      if(!isObject(req.body)) {
        throw new Error('empty object passed');
      }
      const data = req.body;
      const bucketName = data.bucketName;
      const location = data.location;
      const storageClass = data.storageClass;
      const id = uuidv4();

      const createContainerResponse = await googleCloudStorageService.createBucket({bucketName, location, storageClass})

      if(createContainerResponse) {
        const response = await bucketService.create({bucketName: data.bucketName,
          id:id,
          provider: "Cloud Storage",
          public: data.public,
          email: email});

        res.status(200).json(response);
      }
    } catch (e) {
        next(errorToProblem(SERVICE, e));
    }
  },
  /**
   * @function streamUploadObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async streamUploadObject(req, res, next) {
    try {

      const userId = getCurrentSubject(req.currentUser);
      const bucketName = req.currentBucket&&req.currentBucket.bucketName;
      const bucketId = req.currentBucket&&req.currentBucket.id
      const objId = uuidv4();
      const keyId = getPath(objId);
      var arr =[];
      let buff;
      const uploadOptions={};
      const bb = busboy({ headers: req.headers });
   
      //const userId = getCurrentSubject(req.currentUser);
      bb.on('file', async (name, stream, info) => {
        uploadOptions.id = objId;
        uploadOptions.fieldName = name;
        uploadOptions.mimeType = info.mimeType;
        uploadOptions.originalName = info.filename;
        uploadOptions.bucketId = bucketId

        for await (const chunk of stream) {
          arr.push(chunk);
          buff = Buffer.concat(arr);
        }
     
    });
    bb.on('close', async () => {

     await googleCloudStorageService.streamUploadObject({bucketName, keyId, buff});
      const [metadata] = await googleCloudStorageService.getBucketMetadata({bucketName, keyId});
      const createdObject =  await objectService.create({ ...uploadOptions, path: getPath(objId), userId });
      if(metadata.generation) {
        await versionService.create([{id:objId, VersionId:metadata.generation, originalName:uploadOptions.originalName, mimeType: uploadOptions.mimeType, deleteMarker: false}], userId);
      }
      else {
        await versionService.create([{id:objId, VersionId:null, originalName:uploadOptions.originalName, mimeType: uploadOptions.mimeType, deleteMarker: false}], userId);
      }
      res.status(200).json(createdObject); 

    });
    req.pipe(bb);
      
    } catch (e) {
        next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function toggleBucketVersionin
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async toggleBucketVersioning(req, res ,next) {
    try {
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
      const isVersioningEnabled = req.params.isVersioningEnabled;
      let result = await googleCloudStorageService.toggleBucketVersioning({bucketName, isVersioningEnabled});
      res.status(200).json(result);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

   /**
   * @function readObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
    async readObject(req, res, next) {
      try {
  
        const objPath = req.currentObject.path;
        const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
      
        const downloadBlockBlobResponse = await googleCloudStorageService.downloadIntoMemory({bucketName, objPath});
        
        const buff = Buffer.concat(downloadBlockBlobResponse);
        
        const readable = new Readable();

        readable.push(buff);

        readable.push(null);

        readable.pipe(res);
        
      
        res.status(200);
        
      } catch (e) {
        next(errorToProblem(SERVICE, e));
      }
    },

    /**
   * @function updateObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async updateObject(req, res, next) {
    try {

      const objId = req.params.objId;
      const keyId = req.currentObject.path;
      var arr =[];
      let buff;
      const uploadOptions={};
      const bb = busboy({ headers: req.headers });
      const userId = getCurrentSubject(req.currentUser);
      const bucketName = req.currentBucket&&req.currentBucket.bucketName;
      const bucketId = req.currentBucket&&req.currentBucket.id
   
      //const userId = getCurrentSubject(req.currentUser);
      bb.on('file', async (name, stream, info) => {
        uploadOptions.id = objId;
        uploadOptions.fieldName = name;
        uploadOptions.mimeType = info.mimeType;
        uploadOptions.originalName = info.filename;
        uploadOptions.bucketId = bucketId

        for await (const chunk of stream) {
          arr.push(chunk);
          buff = Buffer.concat(arr);
        }
     
    });
    bb.on('close', async () => {

     let t = await googleCloudStorageService.streamUploadObject({bucketName, keyId, buff});
     const [metadata] = await googleCloudStorageService.getBucketMetadata({bucketName, keyId});
      const createdObject =  await objectService.update({ ...uploadOptions, path: keyId, userId });
     if(metadata.generation) {
        await versionService.create([{id:objId, VersionId:metadata.generation, originalName:uploadOptions.originalName, mimeType: uploadOptions.mimeType, deleteMarker: false}], userId);
      }
      else{

      }

       // if versioning enabled, create new version in DB
      if (s3Response.VersionId) {
        object.data.VersionId = s3Response.VersionId;
        await versionService.create([object.data], userId);
      } else {

        // else update existing null-version
        await versionService.update({id:objId, mimeType: uploadOptions.mimeType, originalName:uploadOptions.originalName }, userId);
      }
      
      res.status(200).json(createdObject); 

    });
    req.pipe(bb);
      
    } catch (e) {
        next(errorToProblem(SERVICE, e));
    }
  },


  /**
   * @function deleteObject
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async deleteObject(req, res, next) {
    try {
      const objId = req.params.objId;
      const generation = req.query.generation;
      const objPath = req.currentObject.path;
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
      if(generation) {
        await googleCloudStorageService.deleteObject({bucketName, objPath, generation});
        await versionService.delete(objId, generation);
      }
      else {
        await googleCloudStorageService.deleteObject({bucketName, objPath, generation});
        await versionService.delete(objId, null);
      }
   
      const remainingVersions = await versionService.list(objId);
      if (remainingVersions.length === 0) await objectService.delete(objId);
      
    
      res.status(200).json({message:"Object sucessfully deleted"});
      
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function getBucketMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async getBucketMetadata(req, res, next) {
    try {
     
      const objPath = req.currentObject.path;
      const bucketName = req.currentBucket.bucketName;
     
      const [metadata] = await googleCloudStorageService.getBucketMetadata({bucketName, objPath});

      service._setGCSHeaders(metadata, res);
      res.status(204).end();

      
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function addMetadata
   * Creates a new version of the object via copy with the new metadata added
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
  */
   async addMetadata(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;

      const [metadata] = await googleCloudStorageService.getBucketMetadata({bucketName, objPath});

      const metadataToAppend = getMetadata(req.headers);
      if (!Object.keys(metadataToAppend).length) {
        // TODO: Validation level logic. To be moved.
        // 422 when no keys present
        res.status(422).end();
      }
      else {

        const data = {
          ...metadata,  // Take existing metadata first
          ...metadataToAppend, // Append new metadata
          id: latest.Metadata.id // Always enforce id key behavior
        };

        const [response] = await googleCloudStorageService.setObjectMetadata({data, bucketName,objPath});
        service._setS3Headers(response, res);
        res.status(204).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = service;

