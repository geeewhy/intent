//devex-ui/src/components/AICompanion.tsx

import { useState } from "react";
import { Bot, X, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const mockMessages: Message[] = [
  {
    id: 1,
    type: 'ai',
    content: 'Hello! I\'m your DevX companion. I can help you understand domain state, scaffold new types, or simulate event flows. What would you like to explore?',
    timestamp: '14:30:00'
  },
  {
    id: 2,
    type: 'user',
    content: 'Can you help me understand the current state of aggregate user-123?',
    timestamp: '14:30:15'
  },
  {
    id: 3,
    type: 'ai',
    content: 'Based on the event stream, user-123 was created at 14:28:42 with email "john@example.com". The profile was updated once, and there are no pending commands. The aggregate is in a consistent state.',
    timestamp: '14:30:18'
  }
];

interface AICompanionProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const AICompanion = ({ isOpen, onToggle }: AICompanionProps) => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString().slice(0, 5)
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'I understand your query. Let me analyze the current system state and provide you with insights...',
        timestamp: new Date().toLocaleTimeString().slice(0, 5)
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 transform -translate-y-1/2 bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-all duration-300 z-50 p-2 rounded-l-lg ${
          isOpen ? 'right-96' : 'right-0'
        }`}
      >
        {isOpen ? (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        ) : (
          <>
            <Bot className="h-4 w-4 text-blue-400" />
          </>
        )}
      </button>

      {/* AI Panel */}
      <div className={`fixed top-0 right-0 h-full w-96 bg-slate-900 border-l border-slate-700 transform transition-transform duration-300 z-40 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <Card className="h-full bg-transparent border-0 rounded-none flex flex-col">
          <CardHeader className="border-b border-slate-700 pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <Bot className="h-5 w-5 text-blue-400" />
              AI Companion
              <button
                onClick={onToggle}
                className="ml-auto p-1 hover:bg-slate-800 rounded transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-4">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg text-sm ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-100'
                      }`}
                    >
                      <div className="mb-1">{message.content}</div>
                      <div className="text-xs opacity-70">{message.timestamp}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about domain state, scaffold types..."
                className="bg-slate-800 border-slate-700 text-slate-100"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <Button
                onClick={handleSendMessage}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
