import { render, screen } from '@testing-library/react';
import App from '../src/App';
import { BrowserRouter } from 'react-router-dom';

// Mock any context providers if needed
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe('App Component', () => {
  test('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // This is a very basic test - just checking if the component renders
    expect(document.body).toBeTruthy();
  });
});
