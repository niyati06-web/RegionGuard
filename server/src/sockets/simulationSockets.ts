import { Server, Socket } from 'socket.io';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { ScenarioId } from '../types/simulation';

export function setupSimulationSockets(io: Server, engine: SimulationEngine) {
  // Broadcast state changes whenever engine ticks or state mutates
  engine.subscribe((state) => {
    io.emit('simulation:state', state);
  });

  // Broadcast new events in real time
  engine.getLogger().subscribe((event) => {
    io.emit('simulation:event', event);
  });

  io.on('connection', (socket: Socket) => {
    // Send immediate initial state on connect
    socket.emit('simulation:state', engine.getFullState());

    socket.on('command:start', () => {
      engine.start();
    });

    socket.on('command:pause', () => {
      engine.pause();
    });

    socket.on('command:step', () => {
      engine.step();
    });

    socket.on('command:reset', () => {
      engine.reset();
    });

    socket.on('command:scenario', (scenarioId: ScenarioId) => {
      try {
        engine.getScenarioRunner().runScenario(scenarioId);
      } catch (err: any) {
        socket.emit('simulation:error', { message: err.message });
      }
    });

    socket.on('command:fault', (faultData: { key: string; value: any }) => {
      engine.setFault(faultData.key as any, faultData.value);
    });

    socket.on('command:write', (payload: any) => {
      const result = engine.submitWrite(payload);
      socket.emit('write:result', result);
    });
  });
}
