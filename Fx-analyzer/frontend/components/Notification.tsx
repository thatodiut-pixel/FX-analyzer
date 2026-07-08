'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, X, Info } from 'lucide-react';

interface NotificationProps {
  notification: {
    type: string;
    title: string;
    message: string;
  } | null;
  onClose: () => void;
}

export function Notification({ notification, onClose }: NotificationProps) {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const config = {
    success: {
      icon: CheckCircle,
      color: 'var(--emerald)',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30',
    },
    error: {
      icon: XCircle,
      color: 'var(--ruby)',
      bgClass: 'bg-red-500/10 border-red-500/30',
    },
    warning: {
      icon: AlertTriangle,
      color: 'var(--gold)',
      bgClass: 'bg-amber-500/10 border-amber-500/30',
    },
    info: {
      icon: Info,
      color: 'var(--cyan)',
      bgClass: 'bg-cyan-500/10 border-cyan-500/30',
    },
  };

  const getConfig = (type: string) => config[type as keyof typeof config] || config.info;

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -50, x: '-50%' }}
          className="fixed top-4 left-1/2 z-50"
        >
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${
              getConfig(notification.type).bgClass
            }`}
            style={{ minWidth: '300px' }}
          >
            {(() => {
              const Icon = getConfig(notification.type).icon;
              return (
                <Icon
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: getConfig(notification.type).color }}
                />
              );
            })()}
            <div className="flex-1">
              <p
                className="font-semibold text-sm"
                style={{ color: getConfig(notification.type).color }}
              >
                {notification.title}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {notification.message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
