const models = {
  // Tables
  IdentityProvider: require('./tables/identityProvider'),
  ObjectModel: require('./tables/objectModel'),
  BucketModel: require('./tables/Bucket'),
  BucketPermission: require('./tables/bucketPermission'),
  ObjectPermission: require('./tables/objectPermission'),
  Permission: require('./tables/permission'),
  User: require('./tables/user'),
  Version:require('./tables/version')

  // Views
};

module.exports = models;
