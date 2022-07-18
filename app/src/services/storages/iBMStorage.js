//https://cloud.ibm.com/objectstorage/create
//https://github.com/IBM/ibm-cos-sdk-js/issues/50
//AWS.config.loadFromPath('./AwsConfig.json'); 
//https://cloud.ibm.com/docs/cloud-object-storage?topic=cloud-object-storage-sdk-about
//https://cloud.ibm.com/objectstorage/crn%3Av1%3Abluemix%3Apublic%3Acloud-object-storage%3Aglobal%3Aa%2F835e9573c7054991822e24decbdc5af1%3A590e735e-badb-4ea9-b950-d3b966942a97%3A%3A?paneId=manage
const busboy = require('busboy');
const COS = require('ibm-cos-sdk');
const { v4: uuidv4 } = require('uuid');
const config = require('config');

const { getPath, bytesToSize, streamToArray } = require('../../components/utils');


class IBMStorageService {

  constructor(endpoint, apiKeyId, serviceInstanceId, signatureVersion) {
    this._bucketName = "formulator";
    this._endpoint = endpoint;
    this._apiKeyId = apiKeyId;
    this._serviceInstanceId = serviceInstanceId;
    this._signatureVersion = signatureVersion;

    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
    const config = {
        endpoint:this._endpoint,
        apiKeyId: this._apiKeyId,
        serviceInstanceId : this._serviceInstanceId,
        signatureVersion: this._signatureVersion,   
    };
    this.cos = new COS.S3(config);
  }

  /**
   * @function _initBucket
   * Use to switch between bucket provided in the environment variables and provided bucket 
   * through url or endpoint
   * @param {string} bucketName The bucket name from the url
   * @returns {string} returns bucket name
   */
  _initBucketName(bucketName) {
    return bucketName?bucketName: this._bucket;
  }


  /**
   * @function createBucket
   * Creates a bucket
   * @param {string} bucketName The bucket name from the url
   * @param {string} location this is equal to availability zones on S3
   * @param {string} storageClass The storage class set for an object affects the object's availability and pricing model
   * @returns {function} Express middleware function
  */
  createBucket({bucketName, locationConstraint}) {
    return this.cos.createBucket({
        Bucket: bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: locationConstraint
        },        
    });
  }


  async listObjects({folderpath}) {
  
    return this.cos.listObjects(
      {Bucket: this._bucketName},
    ).promise()
    .then((data) => {
      if (data != null && data.Contents != null) {
          for (var i = 0; i < data.Contents.length; i++) {
              var itemKey = data.Contents[i].Key;
              var itemSize = data.Contents[i].Size;
              console.log(`Item: ${itemKey} (${itemSize} bytes).`)
          }
      }    
    })
    .catch((e) => {
      console.error(`ERROR: ${e.code} - ${e.message}\n`);
    });
  }

  /**
   * @function getObject
   * Get object
   * @param {string} bucketName The bucket name from the url
   * @param {string} objPath the part and the objectid of the object to delete
   * @param {string} versionId object version
   * @returns {function} Express middleware function
  **/
  async getObject({ bucketName, objPath, versionId }) {
    return this.cos.getObject({
      Bucket:this. _initBucketName(bucketName), 
      Key: objPath
    }).promise()
  }


  /**
   * @function deleteObject
   * Delete object
   * @param {string} bucketName The bucket name from the url
   * @param {string} filePath the part and the objectid of the object to delete
   * @param {string} versionId object version
   * @returns {function} Express middleware function
  **/
  async deleteObject({bucketName, filePath, versionId }){
    return this.cos.deleteObject({
      Bucket: this._initBucketName(bucketName),
      Key: filePath
    }).promise();
  }


  async uploadSinglePartObject(imageData) {
    let mimeType =imageData.image.split(";")[0].split(":")[1];
    const image = Buffer.from(imageData.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    const objId = uuidv4();
    let keyId = getPath(objId);
    const params = {
      Bucket: this._bucket,
      ContentType: mimeType,
      Key: keyId,
      Body: image,
      Metadata: {
        name: imageData.componentName,
        id: keyId
      },
      ServerSideEncryption: 'AES256'
    };
    
    return await this._s3Client.send(new PutObjectCommand(params));
  }


  async uploadMultiPartObject(request) {

    const bb = busboy({ headers: request.headers });
   
    //const userId = getCurrentSubject(req.currentUser);
    bb.on('file', async (name, streams, info) => {

      const objId = uuidv4();
      let keyId = getPath(objId);
      const tempStream =  await streamToArray(streams);
      const data = {
        id: keyId,
        fieldName: name,
        mimeType: info.mimeType,
        originalName: info.filename
        // TODO: Implement metadata and tag support - request shape TBD
        // metadata: { foo: 'bar', baz: 'bam' }
        // tags: { foo: 'bar', baz: 'bam' }
      };

      let totalStreamSizeInBytes = await bytesToSize(Buffer.concat(tempStream));
      let partSize = 1024 * 1024 * 5;
          
      if (partSize>=totalStreamSizeInBytes){
        let buff = Buffer.concat(tempStream)
        await this.singlePartUpload({ keyId,  buff});
      }
      else {    
        await this.multiPartUpload(objId, tempStream);
      }   
    });
    bb.on('close', async () => {
      
    });
  
    request.pipe(bb); 
  }

  /**
   * @function putObjects
   * Delete object
   * @param {string} bucketName The bucket name from the url
   * @param {string} id the path and the objectid of the object to upload to bucket
   * @param {Object} stream object coverted to stream to upload to the bucket
   * @returns {function} Express middleware function
  **/
  async putObjects({ bucketName, id,  stream }) {
    let buffer;
    let arr=[];

    for await (const chunk of stream) {
      arr.push(chunk);
      buffer = Buffer.concat(arr);
    }
    return await this.cos.putObject({
      Bucket: this._initBucketName(bucketName), 
      Key: getPath(id), 
      Body: buffer
    }).promise();

    
  }

  async singlePartUpload({ keyId,  buff }) {

    return this.cos.putObject({
      Bucket: this._bucketName, 
      Key: keyId, 
      Body: buff
    });
  } 

  async multiPartUpload(objId, stream) {
    let uploadID = null;
    let partNo = 1;
    let allParts = [];
    let arr=[];
    let buf=null;
    let keyId = getPath(objId);
    let partSize = 1024 * 1024 * 8;
    return this.cos.createMultipartUpload({
      Bucket: this._bucketName,
      Key: keyId
    }).promise()
    .then(async(data) => {
      uploadID = data.UploadId;
      for await (const chunk of stream) {
        
        arr.push(chunk);
        buf = Buffer.concat(arr);
       
        if(Buffer.byteLength(buf)>partSize) {
           await this.uploadPart(buf, keyId, partNo, uploadID).then(async(part)=> {
            allParts.push(part);
          });
          arr=[];
          partNo++;
        } 
      }
      await this.uploadPart(buf, keyId, partNo, uploadID)
      .then(async(part)=> {
        
        allParts.push(part);
        
        await this.completeMultipartUpload(keyId, allParts,uploadID);
      });
        
    })
    .catch((e) => {
      this.cancelMultiPartUpload(objId, uploadID);
      console.error(`ERROR: ${e.code} - ${e.message}\n`);
    });
  }

  uploadPart(buf, keyId, partNo, uploadId) {
    return new Promise((resolve, reject) => {
      return this.cos.uploadPart({
        Body: buf,
        Bucket: this._bucketName,
        Key: keyId,
        PartNumber: partNo,
        UploadId: uploadId,
      }).promise().then((data) => {
        resolve({ETag: data.ETag, PartNumber: partNo})
      })
      .catch((e) => { 
        reject(e);  
      });
    });
  
  }

  completeMultipartUpload(keyId,allParts,uploadID) {
    this.cos.completeMultipartUpload({
      Bucket: this._bucketName,
      Key: keyId,
      MultipartUpload: {
          Parts: allParts
      },
      UploadId: uploadID
    }).promise()
    .then(console.log(`Upload of all successful.`))
    .catch((e) => {
      cancelMultiPartUpload(bucketName, itemName, uploadID);
      console.error(`ERROR: ${e.code} - ${e.message}\n`);
    });
  }

  cancelMultiPartUpload(keyId, uploadID) {
    return this.cos.abortMultipartUpload({
        Bucket: this._bucketName,
        Key: keyId,
        UploadId: uploadID
    }).promise()
    .then(() => {
        console.log(`Multi-part upload aborted for ${keyId}`);
    })
    .catch((e)=>{
        console.error(`ERROR: ${e.code} - ${e.message}\n`);
    });
}

  
}


//const bucket =config.get('objectStorage.iBMObjectStorage.bucket');
const endpoint = config.get('objectStorage.iBMObjectStorage.endpoint');
const apiKeyId = config.get('objectStorage.iBMObjectStorage.apiKeyId');
const serviceInstanceId = config.get('objectStorage.iBMObjectStorage.serviceInstanceId');
const signatureVersion = config.get('objectStorage.iBMObjectStorage.signatureVersion');
const iBMStorageService = new IBMStorageService( endpoint, apiKeyId, serviceInstanceId, signatureVersion);

module.exports = iBMStorageService;
