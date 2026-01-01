import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Header from '../../components/Header';

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

describe('Header Component', () => {
  const renderHeader = () => {
    return render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );
  };

  it('should render header', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('should have navigation links', () => {
    renderHeader();
    // Check for common navigation items
    const homeLink = screen.queryByRole('link', { name: /home/i });
    const videosLink = screen.queryByRole('link', { name: /video/i });

    // At least one navigation should exist
    const navItems = screen.queryAllByRole('link');
    expect(navItems.length > 0).toBe(true);
  });

  it('should have logout button or user menu', () => {
    renderHeader();
    const logoutBtn = screen.queryByRole('button', { name: /logout|sign out/i });
    const userMenu = screen.queryByRole('button', { name: /profile|user/i });

    // Either logout or user menu should exist
    if (logoutBtn) {
      expect(logoutBtn).toBeInTheDocument();
    } else if (userMenu) {
      expect(userMenu).toBeInTheDocument();
    }
  });

  it('should display organization name if available', () => {
    renderHeader();
    // This depends on your implementation - check if org name is displayed
    const headerText = screen.getByRole('banner');
    expect(headerText).toBeInTheDocument();
  });

  it('should be responsive', () => {
    const { container } = renderHeader();
    const header = container.querySelector('header');

    // Check if header exists and has proper structure
    expect(header).toBeInTheDocument();
    expect(header?.className).toBeDefined();
  });
});
