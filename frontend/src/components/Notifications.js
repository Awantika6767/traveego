import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { api } from "../utils/api";

export const Notifications = ({ notifications }) => {
  const [notifications1, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setNotifications(response.data);
      
      // Count unread notifications
      const unread = response.data.filter(notif => !notif.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.markNotificationRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: true }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate to the link if provided
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  // Fetch notifications on mount and when popover opens
//   useEffect(() => {
//     if (userId) {
//       fetchNotifications();
//     }
//   }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const unread = notifications.filter(notif => !notif.is_read).length;
    setUnreadCount(unread);
  }, [notifications])

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return "Recently";
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className="relative p-2 hover:bg-gray-100 rounded-lg"
          data-testid="notification-bell-button"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-600 text-white text-xs"
              data-testid="notification-unread-badge"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent
        className="w-80 p-0"
        align="end"
        data-testid="notification-popover"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm" data-testid="notification-header">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" data-testid="notification-count-badge">
              {unreadCount} new
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8" data-testid="notification-loading">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4" data-testid="notification-empty">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y" data-testid="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 cursor-pointer transition-colors hover:bg-accent ${
                    !notification.is_read ? "bg-orange-50" : ""
                  }`}
                  data-testid={`notification-item-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0" data-testid="notification-unread-indicator" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium mb-1 ${
                          !notification.is_read ? "text-gray-900" : "text-gray-600"
                        }`}
                        data-testid="notification-title"
                      >
                        {notification.title}
                      </p>
                      <p
                        className="text-sm text-gray-600 mb-2 line-clamp-2"
                        data-testid="notification-message"
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500" data-testid="notification-timestamp">
                        {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                setIsOpen(false);
              }}
              data-testid="notification-close-button"
            >
              Close
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default Notifications;
