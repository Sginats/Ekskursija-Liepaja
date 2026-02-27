/**
 * @typedef {Object} PlayerRecord
 * @property {string} socketId - Unique socket connection ID
 * @property {string} name - Player name
 * @property {number} score - Current total score
 * @property {string|null} currentLocation - ID of current location (if in minigame)
 * @property {number} locationsCompleted - Count of completed locations
 * @property {number} joinedAt - Timestamp when player joined
 * @property {number} lastActive - Timestamp of last event
 * @property {number|null} latencyMs - Ping latency (one-way approx)
 * @property {boolean} flagged - True if anti-cheat flagged the player
 */

/**
 * @typedef {Object} LobbyState
 * @property {string} code - 4-digit join code
 * @property {string[]} playerIds - IDs of players in this lobby
 * @property {string} hostId - ID of the lobby host
 * @property {number} createdAt - Creation timestamp
 */

/**
 * @typedef {Object} ScorePayload
 * @property {string} locationId - ID of the location
 * @property {number} score - Points awarded
 * @property {number} elapsedSecs - Time taken for the task
 */

/**
 * @typedef {Object} CoopSession
 * @property {string} sessionId - Unique session ID
 * @property {string} locationId - ID of the shared location
 * @property {string} navigatorId - ID of the Navigator (sees code)
 * @property {string} operatorId - ID of the Operator (inputs code)
 * @property {string} status - 'active' | 'completed' | 'failed'
 * @property {string} [code] - 4-digit code (if asym)
 */

/**
 * @typedef {Object} QuestionData
 * @property {string} text - The question text
 * @property {string[]} [options] - MCQ options if applicable
 * @property {string} answer - The correct answer
 * @property {string[]} [aliases] - Alternative correct answers
 * @property {number[]} points - [points_1st_attempt, points_2nd_attempt]
 * @property {string} fact - Educational fact shown after completion
 */

export {};
