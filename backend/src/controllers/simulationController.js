const simulationService = require('../services/simulationService');
const logger = require('../utils/logger');

/**
 * Controller for Emergency Scenario Simulator
 */
class SimulationController {
  /**
   * POST /api/simulation/run
   * Executes in-memory synthetic scenario simulation against live baseline
   */
  async runSimulation(req, res, next) {
    try {
      const results = await simulationService.runSimulation(req.body);
      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (err) {
      logger.error('Error in runSimulation controller:', err.message);
      next(err);
    }
  }

  /**
   * POST /api/simulation/apply
   * Explicitly commits simulated scenario to live PostgreSQL database
   */
  async applySimulation(req, res, next) {
    try {
      const result = await simulationService.applySimulation(req.body, req.user);
      return res.status(201).json({
        success: true,
        message: 'Scenario simulation successfully applied to live database.',
        data: result
      });
    } catch (err) {
      logger.error('Error in applySimulation controller:', err.message);
      next(err);
    }
  }

  /**
   * POST /api/simulation/cleanup
   * Releases all synthetic reservation holds and cancels synthetic emergency requests
   */
  async cleanupSimulation(req, res, next) {
    try {
      const result = await simulationService.cleanupSimulation(req.user);
      return res.status(200).json({
        success: true,
        message: 'Synthetic simulation data cleaned up and resource holds released.',
        data: result
      });
    } catch (err) {
      logger.error('Error in cleanupSimulation controller:', err.message);
      next(err);
    }
  }
}

module.exports = new SimulationController();
