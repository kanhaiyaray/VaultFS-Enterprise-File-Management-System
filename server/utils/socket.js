/**
 * utils/socket.js
 * Singleton Socket.IO instance accessor.
 * Initialized in server/index.js via setIO(io).
 * Used by controllers that need to push events without direct io access.
 */
let _io = null;

const setIO = (io) => { _io = io; };

const getIO = () => {
  if (!_io) {
    // Return a no-op stub so callers don't crash when socket isn't ready
    return {
      emit:        () => {},
      to:          () => ({ emit: () => {} }),
      in:          () => ({ fetchSockets: async () => [] }),
      fetchSockets: async () => [],
    };
  }
  return _io;
};

module.exports = { setIO, getIO };
