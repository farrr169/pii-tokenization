const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('tokenizationMethod', { searchFields: ['method_name'] });
