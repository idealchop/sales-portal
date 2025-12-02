
'use client';

import { useEffect, useRef, useState, memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { MapPin, AlertTriangle } from "lucide-react";
import { Wrapper, Status } from "@googlemaps/react-wrapper";

export type MapMarker = {
    position: google.maps.LatLngLiteral;
    title: string;
    icon?: string;
};

const render = (status: Status, apiKey: string) => {
    switch (status) {
        case Status.LOADING:
            return <Skeleton className="h-full w-full" />;
        case Status.FAILURE:
            return (
                <div className="h-full w-full flex flex-col items-center justify-center bg-destructive/10 text-destructive text-sm text-center p-4">
                    <AlertTriangle className="h-8 w-8 mb-2" />
                    <p className="font-bold">Could not load map.</p>
                    <p className="text-xs mt-1">This may be due to an invalid API key or network issues. Please check your Google Cloud Console configuration and ensure the key is correct.</p>
                </div>
            );
        case Status.SUCCESS:
            return null;
    }
};

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

function Map({
  address,
  zoom,
  onAddressChange,
  additionalMarkers = [],
}: {
  address: string;
  zoom: number;
  onAddressChange: (address: string) => void;
  additionalMarkers?: MapMarker[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [mainMarker, setMainMarker] = useState<google.maps.Marker>();
  const [otherMarkers, setOtherMarkers] = useState<google.maps.Marker[]>([]);
  const geocoderRef = useRef<google.maps.Geocoder>();

  useEffect(() => {
    if (ref.current && !map) {
      const newMap = new window.google.maps.Map(ref.current, {
        center: { lat: 14.5995, lng: 120.9842 }, // Default to Manila
        zoom,
        styles: mapStyles,
        mapId: "SMART_REFILL_MAP",
      });
      setMap(newMap);
      geocoderRef.current = new google.maps.Geocoder();
    }
  }, [ref, map, zoom]);

  useEffect(() => {
    if (map && !mainMarker) {
      const newMainMarker = new google.maps.Marker({
        map,
        draggable: true,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#007bff",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
        },
        zIndex: 10
      });

      newMainMarker.addListener('dragend', () => {
        const newPosition = newMainMarker.getPosition();
        if (newPosition && geocoderRef.current) {
          geocoderRef.current.geocode({ location: newPosition }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              onAddressChange(results[0].formatted_address);
            } else {
              console.error(`Reverse geocode failed: ${status}`);
            }
          });
        }
      });
      setMainMarker(newMainMarker);
    }
  }, [map, mainMarker, onAddressChange]);

  useEffect(() => {
    if (map && mainMarker && address && geocoderRef.current) {
      geocoderRef.current.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          map.setCenter(location);
          mainMarker.setPosition(location);
        } else {
          console.error(`Geocode was not successful for "${address}" for the following reason: ${status}`);
        }
      });
    }
  }, [address, map, mainMarker]);

  useEffect(() => {
    if (map) {
      otherMarkers.forEach(marker => marker.setMap(null));
      const newMarkers = additionalMarkers.map(markerInfo => 
        new google.maps.Marker({ ...markerInfo, map })
      );
      setOtherMarkers(newMarkers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, additionalMarkers]);

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}


export function GoogleMap({
  address,
  onAddressChange,
  zoom = 15,
  additionalMarkers,
}: {
  address: string,
  onAddressChange: (address: string) => void,
  zoom?: number,
  additionalMarkers?: MapMarker[],
}) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-muted p-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Google Maps API Key is Missing</AlertTitle>
                    <AlertDescription>
                        To enable map functionality, please add your Google Maps API key to the 
                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">.env</code> 
                        file as <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_KEY</code>.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <Wrapper apiKey={apiKey} render={(status) => render(status, apiKey)} libraries={['geocoding', 'marker', 'places']} onError={(error) => {
            if (error.message.includes("InvalidKeyMapError")) {
                 return (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-destructive/10 text-destructive text-sm text-center p-4">
                        <AlertTriangle className="h-8 w-8 mb-2" />
                        <p className="font-bold">Invalid Google Maps API Key</p>
                        <p className="text-xs mt-1">The provided API key is invalid or has incorrect restrictions. Please verify your key in the Google Cloud Console.</p>
                    </div>
                );
            }
            return <p>{error.message}</p>
        }}>
            <Map
                address={address} 
                zoom={zoom} 
                onAddressChange={onAddressChange}
                additionalMarkers={additionalMarkers}
            />
        </Wrapper>
    );
}
