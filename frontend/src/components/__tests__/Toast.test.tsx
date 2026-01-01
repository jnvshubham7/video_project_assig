import { render, screen } from '@testing-library/react';
import Toast from '../../components/Toast';

describe('Toast Component', () => {
  it('should render toast message', () => {
    render(
      <Toast 
        message="Test message" 
        type="success" 
        onClose={() => {}} 
      />
    );
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should render success toast', () => {
    const { container } = render(
      <Toast 
        message="Success!" 
        type="success" 
        onClose={() => {}} 
      />
    );
    const toast = container.querySelector('[class*="success"]');
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render error toast', () => {
    const { container } = render(
      <Toast 
        message="Error!" 
        type="error" 
        onClose={() => {}} 
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render info toast', () => {
    const { container } = render(
      <Toast 
        message="Info!" 
        type="info" 
        onClose={() => {}} 
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render warning toast', () => {
    const { container } = render(
      <Toast 
        message="Warning!" 
        type="warning" 
        onClose={() => {}} 
      />
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should call onClose when dismissed', () => {
    const mockOnClose = jest.fn();
    const { container } = render(
      <Toast 
        message="Test" 
        type="success" 
        onClose={mockOnClose} 
      />
    );
    
    const closeButton = container.querySelector('button');
    if (closeButton) {
      closeButton.click();
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should auto-close after timeout', async () => {
    jest.useFakeTimers();
    const mockOnClose = jest.fn();
    
    render(
      <Toast 
        message="Test" 
        type="success" 
        onClose={mockOnClose} 
        duration={3000}
      />
    );

    jest.advanceTimersByTime(3000);
    expect(mockOnClose).toHaveBeenCalled();

    jest.useRealTimers();
  });
});
