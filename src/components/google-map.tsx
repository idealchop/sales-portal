
'use client';

import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "./ui/skeleton";

const render = (status: Status) => {
    if (status === Status.FAILURE) return <p>Error loading map</p>;
    return <Skeleton className="h-full w-full" />;
};

function MapComponent({
    center,
    zoom,
}: {
    center: google.maps.LatLngLiteral;
    zoom: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map>();

    useEffect(() => {
        if (ref.current && !map) {
            setMap(new window.google.maps.Map(ref.current, {
                center,
                zoom,
                mapId: 'SMART_REFILL_MAP'
            }));
        }
    }, [ref, map, center, zoom]);

     useEffect(() => {
        if (map) {
            new google.maps.Marker({
                position: center,
                map: map,
            });
        }
    }, [map, center]);

    return <div ref={ref} style={{ width: '100%', height: '100%' }} />;
}


export function GoogleMap({ address, zoom = 15 }: { address: string, zoom?: number }) {
    const [center, setCenter] = useState<google.maps.LatLngLiteral | null>(null);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    useEffect(() => {
        const geocodeAddress = async () => {
            if (!apiKey) return;
            try {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ address }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        const location = results[0].geometry.location;
                        setCenter({ lat: location.lat(), lng: location.lng() });
                    } else {
                        console.error(`Geocode was not successful for the following reason: ${status}`);
                    }
                });
            } catch (e) {
                 console.error(e);
            }
        };

        if (window.google) {
            geocodeAddress();
        }
    }, [address, apiKey]);

    if (!apiKey) {
        return <div className="h-full w-full flex items-center justify-center bg-muted text-muted-foreground text-sm">API Key Missing</div>;
    }

    return (
        <Wrapper apiKey={apiKey} render={render}>
            {center ? <MapComponent center={center} zoom={zoom} /> : <Skeleton className="h-full w-full" />}
        </Wrapper>
    );
}
