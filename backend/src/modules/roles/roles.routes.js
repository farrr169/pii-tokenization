const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('role', { searchFields: ['role_name'] });
