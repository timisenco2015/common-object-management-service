const Problem = require('api-problem');
const config = require('config');

const log = require('../components/log')(module.filename);
const { AuthMode, AuthType, Permissions } = require('../components/constants');
const { getAppAuthMode, getCurrentSubject, getPath } = require('../components/utils');
const {s3StorageService} = require('../services/storages')
const { objectService, permissionService,  bucketPermissionService, bucketService } = require('../services');

/**
 * @function checkAppMode
 * Rejects the request if the incoming authentication mode does not match the application mode
 * @param {object} req Express request object
 * @param {object} res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const checkAppMode = (req, res, next) => {
  const authMode = getAppAuthMode();
  const authType = req.currentUser ? req.currentUser.authType : undefined;

  try {
    if (authMode === AuthMode.BASICAUTH && authType === AuthType.BEARER) {
      throw new Error('Basic auth mode does not support Bearer type auth');
    } else if (authMode === AuthMode.OIDCAUTH && authType === AuthType.BASIC) {
      throw new Error('Oidc auth mode does not support Basic type auth');
    }
  } catch (err) {
    log.verbose(err.message, { function: 'checkAppMode', authMode: authMode, authType: authType });
    return new Problem(501, {
      detail: 'Current application mode does not support incoming authentication type',
      authMode: authMode,
      authType: authType
    }).send(res);
  }

  next();
};

/**
 * @function currentObject
 * Injects a currentObject object to the request if there is an applicable object record
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
const currentObject = async (req, _res, next) => {
  try {
    if (req.params.objId) {
      req.currentObject = Object.freeze({
        ...await objectService.read(req.params.objId),
        ...await s3StorageService.listObjectVersion({ filePath: getPath(req.params.objId) })
      });
    }
  } catch (err) {
    log.warn(err.message, { function: 'currentObject' });
  }

  next();
};



/**
 * @function currentBucket
 * Injects a currentObject object to the request if there is an applicable object record
 * @param {object} req Express request object
 * @param {object} _res Express response object
 * @param {function} next The next callback function
 * @returns {function} Express middleware function
 */
 const currentBucket = async (req, _res, next) => {
  try {
    if (req.query.bucketId || req.params.bucketId) {
      req.currentBucket = Object.freeze({
        ...await bucketService.read(req.query.bucketId?req.query.bucketId:req.params.bucketId),
      });
    }
  } catch (err) {
    log.warn(err.message, { function: 'currentBucket' });
  }

  next();
};

/**
 * @function hasPermission
 * Checks if the current user is authorized to perform the operation
 * @param {string} permission The permission to check against
 * @returns {function} Express middleware function
 */
const hasPermission = (permission) => {
  return async (req, res, next) => {
    const authMode = getAppAuthMode();
    const authType = req.currentUser ? req.currentUser.authType : undefined;
    const userId = getCurrentSubject(req.currentUser);

    const canBasicMode = (mode) => [AuthMode.BASICAUTH, AuthMode.FULLAUTH].includes(mode);
    const canOidcMode = (mode) => [AuthMode.OIDCAUTH, AuthMode.FULLAUTH].includes(mode);

    try {
      if (!config.has('db.enabled') || !canOidcMode(authMode)) {
        log.debug('Current application mode does not enforce permission checks', { function: 'hasPermission' });
      } else if (!req.currentObject) {
        // Force 403 on unauthorized or not found; do not allow 404 id brute force discovery
        throw new Error('Missing object record');
      } else if (authType === AuthType.BASIC && canBasicMode(authMode)) {
        log.debug('Basic authTypes are always permitted', { function: 'hasPermission' });
      } else if (req.currentObject.public && permission === Permissions.READ) {
        log.debug('Read requests on public objects are always permitted', { function: 'hasPermission' });
      } else {
        // Guard against unauthorized access for all other cases
        if (authType === AuthType.BEARER && userId) {
          // Check if user has the required permission in their permission set
          const permissions = await permissionService.searchPermissions({
            objId: req.params.objId,
            userId: userId
          });

          if (!permissions.some(p => p.permCode === permission)) {
            throw new Error(`User lacks permission '${permission}' on object '${req.params.objId}'`);
          }
        } else {
          throw new Error('Missing user identification');
        }
      }
    } catch (err) {
      log.verbose(err.message, { function: 'hasPermission' });
      return new Problem(403, { detail: 'User lacks permission to complete this action' }).send(res);
    }

    next();
  };
};

/**
 * @function hasBucketPermission
 * Checks if the current user is authorized to perform the operation
 * @param {string} permission The permission to check against
 * @returns {function} Express middleware function
 */
 const hasBucketPermission = (permission) => {
  return async (req, res, next) => {
    const authMode = getAppAuthMode();
    const authType = req.currentUser ? req.currentUser.authType : undefined;
    const userId = getCurrentSubject(req.currentUser);

    const canBasicMode = (mode) => [AuthMode.BASICAUTH, AuthMode.FULLAUTH].includes(mode);
    const canOidcMode = (mode) => [AuthMode.OIDCAUTH, AuthMode.FULLAUTH].includes(mode);

    try {
      if (!config.has('db.enabled') || !canOidcMode(authMode)) {
        log.debug('Current application mode does not enforce permission checks', { function: 'hasPermission' });
      } else if (!req.currentBucket) {
        // Force 403 on unauthorized or not found; do not allow 404 id brute force discovery
        throw new Error('Missing object record');
      } else if (authType === AuthType.BASIC && canBasicMode(authMode)) {
        log.debug('Basic authTypes are always permitted', { function: 'hasPermission' });
      } else if (req.currentBucket.public && permission === Permissions.READ) {
        log.debug('Read requests on public objects are always permitted', { function: 'hasPermission' });
      } else {
        // Guard against unauthorized access for all other cases
        if (authType === AuthType.BEARER && userId) {
          // Check if user has the required permission in their permission set
          const permissions = await bucketPermissionService.searchPermissions({
            bucketId: req.params.bucketId,
            userId: userId
          });

          if (!permissions.some(p => p.permCode === permission)) {
            throw new Error(`User lacks permission '${permission}' on object '${req.params.bucketId}'`);
          }
        } else {
          throw new Error('Missing user identification');
        }
      }
    } catch (err) {
      log.verbose(err.message, { function: 'hasPermission' });
      return new Problem(403, { detail: 'User lacks permission to complete this action' }).send(res);
    }

    next();
  };
};

module.exports = {
  checkAppMode, currentObject, hasPermission, hasBucketPermission, currentBucket
};
