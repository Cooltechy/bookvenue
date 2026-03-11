const axios = require('axios');

class UniversityService {
  constructor() {
    this.apiUrl = process.env.UNIVERSITY_DB_API_URL || 'http://localhost:3002';
    this.apiKey = process.env.UNIVERSITY_DB_API_KEY;
  }

  async getUserByEmail(email) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/users/email/${email}`,
        {
          headers: {
            'x-api-key': this.apiKey
          }
        }
      );
      
      return response.data.user;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('Error fetching user from university DB:', error.message);
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
