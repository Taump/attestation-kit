const logger = require('../utils/logger');
const { customAlphabet } = require('nanoid');

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

class SessionStore {
    constructor() {
        this.sessions = new Map();

        // {
        //     "device_address": {
        //         "wallet": "0x1234",
        //         "ts": 123456,
        //         "id": gdsgsdx,
        //     },
        // }
    }

    createSession(deviceAddress, replace = false) {
        const session = this.sessions.get(deviceAddress);

        if (this.sessions.has(deviceAddress) && !replace) {
            return session;
        } else {
            const id = customAlphabet(ALPHABET, 5)();

            const value = new Map([
                ["id", id],
                ["ts", new Date().getTime()],
            ]);


            return this.sessions.set(deviceAddress, value);
        }
    }

    setSessionWalletAddress(deviceAddress, value) {
        if (this.sessions.has(deviceAddress)) {
            const session = this.sessions.get(deviceAddress);
            session.set('address', value);
        } else {
            logger.error(`Session not found for device address: ${deviceAddress}`);
        }
    }

    deleteSessionWalletAddress(deviceAddress) {
        if (this.sessions.has(deviceAddress)) {
            const session = this.sessions.get(deviceAddress);
            session.delete('address');
        } else {
            logger.error(`Session not found for device address: ${deviceAddress}`);
        }
    }

    getSessionWalletAddress(deviceAddress) {
        if (this.sessions.has(deviceAddress)) {
            const session = this.sessions.get(deviceAddress);

            return session.get('address');
        } else {
            return null;
        }
    }

    getSession(deviceAddress) {

        if (this.sessions.has(deviceAddress)) {
            return this.sessions.get(deviceAddress);
        } else {
            return null;
        }
    }

    deleteSession(deviceAddress) {
        this.sessions.delete(deviceAddress);
    }
}

const sessionStore = new SessionStore();

// Run cleanup every hour
setInterval(() => {
    // sessionStore.cleanup();
    // TODO: Implement cleanup
}, 60 * 60 * 1000);


module.exports = sessionStore;