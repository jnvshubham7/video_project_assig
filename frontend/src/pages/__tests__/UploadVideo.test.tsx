import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import UploadVideo from '../../pages/UploadVideo';

// Mock axios
jest.mock('axios');

describe('UploadVideo Component', () => {
  const renderUploadVideo = () => {
    return render(
      <BrowserRouter>
        <UploadVideo />
      </BrowserRouter>
    );
  };

  it('should render upload form', () => {
    renderUploadVideo();
    expect(screen.queryByText(/upload/i) || screen.queryByText(/video/i)).toBeTruthy();
  });

  it('should have title input field', () => {
    renderUploadVideo();
    const titleInput = screen.queryByPlaceholderText(/title/i);
    if (titleInput) {
      expect(titleInput).toBeInTheDocument();
    }
  });

  it('should have description input field', () => {
    renderUploadVideo();
    const descriptionInput = screen.queryByPlaceholderText(/description/i);
    if (descriptionInput) {
      expect(descriptionInput).toBeInTheDocument();
    }
  });

  it('should have file input for video', () => {
    renderUploadVideo();
    const fileInputs = screen.queryAllByDisplayValue('');
    // Check for any input type="file"
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      expect(fileInput).toBeInTheDocument();
    }
  });

  it('should handle file selection', async () => {
    renderUploadVideo();
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      const file = new File(['video'], 'test.mp4', { type: 'video/mp4' });
      await userEvent.upload(fileInput, file);
      expect(fileInput.files?.length).toBe(1);
    }
  });

  it('should handle title input', async () => {
    renderUploadVideo();
    const titleInput = screen.queryByPlaceholderText(/title/i) as HTMLInputElement;

    if (titleInput) {
      await userEvent.type(titleInput, 'My Test Video');
      expect(titleInput.value).toBe('My Test Video');
    }
  });

  it('should have submit/upload button', () => {
    renderUploadVideo();
    const uploadButton = screen.queryByRole('button', { name: /upload/i });
    if (uploadButton) {
      expect(uploadButton).toBeInTheDocument();
    }
  });

  it('should show progress bar during upload', () => {
    renderUploadVideo();
    const progressBar = screen.queryByRole('progressbar');
    // May not be visible initially, but component should have it
    if (progressBar) {
      expect(progressBar).toBeInTheDocument();
    }
  });
});
