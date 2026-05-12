const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('user', { searchFields: ['full_name', 'email'], include: { role: true }, permissionModule: 'users' });
