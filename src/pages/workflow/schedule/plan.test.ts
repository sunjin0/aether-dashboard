import { parsePlan } from './plan';
describe('schedule frequency display', () => {
  it('recognizes supported frequencies', () => {
    expect(parsePlan('0 25 9 * * MON-FRI')).toEqual({
      type: 'WEEKDAYS',
      hour: 9,
      minute: 25,
      weekday: 'MON-FRI',
    });
    expect(parsePlan('0 */15 * * * *').type).toBe('EVERY_15_MINUTES');
  });
  it('preserves unsupported schedules instead of converting them to daily', () => {
    for (const cron of ['0 0 9 1 * *', '0 */5 9 * * *', '0 70 9 * * *', 'bad'])
      expect(parsePlan(cron).type).toBe('CUSTOM');
  });
});
