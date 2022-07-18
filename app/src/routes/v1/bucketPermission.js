const routes = require('express').Router();

const { Permissions } = require('../../components/constants');
const { buckerPermissionController } = require('../../controllers');
const { bucketPermissionValidator } = require('../../validators');
const { checkAppMode, currentBucket, hasBucketPermission } = require('../../middleware/authorization');
const { requireSomeAuth, requireDb } = require('../../middleware/featureToggle');

routes.use(checkAppMode);
routes.use(requireDb);

/** Search for object permissions */
routes.get('/', requireSomeAuth, bucketPermissionValidator.searchPermissions, (req, res, next) => {
  
  buckerPermissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
routes.get('/:bucketId/:userId?', requireSomeAuth, bucketPermissionValidator.listPermissions, currentBucket, hasBucketPermission(Permissions.READ), (req, res, next) => {
  buckerPermissionController.listPermissions(req, res, next);
});



/** Grants object permissions to users */
routes.put('/:bucketId', requireSomeAuth, bucketPermissionValidator.addPermissions, currentBucket, hasBucketPermission(Permissions.CREATE), (req, res, next) => {
  buckerPermissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
routes.delete('/:bucketId', requireSomeAuth, bucketPermissionValidator.removePermissions, currentBucket, hasBucketPermission(Permissions.DELETE), (req, res, next) => {
  buckerPermissionController.removePermissions(req, res, next);
});

module.exports = routes;
