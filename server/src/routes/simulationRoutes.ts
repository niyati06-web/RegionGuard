import { Router, Request, Response } from 'express';
import { SimulationEngine } from '../simulation/SimulationEngine';
import {
  WriteRequestSchema,
  FaultInjectionSchema,
  DnsConfigSchema,
  PromotionPolicySchema,
} from '../validation/schemas';
import { ReportGenerator } from '../simulation/ReportGenerator';
import { ScenarioId } from '../types/simulation';

export function createSimulationRouter(engine: SimulationEngine): Router {
  const router = Router();

  // GET /api/health
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'RegionGuard Failover Controller API',
      version: '1.0.0',
      problemStatement: 'PS 23',
      timestamp: new Date().toISOString(),
    });
  });

  // GET /api/simulation/state
  router.get('/simulation/state', (req: Request, res: Response) => {
    res.json(engine.getFullState());
  });

  // GET /api/simulation/metrics
  router.get('/simulation/metrics', (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    res.json(engine.getMetrics().getHistory(limit));
  });

  // GET /api/simulation/events
  router.get('/simulation/events', (req: Request, res: Response) => {
    const { severity, component, eventType, search, limit } = req.query;
    const events = engine.getLogger().getEvents({
      severity: severity as string,
      component: component as string,
      eventType: eventType as string,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(events);
  });

  // GET /api/simulation/scenarios
  router.get('/simulation/scenarios', (req: Request, res: Response) => {
    res.json(engine.getScenarioRunner().getScenarios());
  });

  // POST /api/simulation/start
  router.post('/simulation/start', (req: Request, res: Response) => {
    engine.start();
    res.json({ message: 'Simulation started', state: engine.getFullState() });
  });

  // POST /api/simulation/pause
  router.post('/simulation/pause', (req: Request, res: Response) => {
    engine.pause();
    res.json({ message: 'Simulation paused', state: engine.getFullState() });
  });

  // POST /api/simulation/resume
  router.post('/simulation/resume', (req: Request, res: Response) => {
    engine.start();
    res.json({ message: 'Simulation resumed', state: engine.getFullState() });
  });

  // POST /api/simulation/step
  router.post('/simulation/step', (req: Request, res: Response) => {
    engine.step();
    res.json({ message: 'Simulation stepped 1 tick forward', state: engine.getFullState() });
  });

  // POST /api/simulation/reset
  router.post('/simulation/reset', (req: Request, res: Response) => {
    engine.reset();
    res.json({ message: 'Simulation reset to baseline', state: engine.getFullState() });
  });

  // POST /api/simulation/scenario/:id
  router.post('/simulation/scenario/:id', (req: Request, res: Response) => {
    const scenarioId = req.params.id as ScenarioId;
    try {
      const result = engine.getScenarioRunner().runScenario(scenarioId);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  });

  // POST /api/simulation/faults
  router.post('/simulation/faults', (req: Request, res: Response) => {
    const parse = FaultInjectionSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    }

    const faults = parse.data;
    for (const [key, val] of Object.entries(faults)) {
      if (val !== undefined) {
        engine.setFault(key as any, val);
      }
    }

    res.json({ message: 'Faults applied', faults: engine.getFullState().faults });
  });

  // POST /api/simulation/faults/clear
  router.post('/simulation/faults/clear', (req: Request, res: Response) => {
    engine.clearFaults();
    res.json({ message: 'All faults cleared', faults: engine.getFullState().faults });
  });

  // POST /api/simulation/write
  router.post('/simulation/write', (req: Request, res: Response) => {
    const parse = WriteRequestSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    }

    const result = engine.submitWrite(parse.data);
    res.json(result);
  });

  // POST /api/simulation/failback
  router.post('/simulation/failback', (req: Request, res: Response) => {
    const result = engine.getFailoverController().initiateManualFailback(engine.getFullState().simulationTime);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // POST /api/simulation/dns/config
  router.post('/simulation/dns/config', (req: Request, res: Response) => {
    const parse = DnsConfigSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    }

    const { ttlSeconds, propagationDelaySeconds, providerType } = parse.data;
    if (ttlSeconds !== undefined) engine.getDnsSimulator().setTtl(ttlSeconds);
    if (propagationDelaySeconds !== undefined) engine.getDnsSimulator().setPropagationDelay(propagationDelaySeconds);
    if (providerType !== undefined) engine.getDnsSimulator().setProviderType(providerType);

    res.json({ message: 'DNS configuration updated', dns: engine.getDnsSimulator().getState() });
  });

  // POST /api/simulation/policy
  router.post('/simulation/policy', (req: Request, res: Response) => {
    const parse = PromotionPolicySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: 'Validation failed', details: parse.error.issues });
    }

    engine.getReplicationSimulator().setPromotionPolicy(parse.data.policy);
    res.json({ message: 'Promotion policy updated', policy: parse.data.policy });
  });

  // GET /api/simulation/report
  router.get('/simulation/report', (req: Request, res: Response) => {
    const reportData = ReportGenerator.generateReportData(engine.getFullState(), engine.getLogger());
    res.json(reportData);
  });

  // GET /api/simulation/report/html
  router.get('/simulation/report/html', (req: Request, res: Response) => {
    const reportData = ReportGenerator.generateReportData(engine.getFullState(), engine.getLogger());
    const html = ReportGenerator.generateHtmlReport(reportData);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  // GET /api/simulation/export/json
  router.get('/simulation/export/json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="regionguard-audit-log.json"');
    res.send(engine.getLogger().exportJson());
  });

  // GET /api/simulation/export/csv
  router.get('/simulation/export/csv', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="regionguard-audit-log.csv"');
    res.send(engine.getLogger().exportCsv());
  });

  return router;
}
