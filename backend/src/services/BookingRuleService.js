const bookingRuleRepository = require('../repositories/BookingRuleRepository');
const { RULE_TYPES, RULE_ACTIONS } = require('../models/BookingRule');

class BookingRuleService {
  async validateBooking(bookingData, user, existingBookings = []) {
    const rules = await bookingRuleRepository.findActive();
    const violations = [];
    const warnings = [];
    const requirements = [];

    for (const rule of rules) {
      try {
        const result = await this.evaluateRule(rule, bookingData, user, existingBookings);
        if (result.violated) {
          switch (rule.action) {
            case RULE_ACTIONS.BLOCK:
              violations.push({
                rule: rule.name,
                message: result.message,
                type: 'error'
              });
              break;
            case RULE_ACTIONS.WARN:
              warnings.push({
                rule: rule.name,
                message: result.message,
                type: 'warning'
              });
              break;
            case RULE_ACTIONS.REQUIRE_APPROVAL:
              requirements.push({
                rule: rule.name,
                message: result.message,
                type: 'approval_required',
                requiresApproval: true
              });
              break;
            case RULE_ACTIONS.APPLY_FEE:
              requirements.push({
                rule: rule.name,
                message: result.message,
                type: 'fee_required',
                fee: result.fee || 0
              });
              break;
            case RULE_ACTIONS.REQUIRE_DEPOSIT:
              requirements.push({
                rule: rule.name,
                message: result.message,
                type: 'deposit_required',
                deposit: result.deposit || 0
              });
              break;
          }
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.name}:`, error);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      requirements,
      canProceed: violations.length === 0,
      requiresApproval: requirements.some(r => r.requiresApproval)
    };
  }

  async evaluateRule(rule, bookingData, user, existingBookings) {
    const { startTime, endTime, venueId } = bookingData;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    switch (rule.type) {
      case RULE_TYPES.ADVANCE_BOOKING:
        return this.checkAdvanceBooking(rule, start, now);
      case RULE_TYPES.DURATION_LIMIT:
        return this.checkDurationLimit(rule, start, end);
      case RULE_TYPES.TIME_RESTRICTION:
        return this.checkTimeRestriction(rule, start, end);
      case RULE_TYPES.USER_LIMIT:
        return this.checkUserLimit(rule, user, existingBookings, start);
      case RULE_TYPES.APPROVAL_REQUIRED:
        return this.checkApprovalRequired(rule, start);
      case RULE_TYPES.CANCELLATION_POLICY:
        return this.checkCancellationPolicy(rule, start, now);
      case RULE_TYPES.VENUE_SPECIFIC:
        return this.checkVenueSpecific(rule, venueId, bookingData);
      default:
        return { violated: false };
    }
  }

  checkAdvanceBooking(rule, startTime, now) {
    const { minDays } = rule.condition;
    const daysUntilBooking = (startTime - now) / (1000 * 60 * 60 * 24);

    if (daysUntilBooking < minDays) {
      return {
        violated: true,
        message: `Bookings must be made at least ${minDays} days in advance. Current booking is only ${Math.round(daysUntilBooking)} days in advance.`
      };
    }
    return { violated: false };
  }

  checkDurationLimit(rule, startTime, endTime) {
    const { maxHours } = rule.condition;
    const durationHours = (endTime - startTime) / (1000 * 60 * 60);

    if (durationHours > maxHours) {
      return {
        violated: true,
        message: `Booking duration cannot exceed ${maxHours} hours. Requested duration is ${durationHours.toFixed(1)} hours.`
      };
    }
    return { violated: false };
  }

  checkTimeRestriction(rule, startTime, endTime) {
    const { startTime: allowedStart, endTime: allowedEnd } = rule.condition;
    const bookingStart = startTime.toTimeString().slice(0, 5);
    const bookingEnd = endTime.toTimeString().slice(0, 5);

    if (bookingStart < allowedStart || bookingEnd > allowedEnd) {
      return {
        violated: true,
        message: `Bookings are only allowed between ${allowedStart} and ${allowedEnd}. Your booking is from ${bookingStart} to ${bookingEnd}.`
      };
    }
    return { violated: false };
  }

  checkUserLimit(rule, user, existingBookings, startTime) {
    const { maxBookingsPerWeek } = rule.condition;
    const weekStart = new Date(startTime);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const bookingsThisWeek = existingBookings.filter(booking => {
      const bookingDate = new Date(booking.startTime);
      // booking.userId might be populated (object) or just an ID
      const bookingUserId = booking.userId._id ? booking.userId._id.toString() : booking.userId.toString();
      return bookingUserId === user.id.toString() &&
        bookingDate >= weekStart &&
        bookingDate < weekEnd &&
        booking.status === 'confirmed';
    });

    if (bookingsThisWeek.length >= maxBookingsPerWeek) {
      return {
        violated: true,
        message: `You cannot have more than ${maxBookingsPerWeek} bookings per week. You currently have ${bookingsThisWeek.length} bookings this week.`
      };
    }
    return { violated: false };
  }

  checkApprovalRequired(rule, startTime) {
    const { weekends } = rule.condition;
    const dayOfWeek = startTime.getDay();

    if (weekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return {
        violated: true,
        message: 'Weekend bookings require admin approval before confirmation.'
      };
    }
    return { violated: false };
  }

  checkCancellationPolicy(rule, startTime, now) {
    const { minCancellationHours } = rule.condition;
    const hoursUntilBooking = (startTime - now) / (1000 * 60 * 60);

    if (hoursUntilBooking < minCancellationHours) {
      return {
        violated: true,
        message: `Bookings can only be cancelled at least ${minCancellationHours} hours before the start time.`
      };
    }
    return { violated: false };
  }

  checkVenueSpecific(rule, venueId, bookingData) {
    return { violated: false };
  }

  // Admin methods
  async createRule(ruleData) {
    return await bookingRuleRepository.create(ruleData);
  }

  async getAllRules() {
    return await bookingRuleRepository.findAll();
  }

  async getActiveRules() {
    return await bookingRuleRepository.findActive();
  }

  async getRuleById(id) {
    return await bookingRuleRepository.findById(id);
  }

  async updateRule(id, updates) {
    return await bookingRuleRepository.update(id, updates);
  }

  async deleteRule(id) {
    return await bookingRuleRepository.delete(id);
  }

  async toggleRuleActive(id) {
    return await bookingRuleRepository.toggleActive(id);
  }

  async getRulesByType(type) {
    return await bookingRuleRepository.findByType(type);
  }
}

module.exports = new BookingRuleService();
