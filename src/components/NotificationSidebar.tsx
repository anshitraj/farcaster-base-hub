"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCircle, AlertCircle, Info, Sparkles } from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSidebar({ isOpen, onClose }: NotificationSidebarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications", {
          credentials: "include",
        });
        
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        // Use mock data for demo
        setNotifications([
          {
            id: "1",
            type: "success",
            title: "Welcome to Mini App Store!",
            message: "You've earned 100 points for joining. Start exploring apps!",
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            read: false,
          },
          {
            id: "2",
            type: "info",
            title: "New App Available",
            message: "Riddle Pay has been added to the store. Check it out!",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
            read: false,
          },
          {
            id: "3",
            type: "warning",
            title: "Profile Update",
            message: "Complete your profile to unlock more features.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
            read: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-base-blue" />;
    }
  };

  const getNotificationBg = (type: Notification["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-500/10 border-green-500/20";
      case "error":
        return "bg-red-500/10 border-red-500/20";
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/20";
      default:
        return "bg-base-blue/10 border-base-blue/20";
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    // TODO: Call API to mark as read
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // TODO: Call API to mark all as read
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:z-50"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-gradient-to-b from-[#1A1A1A] to-[#141414] border-l border-[#2A2A2A] z-50 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#2A2A2A]/50 bg-gradient-to-r from-[#1A1A1A] to-[#141414]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-base-blue/20 to-purple-500/20 flex items-center justify-center border border-base-blue/30">
                    <Bell className="w-5 h-5 text-base-blue" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-white">Notifications</h2>
                    {unreadCount > 0 && (
                      <p className="text-xs text-[#A0A4AA] mt-0.5">
                        {unreadCount} unread
                      </p>
                    )}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-[#2A2A2A]/80 rounded-xl transition-all duration-300"
                  aria-label="Close notifications"
                >
                  <X className="w-5 h-5 text-[#AAA] hover:text-white transition-colors" />
                </motion.button>
              </div>
              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={markAllAsRead}
                  className="w-full px-4 py-2 bg-base-blue/10 hover:bg-base-blue/20 border border-base-blue/30 rounded-xl text-sm font-semibold text-base-blue transition-all duration-300"
                >
                  Mark all as read
                </motion.button>
              )}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 bg-gradient-to-br from-[#141A24] to-[#0F1419] rounded-2xl animate-pulse border border-[#1F2733]"
                    />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center py-16"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-base-blue/20 to-purple-500/20 flex items-center justify-center mb-4 border border-base-blue/30">
                    <Bell className="w-10 h-10 text-base-blue/50" />
                  </div>
                  <p className="text-lg font-semibold text-white mb-2">All caught up!</p>
                  <p className="text-sm text-[#A0A4AA]">
                    You don't have any notifications yet.
                  </p>
                </motion.div>
              ) : (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => markAsRead(notification.id)}
                    className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                      notification.read
                        ? "bg-[#141A24] border-[#1F2733] opacity-60"
                        : `${getNotificationBg(notification.type)} border-opacity-50`
                    }`}
                  >
                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-base-blue rounded-full" />
                    )}

                    <div className="flex gap-3 pl-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">
                          {notification.title}
                        </h3>
                        <p className="text-xs text-[#A0A4AA] mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#888]">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </span>
                          {notification.actionUrl && (
                            <span className="text-xs text-base-blue font-semibold">
                              View →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hover shine effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-x-full group-hover:translate-x-full" />
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#2A2A2A]/50 bg-gradient-to-r from-[#1A1A1A] to-[#141414]">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-4 py-3 bg-gradient-to-r from-base-blue to-purple-500 text-white rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(0,102,255,0.5)] transition-all duration-300"
              >
                View All Notifications
              </motion.button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

