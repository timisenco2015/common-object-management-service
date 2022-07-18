const config = require('config');
const {Storage} = require('@google-cloud/storage');
//https://cloud.google.com/storage/docs/creating-buckets#prereq-code-samples
//https://cloud.google.com/storage/docs/downloading-objects#prereq-code-samples
//https://googleapis.dev/nodejs/storage/latest/
//https://googleapis.dev/nodejs/storage/latest/Bucket.html#upload
// const bucket = gc.bucket('bucket-name');

// For more information on ways to initialize Storage, please see
// https://googleapis.dev/nodejs/storage/latest/Storage.html

class CloudStorageService {
  constructor(bucketName,projectId,envFilePath) {
    this._projectId=projectId;
    this._envFilePath=envFilePath;
    //
    // Creates a client using Application Default Credentials
    this.storage = new Storage({
      projectId: this._projectId,
      keyFilename:this._envFilePath
    });

    this._bucketName = bucketName;
  }



  /**
   * @function _initBucket
   * Use to switch between bucket provided in the environment variables and provided bucket 
   * through url or endpoint
   * @param {string} bucketName The bucket name from the url
   * @returns {string} returns bucket name
   */
  _initBucket(bucketName) {

    return bucketName?bucketName:this._bucketName;
  }


  /**
   * @function createBucket
   * Creates a bucket
   * @param {string} bucketName The bucket name from the url
   * @param {string} location this is equal to availability zones on S3
   * @param {string} storageClass The storage class set for an object affects the object's availability and pricing model
   * @returns {function} Express middleware function
   */
  async createBucket({bucketName, location, storageClass}) {
    // Creates the new bucket
    return await this.storage.createBucket(this._initBucket(bucketName), {
      location: location,
      storageClass: storageClass
    });
  }


  /**
   * @function toggleBucketVersioning
   * Creates a bucket
   * @param {string} bucketName The bucket name from the url
   * @param {string} isVersionEnabledd this is use to set bucket versioning on/off
   * @returns {function} Express middleware function
   */
   async toggleBucketVersioning({bucketName, isVersioningEnabled}) {
    // Creates the new bucket
    return await this.storage.bucket(this._initBucket(bucketName)).setMetadata({
      versioning: {
        enabled: isVersioningEnabled,
      }
    });
  }



  async uploadObject(imageData) {
    let mimeType =imageData.image.split(";")[0].split(":")[1].split("/")[1];
    const stream = Buffer.from(imageData.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    return await this.storage.bucket(this._bucketName).file(imageData.componentName+"."+mimeType).save(stream);
  }

  async enableBucketVersioning(params) {
    await this.storage.bucket(params.bucketName).setMetadata({
      versioning: {
        enabled: params.enable,
      },
    });
  }

  async enableBucketLifecycleManagement(params) {
    return await storage.bucket(params.bucketName).addLifecycleRule(params.conditions);
  }

  async  getBucketMetadata() {
    
    return await storage.bucket(bucketName).getMetadata();
  
  }



  async disableBucketLifecycleManagement() {
    return storage.bucket(bucketName).setMetadata({lifecycle: null});
  }
  
  /**
   * @function streamUploadObject
   * Creates a bucket
   * @param {string} bucketName The bucket name from the url
   * @param {string} keyId the part and the objectid of the object to upload
   * @param {string} buff the image stream to upload
   * @returns {function} Express middleware function
   */
  async streamUploadObject({bucketName, keyId, buff}) {

    return await this.storage.bucket(this._initBucket(bucketName)).file(keyId).save(buff);
  }

  /**
   * @function streamUploadObject
   * Creates a bucket
   * @param {string} bucketName The bucket name from the url
   * @param {string} objPath the part and the objectid of the object to delete
   * @returns {function} Express middleware function
   */
  async  deleteObject({bucketName, objPath}) {
    await this.storage.bucket(this._initBucket(bucketName)).file(objPath,{generation}).delete();
  } 

  /**
   * @function deleteOldVersionOfFile
   * Creates a bucket
   * @param {string} bucketName The bucket name from the url
   * @param {string} objPath the part and the objectid of the object to delete
   * * @param {string} generation is equivalent to
   * @returns {function} Express middleware function
   */
   async  deleteOldVersionOfFile({bucketName, objPath, generation}) {
    await this.storage.bucket(this._initBucket(bucketName)).file(objPath,{generation}).delete();
  }

 
  /**
   * @function streamUploadObject
   * Creates a bucket
   * @param {string} bucketName The bucket name from the url
   * @param {string} keyId the part and the objectid of the object to delete
   * @returns {function} Express middleware function
   */
  async downloadIntoMemory({bucketName, objPath}) {
    // Downloads the file into a buffer in memory.
    return await this.storage.bucket(this._initBucket(bucketName)).file(objPath).download();
  }

  async printBucketAcl(param) {
    // Gets the ACL for the bucket
    return await this.storage.bucket(param).acl.get();
  }

  async addBucketAcl(param) {
    const bucket = this.storage.bucket(params.bucketName);
  
    bucket.acl.add(options, function(err, aclObject) {});
  
    //-
    // If the callback is omitted, we'll return a Promise.
    //-
    return await bucket.acl.add(param.options)
  }

  async addBucketOwner(params) {
    // Makes the user an owner of the bucket. You can use addAllUsers(),
    // addDomain(), addProject(), addGroup(), and addAllAuthenticatedUsers()
    // to grant access to different types of entities. You can also use "readers"
    // and "writers" to grant different roles.
    return await this.storage.bucket(params.bucketName).acl.owners.addUser(params.userEmail);

  }


  async removeBucketOwner(params) {
    // Removes the user from the access control list of the bucket. You can use
    // deleteAllUsers(), deleteDomain(), deleteProject(), deleteGroup(), and
    // deleteAllAuthenticatedUsers() to remove access for different types of entities.
    return await this.storage.bucket(params.bucketName).acl.owners.deleteUser(params.userEmail);

  }

  async  removeBucketIamPolicy(params) {
    // Get a reference to a Google Cloud Storage bucket
    const bucket = this.storage.bucket(params.bucketName);

    // For more information please read:
    // https://cloud.google.com/storage/docs/access-control/iam
    return await bucket.iam.getPolicy({requestedPolicyVersion: 3});

    
  }


  async viewBucketIamPolicy(params) {
    // For more information please read:
    // https://cloud.google.com/storage/docs/access-control/iam
    return await this.storage
      .bucket(params.bucketName)
      .iam.getPolicy({requestedPolicyVersion: 3}); 
  }

  async removeBucketIamMember(params) {
    // Get a reference to a Google Cloud Storage bucket
    const bucket = this.storage.bucket(params.bucketName);

    // For more information please read:
    // https://cloud.google.com/storage/docs/access-control/iam
    return await bucket.iam.getPolicy({requestedPolicyVersion: 3});

    
  }

  
  async configureBucketCors(params) {
    if(Array.isArray(params.config)) {
      return await this.storage.bucket(params.bucketName).setCorsConfiguration(params.config);
    }
  }

  async removeBucketCors(params) {
   return await storage.bucket(params.bucketName).setCorsConfiguration([]);
  }

  async getBucketMetadata(params) {
    
  
    // Get Bucket Metadata
    return await this.storage.bucket(params.bucketName).file(params.keyId).getMetadata();
  
  }


  async  setObjectMetadata({data, bucketName,objPath}) {
    // Set file metadata.
    return await storage
      .bucket(bucketName)
      .file(objPath)
      .setMetadata(data);
  }


  


 

  async generateV4SignedPolicy() {
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(fileName);
  
    // These options will allow temporary uploading of a file
    // through an HTML form.
    const expires = Date.now() + 10 * 60 * 1000; //  10 minutes
    const options = {
      expires,
      fields: {'x-goog-meta-test': 'data'},
    };
  
    // Get a v4 signed policy for uploading file
    return await file.generateSignedPostPolicyV4(options);

  }
  
  
}


/*
const { ApolloServer, gql } = require("apollo-server-express");
*/



const bucketName = config.get('objectStorage.cloudStorage.bucketName');
const projectId = config.get('objectStorage.cloudStorage.projectId');
const envFilePath = config.get('objectStorage.cloudStorage.environmentFilePath');

const cloudStorageService = new CloudStorageService(bucketName,projectId,envFilePath);

module.exports = cloudStorageService;
