// In-memory queue for managing booking requests
class BookingQueueRepository {
  constructor() {
    this.queues = new Map();
  }

  addToQueue(venueId, userId, date, startTime) {
    if (!this.queues.has(venueId)) {
      this.queues.set(venueId, []);
    }
    const queue = this.queues.get(venueId);
    queue.push({ userId, date, startTime, timestamp: Date.now() });
    return { position: queue.length, venueId };
  }

  getQueueStatus(venueId) {
    const queue = this.queues.get(venueId) || [];
    return { venueId, queueLength: queue.length };
  }

  getUserQueuePosition(venueId, userId) {
    const queue = this.queues.get(venueId) || [];
    const position = queue.findIndex(item => item.userId === userId);
    return { position: position >= 0 ? position + 1 : null, venueId };
  }

  processNextBooking(venueId) {
    const queue = this.queues.get(venueId) || [];
    if (queue.length === 0) return null;
    return queue.shift();
  }

  getAllQueuesStatus() {
    const status = {};
    for (const [venueId, queue] of this.queues.entries()) {
      status[venueId] = queue.length;
    }
    return status;
  }
}

module.exports = new BookingQueueRepository();
