
import { render, screen } from '@testing-library/react';
import GoogleMap from '@/components/google-map';

jest.mock('@googlemaps/react-wrapper');

describe('GoogleMap', () => {
  it('renders the map container', () => {
    render(<GoogleMap />);
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
  });
});

