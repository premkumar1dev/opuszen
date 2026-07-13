import { useState, useEffect, useRef } from "react";

interface WhatsAppWidgetProps {
  phoneNumber: string;
  agentName?: string;
  agentRole?: string;
  welcomeMessage?: string;
}

export function WhatsAppWidget({
  phoneNumber,
  agentName = "OpusZen Support",
  agentRole = "Online • Typically replies in minutes",
  welcomeMessage = "Hi there! 👋 How can we help you with OpusZen today?",
}: WhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        const isWidgetButton = (event.target as Element).closest(".whatsapp-widget-trigger");
        if (!isWidgetButton) {
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSend = () => {
    const defaultText = "Hello, I have a question about OpusZen.";
    const textToSend = message.trim() || defaultText;
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setMessage("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute bottom-16 right-0 w-80 sm:w-96 rounded-2xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 overflow-hidden flex flex-col transition-all duration-300 ease-out transform scale-100 origin-bottom-right animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-700 dark:to-teal-800 p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {/* Avatar with logo image */}
                <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center p-1.5 border border-white/20 shadow-md">
                  <img
                    src="/logo-blue.png"
                    alt="OpusZen"
                    className="w-full h-full object-contain"
                  />
                </div>
                {/* Online pulse dot */}
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-600 dark:ring-emerald-700 animate-pulse" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
                  {agentName}
                  {/* Verified badge icon */}
                  <svg className="w-4.5 h-4.5 text-sky-400 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </h4>
                <p className="text-[11px] text-emerald-100/90 font-medium mt-0.5">{agentRole}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg cursor-pointer"
              aria-label="Close chat window"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 p-4 bg-slate-50 dark:bg-zinc-900/50 min-h-[160px] flex flex-col justify-end relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl rounded-tl-none p-3.5 shadow-sm border border-slate-100 dark:border-zinc-700/50 max-w-[85%] self-start text-left mb-2 transition-colors">
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{agentName}</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                {welcomeMessage}
              </p>
              <span className="block text-[9px] text-slate-400 dark:text-zinc-500 text-right mt-1.5 font-medium">
                Just now
              </span>
            </div>
          </div>

          {/* Footer Input */}
          <div className="p-3.5 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-850 flex items-center gap-2.5">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full px-4.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-zinc-500"
            />
            <button
              onClick={handleSend}
              className="w-9.5 h-9.5 rounded-full bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white flex items-center justify-center transition-all shadow-md hover:shadow-emerald-500/10 active:scale-95 cursor-pointer shrink-0"
              aria-label="Send WhatsApp message"
            >
              <svg className="w-4.5 h-4.5 transform rotate-45 translate-x-0.5 -translate-y-0.5 fill-current" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="whatsapp-widget-trigger flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/20 dark:hover:shadow-emerald-900/30 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer relative group"
        aria-label={isOpen ? "Close WhatsApp chat" : "Open WhatsApp chat"}
      >
        {/* Pulsing ring indicator */}
        <span className="absolute inset-0 rounded-full bg-emerald-400/35 animate-ping opacity-75 group-hover:animate-none" />
        
        {/* SVG WhatsApp icon */}
        <svg className="w-7.5 h-7.5 fill-current relative z-10" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.59 2.002 14.12 1.01 11.498 1.01 6.062 1.01 1.638 5.38 1.636 10.81c0 1.679.444 3.318 1.286 4.757L1.936 21l5.59-1.464c1.4.76 2.87 1.157 4.357 1.161zm10.742-7.408c-.29-.145-1.716-.848-1.977-.942-.26-.096-.45-.144-.64.145-.19.285-.735.942-.9 1.13-.165.188-.33.21-.62.065-.29-.145-1.228-.453-2.338-1.446-.865-.77-1.45-1.722-1.62-2.011-.17-.29-.018-.447.127-.592.13-.13.29-.34.435-.51.145-.17.19-.29.285-.485.095-.193.048-.363-.024-.51-.07-.145-.64-1.54-.877-2.11-.23-.556-.465-.482-.64-.49-.168-.006-.36-.008-.553-.008-.193 0-.507.07-.77.361-.265.289-1.012.99-1.012 2.415 0 1.425 1.034 2.8 1.177 2.993.145.193 2.037 3.113 4.936 4.363.688.297 1.227.476 1.646.609.693.22 1.324.19 1.823.115.556-.083 1.717-.702 1.958-1.381.242-.68.242-1.26.17-1.38-.072-.12-.26-.192-.55-.337z" />
        </svg>
      </button>
    </div>
  );
}
