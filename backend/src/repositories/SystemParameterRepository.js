const SystemParameter = require('../models/SystemParameter');

class SystemParameterRepository {
  static async findByKey(key) {
    return SystemParameter.findOne({ key });
  }

  static async updateByKey(key, value) {
    return SystemParameter.findOneAndUpdate(
      { key },
      { value, updatedAt: new Date() },
      { new: true, upsert: true }
    );
  }

  static async initializeDefaults() {
    const defaults = [
      { key: 'ADVANCE_NOTICE_DAYS', value: '1', description: 'Minimum days in advance for booking' }
    ];

    for (const param of defaults) {
      await SystemParameter.findOneAndUpdate(
        { key: param.key },
        param,
        { upsert: true }
      );
    }
  }
}

module.exports = SystemParameterRepository;
