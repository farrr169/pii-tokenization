const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('tweak', { searchFields: ['tweak_name'] });
