const eventBus = require('ocore/event_bus.js');

const { ErrorWithMessage } = require("../utils/ErrorWithMessage");
const Validation = require("../utils/Validation");
const walletSessionStore = require("./walletSessionStore");

module.exports = async (from_address, data) => {
    if (Validation.isWalletAddress(data)) {
        const session = walletSessionStore.getSession(from_address);

        if (!session) throw new ErrorWithMessage("Session not found. But It's impossible here");

        walletSessionStore.setSessionWalletAddress(from_address, data);
        eventBus.emit('ATTESTATION_KIT_ADDED_ADDRESS', from_address, data);
    } else {
        throw new ErrorWithMessage("Invalid wallet address.");
    }
};
