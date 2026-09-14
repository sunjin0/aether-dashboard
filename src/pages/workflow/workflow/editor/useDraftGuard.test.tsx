const React = require('react');
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import useDraftGuard from './useDraftGuard';
import { allowRouteLeave } from '@/utils/routeLeaveGuard';

const mockUnblock = jest.fn();
let mockBlock: (transition: { retry: () => void }) => void;
jest.mock('@umijs/max', () => ({
  history: {
    block: (block: typeof mockBlock) => {
      mockBlock = block;
      return mockUnblock;
    },
  },
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));
jest.mock('react-activation', () => ({ useActivate: () => {}, useUnactivate: () => {} }));
const path = '/workflow/workflow/test';
function Harness({ save, discard }: { save: () => Promise<boolean>; discard: () => void }) {
  return useDraftGuard(true, save, discard, path);
}
describe('draft navigation protection', () => {
  it('keeps the user in the editor when saving fails', async () => {
    const save = jest.fn().mockResolvedValue(false);
    const retry = jest.fn();
    render(<Harness save={save} discard={jest.fn()} />);
    act(() => mockBlock({ retry }));
    fireEvent.click(await screen.findByText('pages.workflowUX.saveLeave'));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(retry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('pages.workflowUX.stay'));
    expect(retry).not.toHaveBeenCalled();
  });
  it('guards cache eviction and resolves cancellation without discarding', async () => {
    const discard = jest.fn();
    render(<Harness save={jest.fn()} discard={discard} />);
    let result: boolean | Promise<boolean> = true;
    act(() => {
      result = allowRouteLeave(path);
    });
    fireEvent.click(await screen.findByText('pages.workflowUX.stay'));
    expect(await result).toBe(false);
    expect(discard).not.toHaveBeenCalled();
  });
  it('discards only after an explicit choice and resumes navigation', async () => {
    const discard = jest.fn();
    const retry = jest.fn();
    render(<Harness save={jest.fn()} discard={discard} />);
    act(() => mockBlock({ retry }));
    fireEvent.click(await screen.findByText('pages.workflowUX.discard'));
    expect(discard).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
