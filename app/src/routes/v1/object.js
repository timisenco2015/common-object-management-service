const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { objectController } = require('../../controllers');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, currentObject, currentBucket, hasPermission } = require('../../middleware/authorization');

routes.use(checkAppMode);

/** Creates new objects */
routes.post('/upload/singlepart', (req, res, next) => {
  objectController.createObjects(req, res, next);
});


/** Creates new objects */
routes.post('/upload/multipart', currentBucket, (req, res, next) => {
  objectController.createMultiPartObjects(req, res, next);
});


/** Updates an object */
routes.post('/:objId', currentObject, currentBucket, hasPermission(Permissions.UPDATE), (req, res, next) => {
  objectController.updateObject(req, res, next);
});

/** Search for objects */
routes.get('/listobjects/:folderpath?',  (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.listObjects(req, res, next);
});

/** Search for objects */
routes.get('/', requireDb, requireSomeAuth, (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.searchObjects(req, res, next);
});

/** Returns object headers */
routes.head('/:objId', currentObject, currentBucket, hasPermission(Permissions.READ), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.headObject(req, res, next);
});

/** Add metadata to an object */
routes.get('/:objId/:bucketId/metadata', currentObject, currentBucket, requireSomeAuth, (req, res, next) => {
  objectController.getBucketMetadata(req, res, next);
});


/** Add metadata to an object */
routes.patch('/:objId/metadata', currentObject, currentBucket, requireSomeAuth, (req, res, next) => {
  objectController.addMetadata(req, res, next);
});

/** Replace metadata on an object */
routes.put('/:objId/metadata', currentObject, currentBucket, requireSomeAuth, (req, res, next) => {
  objectController.replaceMetadata(req, res, next);
});

/** Deletes an objects metadata */
routes.delete('/:objId/metadata', currentObject, currentBucket, requireSomeAuth, (req, res, next) => {
  objectController.deleteMetadata(req, res, next);
});

/** Returns the object */
routes.get('/:objId', currentObject, currentBucket, hasPermission(Permissions.READ), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.readObject(req, res, next);
});

/** Updates an object */
routes.post('/:objId', currentObject, currentBucket, hasPermission(Permissions.UPDATE), (req, res, next) => {
  
  objectController.updateObject(req, res, next);
});

/** Deletes the object */
routes.delete('/:objId',currentObject, currentBucket, async (req, res, next) => {
  objectController.deleteObject(req, res, next);
});

/** Returns the object version history */
routes.get('/:objId/versions', currentObject, currentBucket, hasPermission(Permissions.READ), async (req, res, next) => {
  objectController.listObjectVersion(req, res, next);
});

/** Sets the public flag of an object */
routes.patch('/:objId/public', requireDb, currentObject, hasPermission(Permissions.MANAGE), (req, res, next) => {
  // TODO: Add validation to reject unexpected query parameters
  objectController.togglePublic(req, res, next);
});

module.exports = routes;
