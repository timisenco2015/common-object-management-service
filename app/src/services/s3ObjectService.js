const busboy = require('busboy');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const { MAXCOPYOBJECTLENGTH, MetadataDirective } = require('../components/constants');
const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  getAppAuthMode,
  getCurrentSubject,
  getMetadata,
  getPath,
  getCurrentSubjectEmail
} = require('../components/utils');
const {s3StorageService} = require('../services/storages')
const { objectService, versionService, bucketService } = require('../services');

const SERVICE = 'ObjectService';

const authMode = getAppAuthMode();

/**
 * The S3 Service
 */
const service = {
  /**
   * @function _setS3Headers
   * Accepts a typical S3 response object and inserts appropriate express response headers
   * @param {object} s3Resp S3 response object
   * @param {object} res Express response object
   */
  _setS3Headers(s3Resp, res) {
    // TODO: Consider looking around for express-based header middleware
    if (s3Resp.ContentLength) res.set('Content-Length', s3Resp.ContentLength);
    if (s3Resp.ContentType) res.set('Content-Type', s3Resp.ContentType);
    if (s3Resp.ETag) res.set('ETag', s3Resp.ETag);
    if (s3Resp.LastModified) res.set('Last-Modified', s3Resp.LastModified);
    if (s3Resp.ServerSideEncryption) res.set('x-amz-server-side-encryption', s3Resp.ServerSideEncryption);
    if (s3Resp.VersionId) res.set('x-amz-version-id', s3Resp.VersionId);
    if (s3Resp.Metadata) {
      Object.entries(s3Resp.Metadata).forEach(([key, value]) => {
        res.set(`x-amz-meta-${key}`, value);
      });
      if (s3Resp.Metadata.name) res.attachment(s3Resp.Metadata.name);
    }
  },

   /**
   * @function updateObject
   * Creates an updated version of the object via streaming
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
    async updateObject(req, res, next) {
      try {
        const bb = busboy({ headers: req.headers, limits: { files: 1 } });
        const userId = getCurrentSubject(req.currentUser);
        let object = undefined;
        const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;

        bb.on('file', (name, stream, info) => {
          const objId = addDashesToUuid(req.params.objId);
          const data = {
            id: objId,
            fieldName: name,
            mimeType: info.mimeType,
            originalName: info.filename,
            metadata: getMetadata(req.headers)
            // TODO: Implement tag support - request shape TBD
            // tags: { foo: 'bar', baz: 'bam' }
          };
          object = {
            data: data,
            dbResponse: objectService.update({ ...data, userId, path: getPath(objId) }),
            s3Response: s3StorageService.putObject({bucketName, ...data, stream })
          };
        });
        bb.on('close', async () => {
          const [dbResponse, s3Response] = await Promise.all([
            object.dbResponse,
            object.s3Response
          ]);
  
          // if versioning enabled, create new version in DB
          if (s3Response.VersionId) {
            object.data.VersionId = s3Response.VersionId;
            await versionService.create([object.data], userId);
          } else {
            // else update existing null-version
            await versionService.update(object.data, userId);
          }
  
          // merge returned responses into a result
          const result = {
            ...object.data,
            ...dbResponse,
            ...s3Response
          };
          res.status(200).json(result);
        });
  
        req.pipe(bb);
      } catch (e) {
        next(errorToProblem(SERVICE, e));
      }
    },
  
  /**
   * @function createObjects
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   createObjects(req, res, next) {
    try {
      const bb = busboy({ headers: req.headers });
      const objects = [];
      const userId = getCurrentSubject(req.currentUser);
      const bucketId = req.currentBucket?req.currentBucket.id:SYSTEM_USER;
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
    
      bb.on('file', async(name, stream, info) => {
        const objId = uuidv4();
        const data = {
          id: objId,
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename,
          metadata: getMetadata(req.headers),
          // TODO: Implement tag support - request shape TBD
          // tags: { foo: 'bar', baz: 'bam' }
        };

        objects.push({
          data: data,
          dbResponse: objectService.create({ ...data, userId, bucketId, path: getPath(objId) }),
          s3Response: s3StorageService.putObject({ ...data, bucketName, stream })
        });
      });
      bb.on('close', async () => {
        await Promise.all(objects.map(async (object) => {
          // wait for object and permission db update
          object.dbResponse = await object.dbResponse;
          // wait for file to finish uploading to S3
          object.s3Response = await object.s3Response;
          // add VersionId to data for the file. If versioning not enabled on bucket. VersionId is undefined
          object.data.VersionId = object.s3Response.VersionId;
        }));
        
        // create version in DB
        const objectVersionArray = objects.map((object) => object.data);
        await versionService.create(objectVersionArray, userId);
        // merge returned responses into a result
        const result = objects.map((object) => ({
          ...object.data,
          ...object.dbResponse,
          ...object.s3Response
        }));
        res.status(201).json(result);
      });

      req.pipe(bb);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function deleteObject
   * Deletes the object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async deleteObject(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);
      const data = {
        filePath: getPath(objId),
        versionId: req.query.versionId
      };
      const userId = getCurrentSubject(req.currentUser);
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
    

      // delete version on S3
      const s3Response = await s3StorageService.deleteObject({...data, bucketName});

      // if request is to delete a version
      if (data.versionId) {
        const objectVersionId = s3Response.VersionId;
        // delete version in DB
        await versionService.delete(objId, objectVersionId);
        // if other versions in DB, delete object record
        // TODO: synch with versions in S3
        const remainingVersions = await versionService.list(objId);
        if (remainingVersions.length === 0) await objectService.delete(objId);
      }
      // else deleting the object
      else {
        // if versioning enabled s3Response will contain DeleteMarker: true
        if (s3Response.DeleteMarker) {
          // create DeleteMarker version in DB
          const deleteMarker = {
            id: objId,
            DeleteMarker: true,
            VersionId: s3Response.VersionId,
            mimeType: null,
            originalName: null
          };
          await versionService.create([deleteMarker], userId);
        }
        // else object in bucket is not versioned
        else {
          // delete object record from DB
          await objectService.delete(objId);
        }
      }
      res.status(200).json(s3Response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function readObject
   * Reads via streaming or returns a presigned URL for the object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async readObject(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);
      const data = {
        filePath: getPath(objId),
        versionId: req.query.versionId ? req.query.versionId.toString() : undefined
      };
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;

      // Download through service
      if (!req.query.expiresIn && req.query.download) {
        const response = await s3StorageService.readObject({...data, bucketName});

        // Set Headers
        service._setS3Headers(response, res);

        // TODO: Proper 304 caching logic (with If-Modified-Since header support)
        // Consider looking around for express-based caching middleware
        if (req.get('If-None-Match') === response.ETag) res.status(304).end();
        else {
          response.Body.pipe(res); // Stream body content directly to response
          res.status(200);
        }
      }

      // Download via redirect
      else {
        const response = await s3StorageService.readSignedUrl({
          expiresIn: req.query.expiresIn,
          ...data,
          bucketName
        });
        res.status(302).set('Location', response).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  

  /**
   * @function createBucket
   * List all versions of the object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async createBucket(req, res, next) {
    try {
      let email = getCurrentSubjectEmail(req.currentUser);
      let data = req.body;
      const objId = uuidv4();

     let response = await s3StorageService.createBucket(data)
     .then(async ()=> {
       return await bucketService.create({bucketName: data.bucketName,
          id:objId,
          provider: "S3 Bucket",
          public: data.public,
          email: email});
      })
      .catch((e)=>{
        next(errorToProblem(SERVICE, e));
      });
      res.status(200).json(response);

    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

/**
   * @function headObject
   * Returns object headers
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 async headObject(req, res, next) {
  try {
    const objId = addDashesToUuid(req.params.objId);
    const data = {
      filePath: getPath(objId),
      versionId: req.query.versionId ? req.query.versionId.toString() : undefined
    };
    const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
    const response = await s3StorageService.headObject({...data, bucketName});
    // Set Headers
    // TODO: Consider adding 'x-coms-public' and 'x-coms-path' headers into API spec?
    service._setS3Headers(response, res);
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

      const latest = await s3StorageService.headObject({ filePath: objPath, bucketName });
      if (latest.ContentLength > MAXCOPYOBJECTLENGTH) {
        throw new Error('Cannot copy an object larger than 5GB');
      }

      const metadataToAppend = getMetadata(req.headers);
      if (!Object.keys(metadataToAppend).length) {
        // TODO: Validation level logic. To be moved.
        // 422 when no keys present
        res.status(422).end();
      }
      else {

        const data = {
          copySource: objPath,
          filePath: objPath,
          metadata: {
            ...latest.Metadata,  // Take existing metadata first
            ...metadataToAppend, // Append new metadata
            id: latest.Metadata.id // Always enforce id key behavior
          },
          metadataDirective: MetadataDirective.REPLACE,
          versionId: req.query.versionId ? req.query.versionId.toString() : undefined
        };

        const response = await s3StorageService.copyObject({...data, bucketName});
        service._setS3Headers(response, res);
        res.status(204).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  

  /**
   * @function deleteMetadata
   * Creates a new version of the object via copy with the given metadata removed
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
  */
  async deleteMetadata(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;

      const latest = await s3StorageService.headObject({ filePath: objPath, bucketName });
      if (latest.ContentLength > MAXCOPYOBJECTLENGTH) {
        throw new Error('Cannot copy an object larger than 5GB');
      }

      // Generate object subset by subtracting/omitting defined keys via filter/inclusion
      const keysToRemove = Object.keys(getMetadata(req.headers));
      let metadata = undefined;
      if (keysToRemove.length) {
        metadata = Object.fromEntries(
          Object.entries(latest.Metadata)
            .filter(([key]) => !keysToRemove.includes(key))
        );
      }

      const data = {
        copySource: objPath,
        filePath: objPath,
        metadata: {
          ...metadata,
          name: latest.Metadata.name,  // Always enforce name and id key behavior
          id: latest.Metadata.id
        },
        metadataDirective: MetadataDirective.REPLACE,
        versionId: req.query.versionId ? req.query.versionId.toString() : undefined
      };

      const response = await s3StorageService.copyObject({...data, bucketName});
      service._setS3Headers(response, res);
      res.status(204).end();
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },



  /**
   * @function listObjectVersion
   * List all versions of the object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async listObjectVersion(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);
      const data = {
        filePath: getPath(objId)
      };
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;

      const response = await s3StorageService.listObjectVersion({...data, bucketName});
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  

  /**
 * @function replaceMetadata
 * Creates a new version of the object via copy with the new metadata replacing the previous
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
*/
  async replaceMetadata(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);
      const objPath = getPath(objId);
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;

      const latest = await s3StorageService.headObject({ filePath: objPath, bucketName });
      if (latest.ContentLength > MAXCOPYOBJECTLENGTH) {
        throw new Error('Cannot copy an object larger than 5GB');
      }

      const newMetadata = getMetadata(req.headers);
      if (!Object.keys(newMetadata).length) {
        // TODO: Validation level logic. To be moved.
        // 422 when no keys present
        res.status(422).end();
      }
      else {
        const data = {
          copySource: objPath,
          filePath: objPath,
          metadata: {
            name: latest.Metadata.name,  // Always enforce name and id key behavior
            ...newMetadata, // Add new metadata
            id: latest.Metadata.id
          },
          metadataDirective: MetadataDirective.REPLACE,
          versionId: req.query.versionId ? req.query.versionId.toString() : undefined
        };

        const response = await s3StorageService.copyObject({...data, bucketName});
        service._setS3Headers(response, res);
        res.status(204).end();
      }
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

 
};

module.exports = service;