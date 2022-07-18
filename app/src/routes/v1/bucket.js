const routes = require('express').Router();

const { bucketController } = require('../../controllers');
const { requireDb, requireSomeAuth } = require('../../middleware/featureToggle');
const { checkAppMode, currentBucket, currentObject, hasPermission } = require('../../middleware/authorization');

routes.use(checkAppMode);


/** Creates new objects */
routes.post('/',requireSomeAuth, (req, res, next) => {

  bucketController.createBucket(req, res, next);
});

/** Creates new objects */
routes.get('/list',requireSomeAuth, (req, res, next) => {

  bucketController.listBuckets(req, res, next);
});

/** Creates new objects */
routes.get('/:bucketId',requireSomeAuth, (req, res, next) => {

  bucketController.getBucket(req, res, next);
});

/** toggle bucket toggle attribute */
routes.put('/:bucketId/:isPublic',requireSomeAuth, (req, res, next) => {
  bucketController.publicToggle(req, res, next);
});

/** toggle bucket toggle attribute */
routes.put('/:bucketId/:isVersioningEnabled/versioning', currentBucket, requireSomeAuth, (req, res, next) => {
  bucketController.toggleBucketVersioning(req, res, next);
});








module.exports = routes;
