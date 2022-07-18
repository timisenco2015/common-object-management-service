const busboy = require('busboy');
const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const errorToProblem = require('../components/errorToProblem');
const {
  addDashesToUuid,
  getCurrentSubject,
  getPath,
  isTruthy,
  isObject,
  getCurrentSubjectEmail
} = require('../components/utils');

const  {Transform,Readable} = require('stream');
const {azureStorageService} = require('../services/storages')
const { objectService, versionService, bucketService } = require('../services');

const SERVICE = 'ObjectService';



/**
 * The Azure Object Service
 */
 const service = {


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
  },
  /**
   * @function setBlobMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async setBlobMetadata(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);

      if(!req.body.metadata || !isObject(req.body.metadata)) {
        throw new Error('metadata cannot be empty and must be an object');
      }
      else {
        const metadataToAppend = req.body.metadata;
        const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
        const fetchedMetadata = await azureStorageService.getBlobMetadata({objId, bucketName});
        const objectMetadata = {
          ...fetchedMetadata,
          ...metadataToAppend
        }
        const response = await azureStorageService.setBlobMetadata({bucketName, objId, objectMetadata});
        res.status(200).json(response);
      }      
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function deleteMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   async deleteMetadata(req, res, next) {
    try {
      const objId = addDashesToUuid(req.params.objId);

      if(!req.body.metadata || !isObject(req.body.metadata)) {
        throw new Error('metadata cannot be empty and must be an object');
      }
      else {
        const metadataToDelete = req.body.metadata;
        const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
        const fetchedMetadata = await azureStorageService.getBlobMetadata({objId, bucketName});
        for(let key of Object.keys(metadataToDelete)) {
          delete fetchedMetadata[key];
        }
        const response = await azureStorageService.setBlobMetadata({bucketName, objId, fetchedMetadata});
        res.status(200).json(response);
      }      
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },
/**
   * @function replaceMetadata
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 async replaceMetadata(req, res, next) {
  try {
    const objId = addDashesToUuid(req.params.objId);

    if(!req.body.metadata || !isObject(req.body.metadata)) {
      throw new Error('metadata cannot be empty and must be an object');
    }
    else {
      const metadata = req.body.metadata;
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
      const response = await azureStorageService.setBlobMetadata({bucketName, objId, metadata});
      res.status(200).json(response);
    }      
  } catch (e) {
    next(errorToProblem(SERVICE, e));
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
    let data = req.body;
    let bucketName = data.bucketName;
    let accessLevel = data.accessLevel;
    const id = uuidv4();
   
    const createContainerResponse = await azureStorageService.createBucket({bucketName,accessLevel});
    if(createContainerResponse.clientRequestId) {
      const response = await bucketService.create({bucketName: data.bucketName,
          id:id,
          provider: "Azure Storage",
          public: data.public,
          email: email});
      res.status(200).json(response);
    }  
        
  } catch (e) {
    next(errorToProblem(SERVICE, e));
  }
},

/**
   * @function createBlobFromReadStream
   * Sets the public flag of an object
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 async createBlobFromReadStream(req, res, next) {
  try {

    const bucketName = req.currentBucket&&req.currentBucket.bucketName;
    const bucketId = req.currentBucket&&req.currentBucket.id
    const bb = busboy({ headers: req.headers });
    let buffer;
    let arr=[];
    const objId = uuidv4();
    const keyId = getPath(objId);
    const userId = getCurrentSubject(req.currentUser);
    let buffCount=0;
    const uploadOptions={};
   
    bb.on('file', async (name, stream, info) => {
      uploadOptions.id = objId;
      uploadOptions.fieldName = name;
      uploadOptions.mimeType = info.mimeType;
      uploadOptions.originalName = info.filename;
      uploadOptions.bucketId = bucketId
       
      for await (const chunk of stream) {
        arr.push(chunk);
        buffer = Buffer.concat(arr);
      }
      
    });
    bb.on('close', async () => {
      
      buffCount = arr.length;
      
      arr=[];

      const streams = Readable.from(buffer);

      const myTransform = new Transform({
        transform(chunk, encoding, callback) {
          callback(null, chunk);
        },
        decodeStrings: false
      });

      let bufferSize = Math.floor(Buffer.byteLength(buffer)/buffCount);

      const transformedReadableStream = streams.pipe(myTransform);

      let result = await azureStorageService.createBlobFromReadStream({bucketName, keyId, transformedReadableStream, bufferSize, buffCount, uploadOptions});

      if(result.requestId) {
        const createdObject =  await objectService.create({ ...uploadOptions, path: getPath(objId), userId });
        res.status(200).json(createdObject); 
      } 
    });
     
    req.pipe(bb);
        
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

      const objectPath = req.currentObject.path;
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
    
      const downloadBlockBlobResponse = await azureStorageService.downloadIntoMemory({bucketName, objectPath});
      downloadBlockBlobResponse.readableStreamBody.pipe(res);
      res.status(200);
      
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
      const objectPath = req.currentObject.path;
      const bucketName = req.currentBucket?req.currentBucket.bucketName:undefined;
      const downloadBlockBlobResponse = await azureStorageService.deleteBlobIfItExists({bucketName, objectPath});
       // delete object record from DB
       if (downloadBlockBlobResponse.succeeded) {
        const deletedObject = await objectService.delete(objId);
       }
      
      
      res.status(200).json({message:"Object sucessfully deleted"});
      
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

      const bucketName = req.currentBucket&&req.currentBucket.bucketName;
      const bucketId = req.currentBucket&&req.currentBucket.id
      const objId = addDashesToUuid(req.params.objId);
      const bb = busboy({ headers: req.headers });
      let buffer;
      let arr=[];
      const keyId = getPath(objId);
      const userId = getCurrentSubject(req.currentUser);
      let buffCount=0;
      const uploadOptions={};
   
      bb.on('file', async (name, stream, info) => {
        uploadOptions.id = objId;
        uploadOptions.fieldName = name;
        uploadOptions.mimeType = info.mimeType;
        uploadOptions.originalName = info.filename;
        uploadOptions.bucketId = bucketId
       
        for await (const chunk of stream) {
          arr.push(chunk);
          buffer = Buffer.concat(arr);
        }
      
      });
      bb.on('close', async () => {
      
        buffCount = arr.length;
      
        arr=[];

        const streams = Readable.from(buffer);

        const myTransform = new Transform({
          transform(chunk, encoding, callback) {
            callback(null, chunk);
          },
          decodeStrings: false
        });

        let bufferSize = Math.floor(Buffer.byteLength(buffer)/buffCount);

        const transformedReadableStream = streams.pipe(myTransform);

        let result = await azureStorageService.createBlobFromReadStream({bucketName, keyId, transformedReadableStream, bufferSize, buffCount, uploadOptions});

        if(result.requestId) {
          const createdObject =  await objectService.update({ ...uploadOptions, path: getPath(objId), userId });
          res.status(200).json(createdObject); 
        } 
      });
     
      req.pipe(bb);
      
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

 };

  module.exports = service;