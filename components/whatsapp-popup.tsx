'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Bell, Users, Zap, Gift } from 'lucide-react';

const STORAGE_KEY = 'techvyro_whatsapp_popup';

export function WhatsAppPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if popup should show
  const shouldShowPopup = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return true;
      
      const data = JSON.parse(stored);
      const lastShown = new Date(data.lastShown);
      const now = new Date();
      
      // Show again after 24 hours
      const hoursDiff = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);
      return hoursDiff >= 24;
    } catch {
      return true;
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Delay showing popup
    const timer = setTimeout(() => {
      if (shouldShowPopup()) {
        setIsOpen(true);
        setTimeout(() => setIsAnimating(true), 50);
        
        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            lastShown: new Date().toISOString(),
            shown: true
          }));
        } catch {
          // Ignore storage errors
        }
      }
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [mounted, shouldShowPopup]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 400);
  }, []);

  const handleJoin = useCallback(() => {
    window.open('https://whatsapp.com/channel/0029Vadk2XHLSmbX3oEVmX37', '_blank');
    handleClose();
  }, [handleClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!mounted || !isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4" 
      style={{ perspective: '1200px' }}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-400 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-[calc(100vw-2rem)] sm:max-w-sm transition-all duration-500 ease-out ${
          isClosing ? 'scale-90 opacity-0' : ''
        }`}
        style={{
          transform: isAnimating 
            ? 'rotateX(0deg) scale(1)' 
            : 'rotateX(-10deg) scale(0.95)',
          opacity: isAnimating ? 1 : 0,
          transformStyle: 'preserve-3d',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow */}
        <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#25D366] via-emerald-400 to-[#128C7E] opacity-0 blur-xl transition-opacity duration-500 ${isAnimating ? 'opacity-30' : ''}`} />
        
        {/* Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/10 shadow-2xl">
          
          {/* Top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-[#25D366] via-emerald-400 to-[#128C7E]" />
          
          {/* Content */}
          <div className="relative px-4 sm:px-6 pt-6 sm:pt-8 pb-5 sm:pb-6">
            
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Badge */}
            <div className={`flex justify-center mb-4 transition-all duration-400 ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-medium">
                <Bell className="w-3 h-3" />
                Official Channel
              </span>
            </div>

            {/* WhatsApp Icon */}
            <div className={`flex justify-center mb-3 sm:mb-4 transition-all duration-400 ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`} style={{ transitionDelay: '100ms' }}>
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-xl flex items-center justify-center shadow-lg shadow-[#25D366]/30">
                <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-8 sm:h-8 text-white fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className={`text-center text-xl sm:text-2xl font-bold mb-1.5 transition-all duration-400 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '150ms' }}>
              <span className="text-[#ef4444]">Tech</span>
              <span className="text-white">Vyro</span>
            </h2>

            <p className={`text-[#25D366] text-center text-sm font-medium mb-3 transition-all duration-400 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '200ms' }}>
              WhatsApp Channel
            </p>

            <p className={`text-gray-400 text-center mb-4 text-xs sm:text-sm leading-relaxed transition-all duration-400 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '250ms' }}>
              Get free PDFs, study materials & tech updates directly on WhatsApp.
            </p>

            {/* Features */}
            <div className={`grid grid-cols-3 gap-2 mb-4 transition-all duration-400 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '300ms' }}>
              {[
                { icon: Zap, label: 'Updates' },
                { icon: Gift, label: 'Free PDFs' },
                { icon: Users, label: 'Community' }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1 bg-white/5 rounded-lg p-2 border border-white/10">
                  <div className="h-6 w-6 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                    <item.icon className="w-3 h-3 text-[#25D366]" />
                  </div>
                  <span className="text-[10px] text-gray-400">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Button */}
            <button
              onClick={handleJoin}
              className={`w-full py-3 px-4 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[#25D366]/20 hover:-translate-y-0.5 active:translate-y-0 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
              style={{ transitionDelay: '350ms' }}
            >
              Join Channel Now
            </button>

            <p className={`text-center text-[10px] text-gray-500 mt-3 transition-all duration-400 ${isAnimating ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '400ms' }}>
              10K+ students already joined
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
