require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');

const PORT = process.env.PORT || 3002;




(async () => {
  //connect db
  await connectDB();
  //start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();