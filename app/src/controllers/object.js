const errorToProblem = require('../components/errorToProblem');
const objectStorageAdapter = require('../services/objectStorageAdapter')

const SERVICE = 'ObjectService';


/**
 * The Object Controller
 */
const controller = {
  

  /**
   * @function deleteObject
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   deleteObject(req, res, next) {
    try {
    
      objectStorageAdapter.deleteObject(req, res, next);
     
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },


/**
   * @function addMetadata
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 addMetadata(req, res, next) {
  try {
  
    objectStorageAdapter.addMetadata(req, res, next);
   
  } catch (e) {
    next(errorToProblem(SERVICE, e));
  }
},


/**
   * @function replaceMetadata
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 replaceMetadata(req, res, next) {
  try {
  
    objectStorageAdapter.replaceMetadata(req, res, next);
   
  } catch (e) {
    next(errorToProblem(SERVICE, e));
  }
},

/**
   * @function listObjectVersion
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 listObjectVersion(req, res, next) {
  try {
  
    objectStorageAdapter.listObjectVersion(req, res, next);
   
  } catch (e) {
    next(errorToProblem(SERVICE, e));
  }
},

/**
   * @function togglePublic
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 togglePublic(req, res, next) {
  try {
  
    objectStorageAdapter.togglePublic(req, res, next);
   
  } catch (e) {
    next(errorToProblem(SERVICE, e));
  }
},




/**
   * @function getBucketMetadata
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  getBucketMetadata(req, res, next) {
    try {
  
      objectStorageAdapter.getBucketMetadata(req, res, next);
   
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

/**
   * @function deleteMetadata
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
 deleteMetadata(req, res, next) {
  try {
  
    objectStorageAdapter.deleteMetadata(req, res, next);
   
  } catch (e) {
    next(errorToProblem(SERVICE, e));
  }
},

  
  /**
   * @function headObject
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   headObject(req, res, next) {
    try {
    
      objectStorageAdapter.headObject(req, res, next);
     
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

   /**
   * @function searchObjects
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
    searchObjects(req, res, next) {
      try {
      
        objectStorageAdapter.searchObjects(req, res, next);
       
      } catch (e) {
        next(errorToProblem(SERVICE, e));
      }
    },


  /**
   * @function updateObject
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   updateObject(req, res, next) {
    try {
    
      objectStorageAdapter.updateObject(req, res, next);
     
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function listObjects
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
   listObjects(req, res, next) {
    try {
      let folderpath = req.params.folderpath;
      objectStorageAdapter.listObjects(folderpath);
     
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
      let imageData = req.body;
      objectStorageAdapter.putObject(imageData);
     
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

  /**
   * @function getObject
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
  */
  async readObject(req, res, next) {
    try {
      objectStorageAdapter.getObject(req, res, next);
     
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }

  },

  /**
   * @function createMultiPartObjects
   * Creates new objects
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
  */
  async createMultiPartObjects(req, res, next) {
    try {  
      let result = await objectStorageAdapter.putMultipartObject(req, res, next);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },
 
};

module.exports = controller;
