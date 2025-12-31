import './ProgressBar.css';

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ progress, label, showPercentage = true }: ProgressBarProps) {
  return (
    <div className="progress-bar-container">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <div className="progress-percentage">{Math.round(progress)}%</div>
      )}
    </div>
  );
}
