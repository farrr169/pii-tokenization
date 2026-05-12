const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('permission', { searchFields: ['permission_name', 'module_name'] });
