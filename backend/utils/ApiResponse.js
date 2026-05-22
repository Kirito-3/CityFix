/**
 * Standardized API Response structure.
 * Encapsulates all successful API responses in a uniform envelope.
 */
export class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (typically 200, 201)
   * @param {any} data - Response payload (object, array, string, etc.)
   * @param {string} message - Human-readable message detailing response purpose
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export default ApiResponse;
