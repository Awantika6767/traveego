import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { MessageCircle, Send, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import { formatDateTime } from '../utils/formatters';

export const RequestChat = ({ requestId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadMessages();
  }, [requestId]);

  const loadMessages = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const response = await api.getMessages(requestId, pageNum);
      
      if (append) {
        // When loading older messages, prepend them to the list
        setMessages([...response.messages.reverse(), ...messages]);
      } else {
        // Initial load or refresh - reverse to show latest at bottom
        setMessages(response.messages.reverse());
      }
      
      setPage(response.page);
      setHasMore(response.has_more);
      setTotalMessages(response.total);
      
      // Scroll to bottom on initial load
      if (!append) {
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    const nextPage = page + 1;
    await loadMessages(nextPage, true);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      setSending(true);
      const message = {
        request_id: requestId,
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        sender_role: currentUser.role,
        message_text: newMessage.trim()
      };

      const sentMessage = await api.sendMessage(requestId, message);
      
      // Add the new message to the list
      setMessages([...messages, sentMessage.data]);
      setNewMessage('');
      setTotalMessages(totalMessages + 1);
      
      toast.success('Message sent');
      
      // Scroll to bottom after sending
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    await loadMessages(1, false);
    toast.success('Messages refreshed');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      customer: 'bg-blue-500',
      sales: 'bg-green-500',
      operations: 'bg-purple-500',
      admin: 'bg-red-500',
      accountant: 'bg-yellow-500'
    };
    return colors[role] || 'bg-gray-500';
  };

  const isOwnMessage = (message) => {
    return message.sender_id === currentUser.id;
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <CardTitle>Chat</CardTitle>
          <Badge variant="outline">{totalMessages} messages</Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {/* Load More Button */}
        {hasMore && (
          <div className="mb-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreMessages}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                `Load More (${totalMessages - messages.length} older)`
              )}
            </Button>
          </div>
        )}

        {/* Messages List */}
        <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
          {loading && messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] ${
                    isOwnMessage(message)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  } rounded-lg p-3 shadow-sm`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {message.sender_name}
                    </span>
                    <Badge
                      className={`${getRoleBadgeColor(message.sender_role)} text-white text-xs`}
                    >
                      {message.sender_role}
                    </Badge>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.message_text}
                  </p>
                  <div
                    className={`text-xs mt-1 ${
                      isOwnMessage(message) ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatDateTime(message.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 min-h-[80px]"
            disabled={sending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="self-end"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
