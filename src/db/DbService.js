const db = require('ocore/db');

const Validation = require('../utils/Validation');
const { ErrorWithMessage } = require('../utils/ErrorWithMessage');
const logger = require('../utils/logger');

/**
 * DbService class provides methods to interact with the database for social attestations.
 */
class DbService {
    /**
     * Creates a new attestation order.
     * @param {string} serviceProvider - The name of the service provider.
     * @param {object} data - The user's data to attest. (maximum 4 key-value pairs)
     * @param {boolean} [allowDuplicates=true] - Whether to allow duplicate orders.
     * @returns {Promise<number>} The ID of the inserted attestation order.
     * @throws {ErrorWithMessage} Throws an error if validation fails or if the order already exists.
     */
    static async createAttestationOrder(serviceProvider, data, allowDuplicates = true) {
        if (!Validation.isDataObject(data)) return new ErrorWithMessage('Invalid data object', { code: 'INVALID_DATA', data });

        const order = await DbService.getAttestationOrders({ serviceProvider, data, excludeAttested: allowDuplicates });

        if (!order) {
            const dataValues = Object.values(data);
            const dataKeys = Object.keys(data);

            const { insertId } = await db.query(`INSERT INTO ATTESTATION_KIT_attestations (service_provider, ${dataKeys.map((_v, index) => `dataKey${index}`).join(',')}, ${dataValues.map((_v, index) => `dataValue${index}`).join(',')}) VALUES (?, ${dataKeys.map(() => '?').join(',')}, ${dataValues.map(() => '?').join(',')})`, [serviceProvider, ...dataKeys, ...dataValues.map((v) => String(v))]);

            return insertId;

        } else if (!allowDuplicates) {
            throw new ErrorWithMessage('Order already exists', { code: 'ALREADY_EXISTS', status: order.status, username, user_id: userId, user_address: order.user_wallet_address, unit: order.unit });
        } else {
            return order.id
        }
    }

    /**
     * Removes the wallet address from an attestation order.
     * @param {string} serviceProvider - The name of the service provider.
     * @param {object} data - The user's data (maximum 4 key-value pairs).
     * @returns {Promise<void>}
     * @throws {ErrorWithMessage} Throws an error if validation fails or if the order cannot be modified.
     */
    static async removeWalletAddressInAttestationOrder(serviceProvider, data, address) {
        if (!Validation.isServiceProvider(serviceProvider)) throw new ErrorWithMessage('Invalid service provider', { code: 'INVALID_DATA' });
        if (!Validation.isDataObject(data)) return new ErrorWithMessage('Invalid data object', { code: 'INVALID_DATA', data });

        const order = await DbService.getAttestationOrders({ serviceProvider, data, address, excludeAttested: true });

        if (order) {
            if (!order.user_wallet_address) throw new ErrorWithMessage('User address is not found', { code: 'ADDRESS_NOT_FOUND' });

            if (order.status !== 'addressed') throw new ErrorWithMessage('Address is attested', { code: 'ALREADY_ATTESTED' });

            await db.query("UPDATE ATTESTATION_KIT_attestations SET user_wallet_address = NULL, status = 'pending' WHERE service_provider = ? AND id = ?", [serviceProvider, order.id]);
        } else {
            throw new ErrorWithMessage('Order not found or already attested', { code: 'ADDRESS_NOT_FOUND' });
        }
    }


    /**
     * Updates the wallet address for an attestation order.
     * @param {string} serviceProvider - The name of the service provider.
     * @param {object} data - The user's data to attest (maximum 4 key-value pairs).
     * @param {string} walletAddress - The new wallet address.
     * @returns {Promise<void>}
     * @throws {ErrorWithMessage} Throws an error if validation fails or if the order does not exist.
     */
    static async updateWalletAddressInAttestationOrder(serviceProvider, data, walletAddress) {
        if (Validation.isServiceProvider(serviceProvider) && Validation.isWalletAddress(walletAddress) && Validation.isDataObject(data)) {
            const order = await DbService.getAttestationOrders({
                serviceProvider,
                data,
                excludeAttested: true
            });

            if (order) {
                if (order.status === 'attested') throw new ErrorWithMessage('Address is already attested', { code: 'ALREADY_ATTESTED' });

                await db.query("UPDATE ATTESTATION_KIT_attestations SET user_wallet_address = ?, status = 'addressed' WHERE service_provider = ? AND status != 'attested' AND id = ? ", [walletAddress, serviceProvider, order.id]);
            } else {
                throw new ErrorWithMessage('Order not found', { code: 'ORDER_NOT_FOUND' });
            }
        } else {
            throw new ErrorWithMessage('Error occurred during address update', { code: 'INVALID_DATA' });
        }
    }

    /**
     * Updates the unit and changes the status of an attestation order.
     * @param {string} serviceProvider - The name of the service provider.
     * @param {object} data - The user's data (maximum 4 key-value pairs).
     * @param {string} address - The wallet address.
     * @param {string} unit - The unit identifier.
     * @returns {Promise<void>}
     * @throws {ErrorWithMessage} Throws an error if validation fails or if the order does not exist.
     */
    static async updateUnitAndChangeStatus(serviceProvider, data, address, unit) {
        if (Validation.isServiceProvider(serviceProvider) && Validation.isUnit(unit) && Validation.isWalletAddress(address) && Validation.isDataObject(data)) {
            const order = await DbService.getAttestationOrders({
                serviceProvider,
                data,
                address,
                excludeAttested: true
            });

            if (order) {
                await db.query("UPDATE ATTESTATION_KIT_attestations SET unit = ?, status = 'attested' WHERE service_provider = ? AND id = ? AND user_wallet_address = ?", [unit, serviceProvider, order.id, address]);
            } else {
                throw new ErrorWithMessage('Order not found', { code: 'ORDER_NOT_FOUND' });
            }

        } else {
            throw new ErrorWithMessage('Invalid  data', { code: 'INVALID_DATA', data });
        }
    }

    /**
     * Retrieves attestation orders based on provided filters.
     * @param {Object} filters - Filters for the query.
     * @param {string} filters.serviceProvider - The name of the service provider.
     * @param {string} [filters.data] - The user's data to attest (maximum 4 key-value pairs).
     * @param {string} [filters.address] - The wallet address (optional).
     * @param {boolean} [filters.excludeAttested=false] - Whether to exclude attested orders.
     * @param {boolean} [multiple=false] - Whether to return multiple rows or just the first one.
     * @returns {Promise<object[]|object|null>} The attestation orders (array or single object) or null if not found.
     * @throws {ErrorWithMessage} Throws an error if validation fails.
     */
    static async getAttestationOrders(filters, multiple = false) {
        const {
            serviceProvider,
            data, // for ex: {userId, username}
            address,
            excludeAttested = false,
        } = filters;

        if (!Validation.isServiceProvider(serviceProvider)) {
            throw new ErrorWithMessage('Invalid service provider', { code: "INVALID_DATA" });
        }

        if (address && !Validation.isWalletAddress(address)) throw new ErrorWithMessage('Invalid wallet address', { code: "INVALID_DATA" });

        if (!Validation.isDataObject(data)) return new ErrorWithMessage('Invalid data object', { code: 'INVALID_DATA', data });

        // Building the query dynamically based on filters
        let query = 'SELECT * FROM ATTESTATION_KIT_attestations WHERE service_provider = ?';
        const queryParams = [serviceProvider];

        Object.entries(data).forEach(([key, value]) => {
            query += ` AND (dataKey0 = ? AND dataValue0 = ?) OR (dataKey1 = ? AND dataValue1 = ?) OR (dataKey2 = ? AND dataValue2 = ?) OR (dataKey3 = ? AND dataValue3 = ?) `;
            queryParams.push(key, value, key, value, key, value, key, value);
        });

        if (address) {
            query += ' AND user_wallet_address = ?';
            queryParams.push(address);
        }

        if (excludeAttested) {
            query += ' AND status != "attested"';
        }

        // Execute the query
        const attestationRows = await db.query(query, queryParams);

        // Return results based on `multiple` flag
        if (multiple) {
            return attestationRows;
        } else {
            return attestationRows[0] || null;
        }
    }
}


module.exports = DbService;