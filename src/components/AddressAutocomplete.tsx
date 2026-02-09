"use client";

import { useEffect, useRef, useState } from "react";

// Type declaration for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

type AddressComponents = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
};

type AddressAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: AddressComponents) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

// Global promise to track script loading state
let googleMapsScriptPromise: Promise<void> | null = null;

// Load Google Maps script (singleton pattern to prevent multiple loads)
function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // If already loaded, resolve immediately
  if (typeof window.google !== "undefined" && window.google.maps) {
    return Promise.resolve();
  }

  // If currently loading, return the existing promise
  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  // Check if script tag already exists
  const existingScript = document.querySelector(
    'script[src*="maps.googleapis.com/maps/api/js"]'
  );

  if (existingScript) {
    // Script tag exists but not loaded yet, wait for it
    googleMapsScriptPromise = new Promise((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")));
    });
    return googleMapsScriptPromise;
  }

  // Create and load the script
  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      googleMapsScriptPromise = null; // Reset on error so it can be retried
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing address...",
  required = false,
  className = "",
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const isSelectingPlaceRef = useRef(false);

  // Store callbacks in refs to prevent recreation
  const onChangeRef = useRef(onChange);
  const onAddressSelectRef = useRef(onAddressSelect);

  // Update refs when callbacks change
  useEffect(() => {
    onChangeRef.current = onChange;
    onAddressSelectRef.current = onAddressSelect;
  }, [onChange, onAddressSelect]);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.warn("Google Maps API key not configured. Address autocomplete disabled.");
      setScriptError(true);
      return;
    }

    loadGoogleMapsScript(apiKey)
      .then(() => setScriptLoaded(true))
      .catch((error) => {
        console.error("Failed to load Google Maps:", error);
        setScriptError(true);
      });
  }, []);

  // Initialize autocomplete element
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return;

    try {
      // Create the new PlaceAutocompleteElement
      const autocompleteElement = document.createElement("gmp-place-autocomplete") as any;

      // Configure the element
      autocompleteElement.setAttribute("placeholder", placeholder);
      if (required) {
        autocompleteElement.setAttribute("required", "");
      }

      // Add custom styling to match the rest of the form
      autocompleteElement.style.width = "100%";
      autocompleteElement.style.fontFamily = "inherit";

      // Add to container first so we can query for the input
      containerRef.current.appendChild(autocompleteElement);
      autocompleteElementRef.current = autocompleteElement;

      // Wait for the element to be fully initialized
      setTimeout(() => {
        const inputElement = autocompleteElement.querySelector("input");
        if (inputElement) {
          // Apply styles directly to the input element
          inputElement.style.width = "100%";
          inputElement.style.padding = "0.5rem 0.75rem";
          inputElement.style.border = "1px solid rgb(209, 213, 219)";
          inputElement.style.borderRadius = "0.375rem";
          inputElement.style.fontSize = "0.875rem";
          inputElement.style.lineHeight = "1.25rem";
          inputElement.style.color = "rgb(17, 24, 39)";
          inputElement.style.backgroundColor = "white";
          inputElement.style.fontFamily = "inherit";

          // Add focus styles
          inputElement.addEventListener("focus", () => {
            inputElement.style.outline = "2px solid transparent";
            inputElement.style.outlineOffset = "2px";
            inputElement.style.borderColor = "rgb(59, 130, 246)";
            inputElement.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
          });

          inputElement.addEventListener("blur", () => {
            inputElement.style.borderColor = "rgb(209, 213, 219)";
            inputElement.style.boxShadow = "none";
          });
        }
      }, 100);

      // Listen for place selection
      autocompleteElement.addEventListener("gmp-placeselect", async (event: any) => {
        const place = event.place;

        if (!place) {
          console.log("No place selected");
          return;
        }

        isSelectingPlaceRef.current = true;

        // Fetch place details to get address components
        await place.fetchFields({
          fields: ["addressComponents"],
        });

        const addressComponents = place.addressComponents;

        if (!addressComponents) {
          console.log("No address components found");
          isSelectingPlaceRef.current = false;
          return;
        }

        // Parse address components
        let streetNumber = "";
        let route = "";
        let city = "";
        let state = "";
        let zipCode = "";

        addressComponents.forEach((component: any) => {
          const types = component.types;

          if (types.includes("street_number")) {
            streetNumber = component.longText;
          } else if (types.includes("route")) {
            route = component.longText;
          } else if (types.includes("locality")) {
            city = component.longText;
          } else if (types.includes("administrative_area_level_1")) {
            state = component.shortText;
          } else if (types.includes("postal_code")) {
            zipCode = component.longText;
          }
        });

        const street = [streetNumber, route].filter(Boolean).join(" ");

        console.log("Parsed address:", { street, city, state, zipCode });

        // Update the autocomplete input to show only street address
        const inputElement = autocompleteElement.querySelector("input");
        if (inputElement) {
          console.log("Setting autocomplete input to:", street);
          inputElement.value = street;
        }

        // Update parent component with parsed address
        if (street) {
          console.log("Calling callbacks with:", { street, city, state, zipCode });
          onChangeRef.current(street);
          onAddressSelectRef.current({ street, city, state, zipCode });
        }

        // Reset flag after a short delay
        setTimeout(() => {
          isSelectingPlaceRef.current = false;
        }, 100);
      });

      // Sync input value changes (for manual typing, not place selection)
      setTimeout(() => {
        const inputElement = autocompleteElement.querySelector("input");
        if (inputElement) {
          inputElement.addEventListener("input", (e: any) => {
            console.log("Input event, isSelecting:", isSelectingPlaceRef.current, "Value:", e.target.value);
            if (!isSelectingPlaceRef.current) {
              onChangeRef.current(e.target.value);
            }
          });
        }
      }, 100);
    } catch (error) {
      console.error("Error initializing autocomplete:", error);
    }

    return () => {
      // Cleanup
      if (autocompleteElementRef.current) {
        autocompleteElementRef.current.remove();
      }
    };
  }, [scriptLoaded, placeholder, required]);

  // Sync value from parent to autocomplete input (but not during place selection)
  useEffect(() => {
    if (autocompleteElementRef.current && !isSelectingPlaceRef.current) {
      const inputElement = autocompleteElementRef.current.querySelector("input");
      if (inputElement && inputElement.value !== value) {
        console.log("Syncing value from parent:", value, "Current input value:", inputElement.value);
        inputElement.value = value;
      }
    }
  }, [value]);

  // If Google Maps failed to load or no API key, show regular input
  if (scriptError) {
    return (
      <input
        type="text"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    );
  }

  return <div ref={containerRef} />;
}
