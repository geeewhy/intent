import { apiLogger } from '../infra/logger/apiLogger';
import { setLoggerAccessor } from '../core/logger';

setLoggerAccessor(() => apiLogger);

export default apiLogger;