/**
 * SocketManager
 *
 * Singleton Socket.io client for the /game namespace.
 * Handles connection, automatic ping measurement, and question hot-swap events.
 *
 * Usage:
 *   import SocketManager from './SocketManager.js';
 *
 *   SocketManager.connect();
 *   SocketManager.joinGame('Jānis');
 *   SocketManager.reportLocation('dzintars');
 *
 *   // Listen for hot-swap overrides
 *   SocketManager.on('questions:override', ({ locationId, questionIdx, patch }) => { ... });
 *
 *   // Receive city progress
 *   SocketManager.on('city:progress', ({ pct, completed, total }) => { ... });
 */

import { io } from 'socket.io-client';


const SERVER_URL = import.meta.env.VITE_SOCKET_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `${window.location.protocol}//${window.location.hostname}:8080` : window.location.origin);


let _socket = null;
let _pingInterval = null;
const PING_INTERVAL_MS = 10_000;

/** Stored credentials for automatic room-rejoin after reconnect */
let _playerName   = null;
let _locationId   = null;
let _coopRoomId   = null;

const SocketManager = {
  /** @returns {boolean} */
  get connected() {
    return _socket?.connected ?? false;
  },

  /**
   * Connect to the /game namespace.
   * Safe to call multiple times — returns existing socket if already connected.
   * @returns {import('socket.io-client').Socket}
   */
  connect() {
    if (_socket) return _socket;

    _socket = io(`${SERVER_URL}/game`, {
      transports:           ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay:    2_000,
      timeout:              10_000,
    });

    _socket.on('connect', () => {
      this._startPing();
      // ── Co-op reconnect: re-announce player and location ──────────────────
      if (_playerName) {
        _socket.emit('player:join', { name: _playerName });
      }
      if (_locationId) {
        _socket.emit('player:location', { locationId: _locationId });
        _socket.emit('location:join', { locationId: _locationId });
      }
      if (_coopRoomId) {
        _socket.emit('coop:rejoin', { roomId: _coopRoomId });
      }
    });

    _socket.on('disconnect', () => {
      this._stopPing();
    });

    _socket.on('session:refresh', () => {
      window.location.reload();
    });

    return _socket;
  },

  /**
   * Disconnect and clean up.
   */
  disconnect() {
    this._stopPing();
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
    _playerName = null;
    _locationId = null;
    _coopRoomId = null;
  },

  /**
   * Register a game player with the server.
   * @param {string} name
   */
  joinGame(name) {
    _playerName = name;
    this.connect(); // ensure socket is initialised before emitting
    this._emit('player:join', { name });
  },

  /**
   * Notify server of current location.
   * @param {string} locationId
   */
  reportLocation(locationId) {
    _locationId = locationId;
    this._emit('player:location', { locationId });
  },

  /**
   * Store the active co-op room ID so it can be re-joined after reconnect.
   * @param {string|null} roomId
   */
  setCoopRoom(roomId) {
    _coopRoomId = roomId || null;
  },

  /**
   * Notify server of a completed location.
   * @param {string} locationId
   * @param {number} score
   * @param {number} elapsedSecs
   */
  reportComplete(locationId, score, elapsedSecs) {
    this._emit('player:complete', { locationId, score, elapsedSecs });
  },

  /**
   * Add an event listener on the underlying socket.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} unsubscribe
   */
  on(event, handler) {
    const sock = this.connect();
    sock.on(event, handler);
    return () => sock.off(event, handler);
  },

  /**
   * Emit an event if connected.
   * @param {string} event
   * @param {*} data
   */
  _emit(event, data) {
    if (_socket?.connected) {
      _socket.emit(event, data);
    }
  },

  _startPing() {
    this._stopPing();
    _pingInterval = setInterval(() => {
      const sent = Date.now();
      _socket.once('ping:ack', ({ serverTs }) => {
        const latencyMs = Math.round((Date.now() - sent) / 2);
        _socket.emit('ping:report', { latencyMs, serverTs });
      });
      _socket.emit('ping:req');
    }, PING_INTERVAL_MS);
  },

  _stopPing() {
    if (_pingInterval) {
      clearInterval(_pingInterval);
      _pingInterval = null;
    }
  },
};

export default SocketManager;
