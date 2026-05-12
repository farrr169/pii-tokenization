const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('systemSetting', { permissionModule: 'settings' });
