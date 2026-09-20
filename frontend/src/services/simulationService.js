import { apiClient } from './apiClient';

/**
 * Service for Emergency Scenario Simulator (Synthetic Simulation Mode)
 */
export const simulationService = {
  /**
   * Run an in-memory scenario simulation against live baseline telemetry
   * @param {Object} params - { casesCount, icuDemand, generalBedDemand, ventilatorDemand, bloodDemand, scenarioName, location, incidentCategory }
   */
  async runSimulation(params) {
    const res = await apiClient.post('/simulation/run', params);
    return res.data;
  },

  /**
   * Explicitly apply a simulated scenario to the live PostgreSQL database
   * @param {Object} payload - { simulated_requests, scenario_name, simulation_id }
   */
  async applySimulation(payload) {
    const res = await apiClient.post('/simulation/apply', payload);
    return res.data;
  },

  /**
   * Clean up and release all synthetic simulation requests and resource holds
   */
  async cleanupSimulation() {
    const res = await apiClient.post('/simulation/cleanup');
    return res.data;
  }
};
