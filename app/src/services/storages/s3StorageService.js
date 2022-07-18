const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const bucket = require('../bucket');

//https://gist.github.com/damianmcdonald/ef0310c06012d96df4288f7813f17ffc
//https://www.example-code.com/nodejs/s3_rest_put_bucket_policy.asp
//https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/s3-example-bucket-policies.html
//https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html
const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectVersionsCommand,
  UploadPartCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  PutObjectCommand,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  PutBucketLoggingCommand,
  GetBucketLoggingCommand,
  DeleteBucketTaggingCommand,
  PutBucketTaggingCommand,
  GetBucketTaggingCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
  DeleteBucketCorsCommand,
  PutBucketEncryptionCommand,
  GetBucketEncryptionCommand,
  DeleteBucketEncryptionCommand,
  DeleteObjectTaggingCommand,
  GetObjectTaggingCommand,
  GetBucketAclCommand,
  PutBucketAclCommand,
  DeleteBucketPolicyCommand,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  PutObjectTaggingCommand,
  S3Client
} = require('@aws-sdk/client-s3');
const config = require('config');

const { getPath } = require('../../components/utils');

/**
 * The Core S3 Object Storage Service
 * @see {@link https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/}
 */
class S3StorageService {


  constructor(bucketName, endpoint, defaultTempExpiresIn, accessKeyId, secretAccessKey, region) {
    this._bucket = bucketName;
    this._endpoint = endpoint;
    this._defaultTempExpiresIn = defaultTempExpiresIn;
    this._accessKeyId = accessKeyId;
    this._secretAccessKey = secretAccessKey;
    this._region = region
    this._s3Client= new S3Client({
      apiVersion: '2006-03-01',
      credentials: {
        accessKeyId:this._accessKeyId,
        secretAccessKey: this._secretAccessKey,
      },
      endpoint: this._endpoint,
      forcePathStyle: true,
      region: this._region // Need to specify valid AWS region or it'll explode ('us-east-1' is default, 'ca-central-1' for Canada)
    });

  }

  /**
   * @function _initBucketName
   * Use to switch between bucket provided in the environment variables and provided bucket 
   * through url or endpoint
   * @param {string} bucketName The bucket name from the url
   * @returns {string} returns bucket name
   */
  _initBucketName(bucketName) {
    return bucketName?bucketName: this._bucket;
  }
  

  
  /**
   * @function uploadSinglePartObject
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  async uploadSinglePartObject(params) {
    
    return await this._s3Client.send(new PutObjectCommand(params));
  }

  

  /**
   * @function putBucketACL
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
   async putBucketACL(params) {
   
    return await this._s3Client.send(new PutBucketAclCommand(params));
  }

    /**
   * @function getBucketACL
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
     async getBucketACL (params) {
   
      return await this._s3Client.send(new GetBucketAclCommand(params));
    }

  
   /**
   * @function putObjectTagging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
    async putObjectTagging(params) {
   
      return await this._s3Client.send(new PutObjectTaggingCommand(params));
    }


    /**
   * @function deleteObjectTagging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
     async deleteObjectTagging(params) {
   
      return await this._s3Client.send(new DeleteObjectTaggingCommand(params));
    }


    /**
   * @function getObjectTagging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
     async getObjectTagging(params) {
   
      return await this._s3Client.send(new GetObjectTaggingCommand(params));
    }


  /**
   * @function deleteBucketPolicy
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
    async deleteBucketPolicy (params) {
   
      return await this._s3Client.send(new DeleteBucketPolicyCommand(params));
    }

    /**
   * @function getBucketPolicy
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
     async getBucketPolicy (params) {
   
      return await this._s3Client.send(new GetBucketPolicyCommand(params));
    }


     /**
   * @function putBucketPolicy
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
      async putBucketPolicy (params) {
   
        return await this._s3Client.send(new PutBucketPolicyCommand(params));
      }

     /**
   * @function getBucketVersioning
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
      async getBucketVersioning (params) {
   
        return await this._s3Client.send(new GetBucketVersioningCommand(params));
      }

    /**
   * @function putBucketVersioning
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
     async putBucketVersioning (params) {
   
      return await this._s3Client.send(new PutBucketVersioningCommand(params));
    }

    /**
   * @function putBucketCors
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
     async putBucketCors (params) {
   
      return await this._s3Client.send(new PutBucketCorsCommand(params));
    }

    /**
   * @function getBucketCors
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
     async getBucketCors (params) {
   
      return await this._s3Client.send(new GetBucketCorsCommand(params));
    }

  /**
   * @function deleteBucketCors
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
 async deleteBucketCors (params) {
   
  return await this._s3Client.send(new DeleteBucketCorsCommand(params));
}

/**
   * @function putBucketEncryption
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
 async putBucketEncryption (params) {
   
  return await this._s3Client.send(new PutBucketEncryptionCommand(params));
}


/**
   * @function deleteBucketEncryption
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
 async deleteBucketEncryption (params) {
   
  return await this._s3Client.send(new DeleteBucketEncryptionCommand(params));
}

/**
   * @function getBucketEncryption
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
 async getBucketEncryption (params) {
   
  return await this._s3Client.send(new GetBucketEncryptionCommand(params));
}

 /**
   * @function putBucketLogging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  async putBucketLogging (params) {
   
    return await this._s3Client.send(new PutBucketLoggingCommand(params));
  }


  /**
   * @function getBucketLogging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
   async getBucketLogging (params) {
   
    return await this._s3Client.send(new GetBucketLoggingCommand(params));
  }

   /**
   * @function deleteBucketTagging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
    async deleteBucketTagging (params) {
   
      return await this._s3Client.send(new DeleteBucketTaggingCommand(params));
    }

  /**
   * @function putBucketTagging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
   async putBucketTagging (params) {
   
    return await this._s3Client.send(new PutBucketTaggingCommand(params));
  }


  /**
   * @function getBucketTagging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
   async putBucketTagging (params) {
   
    return await this._s3Client.send(new GetBucketTaggingCommand(params));
  }

   /**
   * @function getBucketTagging
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
    async putBucketTagging (params) {
   
      return await this._s3Client.send(new GetBucketTaggingCommand(params));
    }

  /**
   * @function deleteBucket
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
   async deleteBucket(params) {

    return await this._s3Client.send(new DeleteBucketCommand(params));
   
  }



  /**
   * @function copyObject
   * Creates a copy of the object at `copySource`
   * @param {string} options.copySource Specifies the source object for the copy operation, excluding the bucket name
   * @param {string} options.filePath The filePath of the object
   * @param {string} [options.metadata] Optional metadata to store with the object
   * @param {string} [options.metadataDirective=COPY] Optional operation directive
   * @param {string} [options.versionId=undefined] Optional versionId to copy from
   * @returns {Promise<object>} The response of the delete object operation
   */
   copyObject({bucketName, copySource, filePath, metadata, metadataDirective = MetadataDirective.COPY, versionId = undefined }) {
    const params = {
      Bucket:  this._initBucketName(bucketName),
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      VersionId: versionId
    };

    return this._s3Client.send(new CopyObjectCommand(params));
  }

  /**
   * @function deleteObject
   * Deletes the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @returns {Promise<object>} The response of the delete object operation
   */
  deleteObject({bucketName, filePath, versionId }) {
    const params = {
      Bucket:  this._initBucketName(bucketName),
      Key: filePath
    };
    if (versionId) params.VersionId = versionId;

    return this._s3Client.send(new DeleteObjectCommand(params));
  }

  /**
   * @function getBucketVersioning
   * Checks if versioning of objects is enabled on bucket
   * @returns {Boolean} true if versioning enabled otherwise false
   */
  async getBucketVersioning(bucketName) {
    const params = {
      Bucket:  this._initBucketName(bucketName)
    };
    const response = await this._s3Client.send(new GetBucketVersioningCommand(params));
    return response.Status === 'Enabled';
  }

  /**
   * @function headBucket
   * Checks if a bucket exists and if the S3Client has correct access permissions
   * @returns {Promise<object>} The response of the head bucket operation
   */
  headBucket(bucketName) {
    const params = {
      Bucket: _initBucketName(bucketName),
    };

    return this._s3Client.send(new HeadBucketCommand(params));
  }

  /**
   * @function headObject
   * Gets the object headers for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @returns {Promise<object>} The response of the head object operation
   */
  headObject({ bucketName, filePath }) {
    const params = {
      Bucket: this._initBucketName(bucketName),
      Key: filePath
    };
    return this._s3Client.send(new HeadObjectCommand(params));
  }

  /**
   * @function listObjects
   * Lists the objects in the bucket with the prefix of `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.maxKeys=2^31-1] The maximum number of keys to return
   * @returns {Promise<object>} The response of the list objects operation
   */
  listObjects({bucketName, filePath, maxKeys = MAXKEYS }) {
    const params = {
      Bucket: this._initBucketName(bucketName),
      Prefix: filePath, // Must filter via "prefix" - https://stackoverflow.com/a/56569856
      MaxKeys: maxKeys
    };

    return this._s3Client.send(new ListObjectsCommand(params));
  }

  /**
   * @function ListObjectVerseion
   * Lists the versions for the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @returns {Promise<object>} The response of the list object version operation
   */
  listObjectVersion({ bucketName, filePath }) {
    const params = {
      Bucket: this._initBucketName(bucketName),
      Prefix: filePath // Must filter via "prefix" - https://stackoverflow.com/a/56569856
    };

    return this._s3Client.send(new ListObjectVersionsCommand(params));
  }

  /**
   * @function presignUrl
   * Generates a presigned url for the `command` with a limited expiration window
   * @param {number} [expiresIn=300] The number of seconds this signed url will be valid for
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  presignUrl(command, expiresIn = defaultTempExpiresIn) { // Default expire to 5 minutes
    return getSignedUrl(this._s3Client, command, { expiresIn });
  }


   /**
   * @function createBucket
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {Object} params The filePath of the object
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
    async createBucket(data) {
      let params = {
        Bucket: data.bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: data.locationConstraint!=="us-east-1"?data.locationConstraint:""
        }
      };
      
      return await this._s3Client.send(new CreateBucketCommand(params));
      
    }


   /** 
   * @function uploadSinglePartObject
   * convert object in base64 String to buffer before uploading to s3
   * @param {string} bucketName The object uuid to delete
   * @param {string} imageDate The base64 image string 
   * @returns {Promise<object>} The result of running the read operation
   */
    async uploadSinglePartObject(bucketName,imageData) {
      let mimeType =imageData.image.split(";")[0].split(":")[1];
      const image = Buffer.from(imageData.image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      
      const objId = uuidv4();
      let keyId = getPath(objId);
      const params = {
        Bucket: this._initBucketName(bucketName),
        ContentType: mimeType,
        Key: keyId,
        Body: image,
        Metadata: {
          name: imageData.componentName,
          id: keyId
        },
        ServerSideEncryption: 'AES256'
      };
      
      return await s3StorageService.uploadSinglePartObject(params);
    }

  /**
   * @function putObject
   * Puts the object `stream` at the `id` path
   * @param {stream} options.stream The binary stream of the object
   * @param {string} options.id The filePath id of the object
   * @param {string} options.originalName The original filename of the object
   * @param {string} options.mimeType The mime type of the object
   * @param {object} [options.metadata] Optional object containing key/value pairs for metadata
   * @param {object} [options.tags] Optional object containing key/value pairs for tags
   * @returns {Promise<object>} The response of the put object operation
   */
  async putObject({bucketName, stream, id, originalName, mimeType, metadata, tags }) {
    let buffer;
    let arr=[];

    for await (const chunk of stream) {
      arr.push(chunk);
      buffer = Buffer.concat(arr);
    }
    const params = {
      Bucket: this._initBucketName(bucketName),
      ContentType: mimeType,
      Key: getPath(id),
      Body: buffer,
      Metadata: {
        ...metadata, // Take input metadata first, but always enforce name and id key behavior
        name: originalName,
        id: id
      },
      ServerSideEncryption: 'AES256'
    };

    if (tags) {
      params.Tagging = Object.entries(tags).map(([key, value]) => {
        return `${key}=${encodeURIComponent(value)}`;
      }).join('&');
    }

    return this._s3Client.send(new PutObjectCommand(params));
  }

  /**
   * @function readObject
   * Reads the object at `filePath`
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @returns {Promise<object>} The response of the get object operation
   */
  readObject({bucketName, filePath, versionId }) {
    const params = {
      Bucket: this._initBucketName(bucketName),
      Key: filePath
    };
    if (versionId) params.VersionId = versionId;

    return this._s3Client.send(new GetObjectCommand(params));
  }

  /**
   * @function readSignedUrl
   * Yields a presigned url for the get object operation with a limited expiration window
   * @param {string} options.filePath The filePath of the object
   * @param {number} [options.versionId] Optional specific versionId for the object
   * @param {number} [options.expiresIn] The number of seconds this signed url will be valid for
   * @returns {Promise<string>} A presigned url for the direct S3 REST `command` operation
   */
  readSignedUrl({bucketName, filePath, versionId, expiresIn }) {
    const expires = expiresIn ? expiresIn : defaultTempExpiresIn;
    const params = {
      Bucket: this._initBucketName(bucketName),
      Key: filePath
    };
    if (versionId) params.VersionId = versionId;


    return this.presignUrl(new GetObjectCommand(params), expires);
  }

   

}

  const bucketName =config.get('objectStorage.s3ObjectStorage.bucket');
  const endpoint=config.get('objectStorage.s3ObjectStorage.endpoint');
  const defaultTempExpiresIn=parseInt(config.get('objectStorage.s3ObjectStorage.defaultTempExpiresIn'), 10);
  const accessKeyId = config.get('objectStorage.s3ObjectStorage.accessKeyId');
  const secretAccessKey=config.get('objectStorage.s3ObjectStorage.secretAccessKey');
  const region = config.get('objectStorage.s3ObjectStorage.region');
  
  const s3StorageService = new S3StorageService(bucketName, endpoint, defaultTempExpiresIn, accessKeyId, secretAccessKey, region);

module.exports = s3StorageService;
