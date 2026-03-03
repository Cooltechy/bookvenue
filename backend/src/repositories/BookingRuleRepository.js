const { BookingRule, RULE_TYPES, RULE_ACTIONS } = require('../models/BookingRule');
const { v4: uuidv4 } = require('uuid');

class BookingRuleRepository {
  constructor() {
    this.rules = new Map();
    this.initializeDefaultRules();
  }

  initializeDefaultRules() {
    const defaultRules = [
      {
        id: uuidv4(),
        name: 'Minimum Advance Notice',
        description: 'Bookings must be made at least 7 days in advance',
        type: RULE_TYPES.ADVANCE_BOOKING,
        condition: {
          minDays: 7
        },
        action: RULE_ACTIONS.BLOCK,
        isActive: true,
        priority: 10
      },
      {
        id: uuidv4(),
        name: 'Maximum Booking Duration',
        description: 'Single booking cannot exceed 8 hours',
        type: RULE_TYPES.DURATION_LIMIT,
        condition: {
          maxHours: 8
        },
        action: RULE_ACTIONS.BLOCK,
        isActive: true,
        priority: 9
      },
      {
        id: uuidv4(),
        name: 'Business Hours Only',
        description: 'Bookings only allowed between 8 AM and 6 PM',
        type: RULE_TYPES.TIME_RESTRICTION,
        condition: {
          startTime: '08:00',
          endTime: '18:00'
        },
        action: RULE_ACTIONS.BLOCK,
        isActive: true,
        priority: 8
      },
      {
        id: uuidv4(),
        name: 'Weekend Approval Required',
        description: 'Weekend bookings require admin approval',
        type: RULE_TYPES.APPROVAL_REQUIRED,
        condition: {
          weekends: true
        },
        action: RULE_ACTIONS.REQUIRE_APPROVAL,
        isActive: true,
        priority: 7
      },
      {
        id: uuidv4(),
        name: 'Maximum 3 Bookings Per User Per Week',
        description: 'Users cannot have more than 3 active bookings per week',
        type: RULE_TYPES.USER_LIMIT,
        condition: {
          maxBookingsPerWeek: 3
        },
        action: RULE_ACTIONS.BLOCK,
        isActive: true,
        priority: 6
      },
      {
        id: uuidv4(),
        name: 'Cancellation Policy - 24 Hours',
        description: 'Bookings can only be cancelled 24 hours before start time',
        type: RULE_TYPES.CANCELLATION_POLICY,
        condition: {
          minCancellationHours: 24
        },
        action: RULE_ACTIONS.BLOCK,
        isActive: true,
        priority: 5
      }
    ];

    defaultRules.forEach(ruleData => {
      const rule = new BookingRule(ruleData);
      this.rules.set(rule.id, rule);
    });
  }

  async create(ruleData) {
    const rule = new BookingRule({
      id: uuidv4(),
      ...ruleData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    this.rules.set(rule.id, rule);
    return rule;
  }

  async findById(id) {
    return this.rules.get(id) || null;
  }

  async findAll() {
    return Array.from(this.rules.values())
      .sort((a, b) => b.priority - a.priority);
  }

  async findActive() {
    return Array.from(this.rules.values())
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  async findByType(type) {
    return Array.from(this.rules.values())
      .filter(rule => rule.type === type && rule.isActive)
      .sort((a, b) => b.priority - a.priority);
  }

  async update(id, updates) {
    const rule = this.rules.get(id);
    if (!rule) return null;

    const updatedRule = new BookingRule({
      ...rule,
      ...updates,
      id: rule.id,
      createdAt: rule.createdAt,
      updatedAt: new Date()
    });
    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  async delete(id) {
    return this.rules.delete(id);
  }

  async toggleActive(id) {
    const rule = this.rules.get(id);
    if (!rule) return null;

    rule.isActive = !rule.isActive;
    rule.updatedAt = new Date();
    this.rules.set(id, rule);
    return rule;
  }
}

module.exports = new BookingRuleRepository();
