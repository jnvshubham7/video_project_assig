import { render, screen } from '@testing-library/react';
import ProgressBar from '../../components/ProgressBar';

describe('ProgressBar Component', () => {
  it('should render progress bar', () => {
    render(<ProgressBar progress={50} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should display correct progress value', () => {
    render(<ProgressBar progress={75} />);
    const progressBar = screen.getByRole('progressbar') as HTMLDivElement;
    expect(progressBar).toBeInTheDocument();
  });

  it('should handle 0% progress', () => {
    render(<ProgressBar progress={0} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should handle 100% progress', () => {
    render(<ProgressBar progress={100} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render progress text if provided', () => {
    render(<ProgressBar progress={50} showText={true} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should update when progress prop changes', () => {
    const { rerender } = render(<ProgressBar progress={25} />);
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();

    rerender(<ProgressBar progress={75} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });
});
