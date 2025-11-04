
'use client';

import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "./ui/skeleton";

const mapStyles = [
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#7c93a3"
            },
            {
                "lightness": "-10"
            }
        ]
    },
    {
        "featureType": "administrative.country",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "administrative.country",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#a0a4a5"
            }
        ]
    },
    {
        "featureType": "administrative.province",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#62838e"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#f2f2f2"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#f2f2f2"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "color": "#d9d9d9"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "color": "#aadaff"
            },
            {
                "visibility": "on"
            }
        ]
    }
];

const render = (status: Status, error?: Error) => {
    if (error && error.message.includes("InvalidKeyMapError")) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-destructive/10 text-destructive text-sm text-center p-4">
                <p className="font-bold">Map Error: Invalid API Key</p>
                <p className="text-xs mt-1">The provided Google Maps API key is not enabled for the 'Maps JavaScript API'. Please enable it in the Google Cloud Console.</p>
            </div>
        );
    }
    if (status === Status.FAILURE) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-destructive/10 text-destructive text-sm text-center p-4">
                <p className="font-bold">Could not load map.</p>
                <p className="text-xs mt-1">Please check the API key and network connection.</p>
            </div>
        );
    }
    return <Skeleton className="h-full w-full" />;
};

function MapComponent({
  address,
  zoom,
}: {
  address: string;
  zoom: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();

  useEffect(() => {
    const geocodeAddress = async () => {
      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const location = results[0].geometry.location;
            const newCenter = { lat: location.lat(), lng: location.lng() };
            if (ref.current && !map) {
              const newMap = new window.google.maps.Map(ref.current, {
                center: newCenter,
                zoom,
                styles: mapStyles,
                mapId: "SMART_REFILL_MAP",
              });
              setMap(newMap);
              new google.maps.Marker({
                position: newCenter,
                map: newMap,
              });
            } else if (map) {
              map.setCenter(newCenter);
            }
          } else {
            console.error(
              `Geocode was not successful for the following reason: ${status}`
            );
          }
        });
      } catch (e) {
        console.error(e);
      }
    };
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
        geocodeAddress();
    }
  }, [address, zoom, map]);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}


export function GoogleMap({ address, zoom = 15 }: { address: string, zoom?: number }) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const [wrapperError, setWrapperError] = useState<Error | undefined>(undefined);
    
    if (!apiKey) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-muted-foreground text-sm text-center p-4">
                <p className="font-semibold">Google Maps API Key is missing.</p>
                <p>Please add your key to the .env file to enable map functionality.</p>
            </div>
        );
    }
    
    const handleWrapperStatusChange = (status: Status, loader: any) => {
        if (status === Status.FAILURE) {
            // The `e` object from the 'error' event on the script tag is not directly available here.
            // We have to listen for it on the window.
            const errorListener = (event: ErrorEvent) => {
                // Check if the error is from the Google Maps script
                if (event.filename && event.filename.includes('maps.googleapis.com')) {
                    if (event.message.includes("InvalidKeyMapError")) {
                        setWrapperError(new Error("InvalidKeyMapError"));
                    } else {
                        setWrapperError(new Error(event.message));
                    }
                }
            };

            window.addEventListener('error', errorListener);

            // Clean up the listener
            return () => {
                window.removeEventListener('error', errorListener);
            };
        }
    };

    return (
        <Wrapper apiKey={apiKey} render={(status) => render(status, wrapperError)} libraries={['geocoding']} onError={(e) => {
             // This onError is for network-level errors, but InvalidKeyMapError is a script execution error.
             // We use the window.addEventListener approach to catch it.
        }}>
            <MapComponent address={address} zoom={zoom} />
        </Wrapper>
    );
}
