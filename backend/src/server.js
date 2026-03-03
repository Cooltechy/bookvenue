require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');


port = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen( port , () => {
    console.log(`Server running on ${port}`);
  });
})();