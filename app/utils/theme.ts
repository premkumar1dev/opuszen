import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "dashboard-theme";

export function useDashboardTheme() {
	const [theme, setThemeState] = useState<Theme>("dark");

	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved === "light" || saved === "dark") {
				setThemeState(saved);
			}
		} catch {}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, theme);
		} catch {}
	}, [theme]);

	useEffect(() => {
		if (typeof document === "undefined") {
			return;
		}
		const root = document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
	}, []);

	return { theme, toggleTheme };
}


