const express = require('express');
const reportService = require('../services/ReportService');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/utilization', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const report = await reportService.getSystemUtilizationReport();
    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
