const dbService = require('./db');
const logger = require('./utils/logger');

module.exports = async (func = () => { }) => {
    if (typeof func !== 'function') {
        logger.error('typeof func isn\'t a function', typeof func);
        throw new TypeError('Argument must be a function');
    }

    return new Promise((resolve, reject) => {
        require('./walletHandlers')(async () => {
            try {
                logger.info('Starting obyte attestation service...');
                await dbService.initialize();
                const result = await func();
                resolve(result);
            } catch (error) {
                logger.error('Service initialization failed:', error);
                reject(error);
            }
        });
    });
}

process.on('unhandledRejection', up => { throw up });
