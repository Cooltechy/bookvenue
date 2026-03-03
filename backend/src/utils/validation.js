const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUniversityEmail = (email) => {
  // Check basic email format first
  if (!validateEmail(email)) {
    return false;
  }
  
  // Check if email is lowercase
  if (email !== email.toLowerCase()) {
    return false;
  }
  
  // Check if email ends with @uohyd.ac.in (must be lowercase)
  const universityDomain = '@uohyd.ac.in';
  return email.endsWith(universityDomain);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateTimeFormat = (time) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

module.exports = {
  validateEmail,
  validateUniversityEmail,
  validatePassword,
  validateTimeFormat
};
