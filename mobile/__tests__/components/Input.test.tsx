import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../src/components/ui/Input';

describe('Input', () => {
  it('renders label', () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows error message', () => {
    const { getByText } = render(<Input error="Required" />);
    expect(getByText('Required')).toBeTruthy();
  });

  it('renders prefix', () => {
    const { getByText } = render(<Input prefix="$" />);
    expect(getByText('$')).toBeTruthy();
  });

  it('calls onChangeText on input', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" onChangeText={onChange} />,
    );
    fireEvent.changeText(getByPlaceholderText('Enter text'), 'hello');
    expect(onChange).toHaveBeenCalledWith('hello');
  });
});
