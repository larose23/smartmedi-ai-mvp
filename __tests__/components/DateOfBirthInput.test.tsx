import { render, screen, fireEvent } from '@testing-library/react';
import { DateOfBirthInput } from '@/components/DateOfBirthInput';

describe('DateOfBirthInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders with default values', () => {
    render(<DateOfBirthInput onChange={mockOnChange} />);
    
    expect(screen.getByLabelText('Month')).toBeInTheDocument();
    expect(screen.getByLabelText('Day')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
  });

  it('initializes with provided value', () => {
    render(<DateOfBirthInput value="1990-05-15" onChange={mockOnChange} />);
    
    expect(screen.getByLabelText('Month')).toHaveValue('5');
    expect(screen.getByLabelText('Day')).toHaveValue('15');
    expect(screen.getByLabelText('Year')).toHaveValue('1990');
  });

  it('calls onChange with valid date', () => {
    render(<DateOfBirthInput onChange={mockOnChange} />);
    
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '6' } });
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '1995' } });

    expect(mockOnChange).toHaveBeenCalledWith('1995-06-20');
  });

  it('does not call onChange with invalid date', () => {
    render(<DateOfBirthInput onChange={mockOnChange} />);
    
    fireEvent.change(screen.getByLabelText('Month'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Day'), { target: { value: '30' } }); // Invalid date
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2023' } });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('displays error message when provided', () => {
    render(<DateOfBirthInput onChange={mockOnChange} error="Invalid date" />);
    
    expect(screen.getByText('Invalid date')).toBeInTheDocument();
  });
}); 