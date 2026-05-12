const createCrudRoutes = require('../../utils/crud.factory');
module.exports = createCrudRoutes('tokenizationRule', { searchFields: ['rule_name'], include: { pii_type: true, method: true, tweak: true } });
