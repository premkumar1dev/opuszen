import { useState, useCallback, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "warning";

interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

let toastId = 0;
let setToastList: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;

export function showToast(message: string, type: ToastType = "error") {
	if (!setToastList) return;
	setToastList((prev) => [...prev, { id: ++toastId, message, type }]);
}

export function useToast() {
	const [toasts, setToastsInternal] = useState<Toast[]>([]);

	useEffect(() => {
		setToastList = setToastsInternal;
		return () => { setToastList = null; };
	}, []);

	const removeToast = useCallback((id: number) => {
		setToastsInternal((prev) => prev.filter((t) => t.id !== id));
	}, []);

	useEffect(() => {
		if (toasts.length === 0) return;
		const timer = setTimeout(() => {
			setToastsInternal((prev) => prev.slice(1));
		}, 4500);
		return () => clearTimeout(timer);
	}, [toasts]);

	const iconMap = {
		success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
		error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
		warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
	};

	if (toasts.length === 0) return null;

	return (
		<div className="toast-container">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`toast toast-${toast.type}`}
					role="alert"
				>
					{iconMap[toast.type]}
					<p className="text-xs font-medium text-[var(--dashboard-text)] flex-1">
						{toast.message}
					</p>
					<button
						onClick={() => removeToast(toast.id)}
						className="shrink-0 text-[var(--dashboard-text-muted)] hover:text-[var(--dashboard-text)] transition-colors"
						aria-label="Dismiss notification"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			))}
		</div>
	);
}
