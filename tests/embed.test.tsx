import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmbedPage from '../app/embed/page';

describe('EmbedPage (mockup de reservas)', () => {
  it('renders the reservation fields', () => {
    render(<EmbedPage />);
    expect(screen.getByText('Habitaciones')).toBeInTheDocument();
    expect(screen.getByText('Adultos')).toBeInTheDocument();
    expect(screen.getByText('Niños')).toBeInTheDocument();
    expect(screen.getByText('July 2026')).toBeInTheDocument();
  });

  it('posts a close message to the parent window when close is clicked', () => {
    const spy = vi.spyOn(window.parent, 'postMessage');
    render(<EmbedPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(spy).toHaveBeenCalledWith({ type: 'sdk-drawer', action: 'close' }, '*');
    spy.mockRestore();
  });

  it('posts a close message to the parent window when Escape is pressed', () => {
    const spy = vi.spyOn(window.parent, 'postMessage');
    render(<EmbedPage />);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(spy).toHaveBeenCalledWith({ type: 'sdk-drawer', action: 'close' }, '*');
    spy.mockRestore();
  });

  it('applies the accent color from the url query param', () => {
    window.history.replaceState({}, '', '/embed?accent=%23ff0000');
    render(<EmbedPage />);
    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
    window.history.replaceState({}, '', '/');
  });
});
