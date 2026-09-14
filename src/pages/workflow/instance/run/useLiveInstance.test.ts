import { act, renderHook } from '@testing-library/react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import useLiveInstance from './useLiveInstance';
jest.mock('@umijs/max', () => ({ getLocale: () => 'zh-CN' }));
jest.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: jest.fn(() => Promise.resolve()),
}));
describe('live run recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());
  it.each(['WAITING_EVENT', 'WAITING_DELAY', 'WAITING_USER', 'WAITING_SUBFLOW'])(
    'polls %s after SSE fails, and cancels on unmount',
    (status) => {
      const refresh = jest.fn();
      const { result, unmount } = renderHook(() =>
        useLiveInstance('instance', status, true, refresh, jest.fn()),
      );
      const options = (fetchEventSource as jest.Mock).mock.calls[0][1];
      act(() => {
        expect(options.onerror(new Error('offline'))).toBe(3000);
      });
      expect(result.current).toBe('reconnecting');
      act(() => jest.advanceTimersByTime(3000));
      expect(refresh).toHaveBeenCalledTimes(1);
      unmount();
      expect(options.signal.aborted).toBe(true);
      act(() => jest.advanceTimersByTime(6000));
      expect(refresh).toHaveBeenCalledTimes(1);
    },
  );
  it('does not subscribe for terminal or inactive runs', () => {
    const { rerender } = renderHook(
      ({ status, active }) => useLiveInstance('instance', status, active, jest.fn(), jest.fn()),
      { initialProps: { status: 'COMPLETED', active: true } },
    );
    rerender({ status: 'RUNNING', active: false });
    expect(fetchEventSource).not.toHaveBeenCalled();
  });
});
