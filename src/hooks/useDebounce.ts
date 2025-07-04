// Basic hook for debouncing grid filter input
// Needed now we control the data grid and it doesn't do its own filtering

import { useState, useEffect } from "react";

/**
 * A custom hook to debounce a value.
 * @param value The value to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
	// State to store the debounced value
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		// Set up a timer to update the debounced value after the specified delay
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// Clean up the timer if the value changes (e.g., user keeps typing)
		// or if the component unmounts.
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]); // Only re-run the effect if value or delay changes

	return debouncedValue;
}
