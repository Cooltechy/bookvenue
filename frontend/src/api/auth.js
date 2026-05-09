import apiClient from './client'

export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  verifyUniversityEmail: (email) => apiClient.get(`/auth/verify-university-email/${email}`),
}
