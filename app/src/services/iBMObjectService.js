const busboy = require('busboy');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const errorToProblem = require('../components/errorToProblem');
const  {Readable} = require('stream');
const {
  addDashesToUuid,
  getAppAuthMode,
  getCurrentSubject,
  getMetadata,
  getPath,
  isTruthy,
  mixedQueryToArray,
  getCurrentSubjectEmail
} = require('../components/utils');
const {iBMStorageService} = require('../services/storages');
const { objectService, versionService, bucketService } = require('../services');

const SERVICE = 'ObjectService';

  /**
  * The Google Object Service
  */
  const service = {

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
        const email = getCurrentSubjectEmail(req.currentUser);
        const data = req.body;
        const id = uuidv4();
        const bucketName = data.bucketName;
        const locationConstraint = data.locationConstraint;

        return await iBMStorageService.createBucket({ bucketName, locationConstraint})
        .promise()
        .then(async() => {
          let response = await bucketService.create({bucketName: data.bucketName,
            id:id,
            provider: "IBM Storage",
            public: data.public,
            email: email});
            res.status(200).json(response);
        })
        .catch((e) => {
          next(errorToProblem(SERVICE, e));
        });
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
         // metadata: getMetadata(req.headers),
          // TODO: Implement tag support - request shape TBD
          // tags: { foo: 'bar', baz: 'bam' }
        };

        objects.push({
          data: data,
          dbResponse: objectService.create({ ...data, userId, bucketId, path: getPath(objId) }),
          s3Response: iBMStorageService.putObjects({ ...data, bucketName, stream })
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
   * @function updateObject
   * update object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  
   updateObject(req, res, next) {
    try {
  
      const objects = [];
      const bb = busboy({ headers: req.headers, limits: { files: 1 } });
      const userId = getCurrentSubject(req.currentUser);
      let object = undefined;
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
    
      bb.on('file', async(name, stream, info) => {
        const objId = addDashesToUuid(req.params.objId);
        const data = {
          id: objId,
          fieldName: name,
          mimeType: info.mimeType,
          originalName: info.filename,
         // metadata: getMetadata(req.headers),
          // TODO: Implement tag support - request shape TBD
          // tags: { foo: 'bar', baz: 'bam' }
        };

        objects.push({
          data: data,
          dbResponse: objectService.update({ ...data, userId, path: getPath(objId) }),
          s3Response: iBMStorageService.putObjects({ ...data, bucketName, stream })
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
      const s3Response = await iBMStorageService.deleteObject({...data, bucketName});

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
      
        const downloadBlockBlobResponse = await iBMStorageService.getObject({bucketName, objPath});
        
        //const buff = Buffer.concat(downloadBlockBlobResponse.Body);
        
        const readable = new Readable();

        readable.push(downloadBlockBlobResponse.Body);

       readable.push(null);

       readable.pipe(res);
        
      
        res.status(200);
        
      } catch (e) {
        next(errorToProblem(SERVICE, e));
      }
    },

 };

module.exports = service;