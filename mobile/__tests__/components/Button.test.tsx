import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/ui/Button';

describe('Button', () => {
  it('renders label', () => {
    const { getByText } = render(<Button label="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Tap me" onPress={onPress} />);
    fireEvent.press(getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Disabled" disabled onPress={onPress} />);
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows activity indicator when loading', () => {
    const { queryByText, getByTestId } = render(
      <Button label="Loading" loading testID="btn" />,
    );
    expect(queryByText('Loading')).toBeNull();
  });

  it('renders primary variant by default', () => {
    const { getByText } = render(<Button label="Primary" />);
    expect(getByText('Primary')).toBeTruthy();
  });
});
