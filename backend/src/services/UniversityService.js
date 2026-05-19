const axios = require('axios');

class UniversityService {
  constructor() {
    this.apiUrl = process.env.UNIVERSITY_DB_API_URL || 'http://localhost:3002';
    this.apiKey = process.env.UNIVERSITY_DB_API_KEY;
  }

  async getUserByEmail(email) {
    try {
      let response;
      let retries = 3;

      while (retries > 0) {
        try {
          response = await axios.get(
            `${this.apiUrl}/api/users/email/${email}`,
            {
              headers: {
                'x-api-key': this.apiKey
              },
              timeout: 30000 // Force 30s timeout per attempt
            }
          );
          break; // Success
        } catch (err) {
          if (err.response && err.response.status === 404) {
            return null; // Return null natively for 404
          }
          retries--;
          console.error(`University DB fetch failed. Retries left: ${retries}. Error:`, err.message);
          if (retries === 0) throw err;

          // Wait 3 seconds before retrying to let the Render cold-start finish
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      return response.data.user;
    } catch (error) {
      console.error('Final error fetching user from university DB:', error.message);
      throw new Error('Unable to connect to university database');
    }
  }

  async verifyUserByEmail(email) {
    const user = await this.getUserByEmail(email);
    return {
      exists: !!user,
      user: user || null,
      message: user ? 'User found' : 'User not found in university database'
    };
  }
}

module.exports = new UniversityService();
