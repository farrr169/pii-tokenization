const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('tokenizationJob', { searchFields: ['job_name'] });
