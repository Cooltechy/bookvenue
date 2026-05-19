const axios = require('axios');

class UniversityService {
  constructor() {
    this.apiUrl = process.env.UNIVERSITY_DB_API_URL || 'http://localhost:3002';
    this.apiKey = process.env.UNIVERSITY_DB_API_KEY;
  }

  async getUserByEmail(email) {
    try {
      let response;
      let retries = 6;

      while (retries > 0) {
        try {
          response = await axios.get(
            `${this.apiUrl}/api/users/email/${email}`,
            {
              headers: {
                'x-api-key': this.apiKey
              },
              timeout: 10000 // 10s timeout to fail fast on Render's initial proxy drop
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

          // Wait 10 seconds before retrying (Render takes up to 60s to wake up)
          await new Promise(resolve => setTimeout(resolve, 10000));
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
