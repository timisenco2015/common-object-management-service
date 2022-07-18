//https://docs.microsoft.com/en-us/azure/storage/blobs/storage-quickstart-blobs-nodejs?tabs=environment-variable-windows#get-the-connection-string
//https://docs.microsoft.com/en-us/azure/storage/common/storage-samples-javascript?toc=%2Fazure%2Fstorage%2Fblobs%2Ftoc.json
//https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-properties-metadata-javascript
//https://github.com/Azure-Samples/AzureStorageSnippets/tree/master/blobs/howto/JavaScript/NodeJS-v12/dev-guide
//https://docs.microsoft.com/en-us/rest/api/storageservices/set-blob-metadata

const config = require('config');
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const { getPath } = require('../../components/utils');

class AzureStorageService {
  constructor(bucketName,account,accountKey) {
    this._bucketName=bucketName;
    this._account=account;
    this._accountKey=accountKey;
    this.sharedKeyCredential = new StorageSharedKeyCredential(this._account,this._accountKey);
    this.blobServiceClient = new BlobServiceClient(
      `https://${this._account}.blob.core.windows.net`,
      this.sharedKeyCredential
    );
  }


  /**
   * @function _initContainer
   * Use to switch between bucket provided in the environment variables and provided bucket 
   * through url or endpoint
   * @param {string} bucketName The bucket name from the url
   * @returns {string} returns bucket name
  */
  _initContainer(bucketName) {

    if(bucketName) {
      return this.blobServiceClient.getContainerClient(bucketName);
    }
    return this.blobServiceClient.getContainerClient(this._bucketName)
  }

  /**
   * @function setBlobMetadata
   * get object metadata
   * @param {string} bucketName The bucket name from the url
   * @param {string} objId the part and the objectid of the object to set the metadata
   * @param {string} metadata the part and the objectid of the object to delete
   * @returns {function} Express middleware function
  */
  async setBlobMetadata({bucketName, objId, metadata}) {
    /*
      e.g.:
      metadata= {
      reviewedBy: 'Bob',
      releasedBy: 'Jill',
      }
    */
    const blockBlobClient = this._initContainer(bucketName).getBlockBlobClient(getPath(objId));
    return await blockBlobClient.setMetadata(metadata);
  }

  /**
   * @function getBlobMetadata
   * get object metadata
   * @param {string} bucketName The bucket name from the url
   * @param {string} objId the part and the objectid of the object to get the metadata
   * @returns {function} Express middleware function
  */
  async getBlobMetadata({objId, bucketName}) {
    const blockBlobClient = this._initContainer(bucketName).getBlockBlobClient(getPath(objId));
    
    return await blockBlobClient.getProperties()["metadata"];
  }
  

  /**
   * @function createBucket
   * download object
   * @param {string} bucketName The bucket name from the url
   * @param {string} accessLevel this set access level on the bucket
   * @returns {function} Express middleware function
  */
  async createBucket({bucketName, accessLevel}) {

    const options = {
      access: accessLevel
    };

    // Get a reference to a container
    const containerClient = this.blobServiceClient.getContainerClient(bucketName, options);
    // Create the container
    return await containerClient.create();
    
  }

  /**
   * @function uploadObject
   * upload object
   * @param {string} bucketName The bucket name from the url
   * @param {string} objPath the part and the objectid of the object to delete
   * @returns {function} Express middleware function
  */
  async uploadObject(imageName, data) {
    // Get a block blob client
    const blockBlobClient = this.cotainerClient.getBlockBlobClient(imageName+".png");
    const uploadBlobResponse = await blockBlobClient.upload(data, data.length);
    //if(uploadBlobResponse && uploadBlobResponse.requestId) {
    //  await objectService.create({ ...data, userId, path: getPath(objId) }),
    //}
    
    return null;
  }
  
  /**
   * @function downloadIntoMemory
   * download object
   * @param {string} bucketName The bucket name from the url
   * @param {string} objPath the part and the objectid of the object to delete
   * @returns {function} Express middleware function
  */
  async downloadIntoMemory({bucketName, objectPath}) {
    // Get blob content from position 0 to the end
    // In Node.js, get downloaded data by accessing downloadBlockBlobResponse.readableStreamBody
    // In browsers, get downloaded data by accessing downloadBlockBlobResponse.blobBody
    const blockBlobClient = await this._initContainer(bucketName).getBlockBlobClient(objectPath).download();
    return blockBlobClient;

  }

  /**
   * @function deleteBlobIfItExists
   * delete object/blob if exists
   * @param {string} bucketName The bucket name from the url
   * @param {string} objPath the part and the objectid of the object to delete
   * @returns {function} Express middleware function
  */  
  async deleteBlobIfItExists({bucketName, objectPath}){

    // include: Delete the base blob and all of its snapshots.
    // only: Delete only the blob's snapshots and not the blob itself.
    const options = {
      deleteSnapshots: 'include' // or 'only'
    }
  
    return await this._initContainer(bucketName).getBlockBlobClient(objectPath).deleteIfExists(options);
  
  }

  /**
   * @function createBlobFromReadStream
   * upload object
   * @param {string} bucketName The bucket name from the url
   * @param {string} objectid the object id of the object to upload
   * @param {object} transformedReadableStream object stream
   * @param {integer} bufferSize the size of the object stream
   * @param {integer} buffCount the length of array of bytes
   * @param {string} uploadOptions azure required parameters to be set before uploading object
   * @returns {function} Express middleware function
  */
  async createBlobFromReadStream({bucketName, keyId, transformedReadableStream, bufferSize, buffCount, uploadOptions}) {

    const containerClient = this._initContainer(bucketName);
    const blockBlobClient = await containerClient.getBlockBlobClient(keyId);
    return await blockBlobClient.uploadStream(transformedReadableStream,bufferSize, buffCount,uploadOptions);    
  }
  
}



const bucketName = config.get('objectStorage.azureBlobStorage.bucketName');
const account = config.get('objectStorage.azureBlobStorage.accountName');
const accountKey = config.get('objectStorage.azureBlobStorage.accountKey');


const azureStorageService = new AzureStorageService(bucketName,account, accountKey);

module.exports = azureStorageService;
