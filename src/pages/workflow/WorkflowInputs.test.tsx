const React = require('react');
import { Form } from 'antd';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WorkflowInputs, { inputValue, submittedValue } from './WorkflowInputs';

jest.mock('@umijs/max', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));
describe('typed workflow inputs', () => {
  it('preserves booleans and objects when preparing and submitting values', () => {
    expect(submittedValue({ name: 'flag', type: 'boolean' }, false)).toBe(false);
    expect(
      submittedValue(
        { name: 'data', type: 'object' },
        inputValue({ name: 'data', type: 'object' }, { a: 2 }),
      ),
    ).toEqual({ a: 2 });
  });
  it('blocks a required blank field and invalid structured input', async () => {
    const finish = jest.fn();
    render(
      <Form onFinish={finish}>
        <WorkflowInputs
          fields={[
            { name: 'order', label: 'Order', required: true },
            { name: 'data', label: 'Data', type: 'object' },
          ]}
        />
        <button type="submit">Run</button>
      </Form>,
    );
    fireEvent.click(screen.getByText('Run'));
    await screen.findByText('pages.workflowUX.requiredField');
    expect(finish).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Order'), { target: { value: 'A-1' } });
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '[]' } });
    fireEvent.click(screen.getByText('Run'));
    await screen.findByText('pages.workflowUX.invalidJson');
    expect(finish).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '{"amount":10}' } });
    fireEvent.click(screen.getByText('Run'));
    await waitFor(() => expect(finish).toHaveBeenCalled());
  });
});
