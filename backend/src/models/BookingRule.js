class BookingRule {
  constructor({
    id,
    name,
    description,
    type,
    condition,
    action,
    isActive = true,
    priority = 1,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.type = type;
    this.condition = condition;
    this.action = action;
    this.isActive = isActive;
    this.priority = priority;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

const RULE_TYPES = {
  TIME_RESTRICTION: 'time_restriction',
  DURATION_LIMIT: 'duration_limit',
  ADVANCE_BOOKING: 'advance_booking',
  CAPACITY_LIMIT: 'capacity_limit',
  USER_LIMIT: 'user_limit',
  VENUE_SPECIFIC: 'venue_specific',
  RECURRING_BOOKING: 'recurring_booking',
  CANCELLATION_POLICY: 'cancellation_policy',
  APPROVAL_REQUIRED: 'approval_required',
  DEPOSIT_REQUIRED: 'deposit_required'
};

const RULE_ACTIONS = {
  BLOCK: 'block',
  WARN: 'warn',
  REQUIRE_APPROVAL: 'require_approval',
  APPLY_FEE: 'apply_fee',
  REQUIRE_DEPOSIT: 'require_deposit',
  LIMIT_DURATION: 'limit_duration'
};

module.exports = { BookingRule, RULE_TYPES, RULE_ACTIONS };
