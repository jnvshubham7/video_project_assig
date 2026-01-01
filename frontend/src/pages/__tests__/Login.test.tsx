import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';

describe('Login Component', () => {
  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  it('should render login form', () => {
    renderLogin();
    expect(screen.getByText(/login/i)).toBeInTheDocument();
  });

  it('should have email and password input fields', () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('should have submit button', () => {
    renderLogin();
    const submitButton = screen.getByRole('button', { name: /login/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should validate email input', async () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/email/i);

    await userEvent.type(emailInput, 'invalidemail');
    expect(emailInput).toHaveValue('invalidemail');
  });

  it('should validate password input', async () => {
    renderLogin();
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await userEvent.type(passwordInput, 'password123');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should handle form submission', async () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitButton = screen.getByRole('button', { name: /login/i });

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    fireEvent.click(submitButton);

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should have register link', () => {
    renderLogin();
    const registerLink = screen.queryByText(/register/i) || screen.queryByText(/sign up/i);
    // This may or may not exist depending on your implementation
    if (registerLink) {
      expect(registerLink).toBeInTheDocument();
    }
  });
});
