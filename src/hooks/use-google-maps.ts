
'use client';

import { useState, useEffect } from 'react';

const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-script';
let isScriptLoaded = false;
let loadingPromise: Promise<void> | null = null;
const loadedListeners: (() => void)[] = [];
const errorListeners: ((error: Error) => void)[] = [];

const loadScript = (apiKey: string): Promise<void> => {
    if (isScriptLoaded) {
        return Promise.resolve();
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            // Don't run on server
            return resolve();
        }
        
        if (document.getElementById(GOOGLE_MAPS_SCRIPT_ID)) {
            isScriptLoaded = true;
            return resolve();
        }

        const script = document.createElement('script');
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding,marker,places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            isScriptLoaded = true;
            loadingPromise = null;
            loadedListeners.forEach(listener => listener());
            resolve();
        };
        
        script.onerror = () => {
            loadingPromise = null;
            const error = new Error('Failed to load Google Maps script.');
            errorListeners.forEach(listener => listener(error));
            reject(error);
        };

        document.head.appendChild(script);
    });

    return loadingPromise;
};

export function useGoogleMaps() {
    const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
    const [loadError, setLoadError] = useState<Error | null>(null);

    useEffect(() => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            setLoadError(new Error("Google Maps API key is not configured."));
            return;
        }

        if (isScriptLoaded) {
            setIsLoaded(true);
            return;
        }

        const handleLoaded = () => setIsLoaded(true);
        const handleError = (error: Error) => setLoadError(error);

        loadedListeners.push(handleLoaded);
        errorListeners.push(handleError);

        loadScript(apiKey).catch(handleError);

        return () => {
            // Clean up listeners
            const loadedIndex = loadedListeners.indexOf(handleLoaded);
            if (loadedIndex > -1) {
                loadedListeners.splice(loadedIndex, 1);
            }
            const errorIndex = errorListeners.indexOf(handleError);
            if (errorIndex > -1) {
                errorListeners.splice(errorIndex, 1);
            }
        };
    }, []);

    return { isLoaded, loadError };
}
