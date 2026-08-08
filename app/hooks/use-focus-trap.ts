import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modals and dialogs.
 * Traps focus within the container and returns focus on unmount.
 */
export function useFocusTrap(isActive: boolean) {
	const containerRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!isActive) return;

		// Save the element that had focus before the modal opened
		previousFocusRef.current = document.activeElement as HTMLElement;

		const container = containerRef.current;
		if (!container) return;

		// Get all focusable elements
		const getFocusableElements = (): HTMLElement[] => {
			return Array.from(
				container.querySelectorAll(
					'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
			).filter((el): el is HTMLElement => (el as HTMLElement).offsetParent !== null) as HTMLElement[];
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;

			const focusable = getFocusableElements();
			if (focusable.length === 0) return;

			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (e.shiftKey) {
				if (document.activeElement === first || !container.contains(document.activeElement)) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last || !container.contains(document.activeElement)) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		// Focus the first focusable element on mount
		const focusable = getFocusableElements();
		if (focusable.length > 0) {
			// Small delay to let the modal render fully
			setTimeout(() => focusable[0].focus(), 50);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
			// Restore focus to the element that triggered the modal
			previousFocusRef.current?.focus();
		};
	}, [isActive]);

	return containerRef;
}
