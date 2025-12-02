
export type WaterStation = {
    name: string;
    location: {
        lat: number;
        lng: number;
    };
};

export const waterStations: WaterStation[] = [
    {
        name: 'Aqua Pure Refill Station',
        location: { lat: 14.5547, lng: 121.0245 } // Makati
    },
    {
        name: 'Clear Flow Water',
        location: { lat: 14.5589, lng: 121.0221 } // Near Makati
    },
    {
        name: 'The Water Source BGC',
        location: { lat: 14.551, lng: 121.051 } // BGC
    },
    {
        name: 'Crystal Clear Station',
        location: { lat: 14.6033, lng: 121.0216 } // Mandaluyong
    },
    {
        name: 'Blue Wave Water',
        location: { lat: 14.6333, lng: 121.0333 } // Quezon City
    },
    {
        name: 'H2O On The Go',
        location: { lat: 14.5833, lng: 120.9667 } // Manila
    },
    {
        name: 'Pasig Purified Water',
        location: { lat: 14.5764, lng: 121.0851 } // Pasig
    }
];

export const stationMarkers = waterStations.map(station => ({
    position: station.location,
    title: station.name,
    icon: '/water-drop.png'
}));
