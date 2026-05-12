// pii-types.routes.js
const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('piiType', {
  searchFields: ['name', 'category'],
  permissionModule: 'pii_types',
});
