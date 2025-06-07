
# API Integration Documentation

## Overview

This document provides comprehensive guidance for integrating APIs and implementing real-time features using WebSockets in the Domain Development Navigator application.

## Table of Contents

1. [Data Contracts](#data-contracts)
2. [REST API Integration](#rest-api-integration)
3. [WebSocket Live Streaming](#websocket-live-streaming)
4. [Event Stream Integration](#event-stream-integration)
5. [Command API](#command-api)
6. [Implementation Examples](#implementation-examples)
7. [Code Locations](#code-locations)

## Data Contracts

### Common Types

```typescript
// src/types/common.ts
export type UUID = string;

/**
 * Common Metadata across Commands and Events
 */
export interface Metadata {
  userId?: UUID; //AUTH/RBAC/RLS
  role?: string; //RBAC/RLS
  timestamp: Date;
  correlationId?: UUID; // ID for tracking the flow of actions
  causationId?: UUID; // ID of the action that caused this command
  requestId?: string; // Useful for cross-service tracing
  source?: string;    // Service or workflow origin
  tags?: Record<string, string | number>; // For flexible enrichment
  schemaVersion?: number;
}

/**
 * Base Command interface with lifecycle hints
 */
export interface Command<T = any> {
  id: UUID;
  tenant_id: UUID;
  type: string;
  payload: T;
  status?: 'pending' | 'consumed' | 'processed' | 'failed';
  metadata?: Metadata;
}

/**
 * Base Event interface with versioning and full trace metadata
 */
export interface Event<T = any> {
  id: UUID;
  tenant_id: UUID;
  type: string;
  payload: T;
  aggregateId: UUID;
  aggregateType: string;
  version: number;
  metadata?: Metadata;
}
```

## REST API Integration

### Basic API Service Structure

```typescript
// src/services/apiService.ts
export class ApiService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
    };
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.headers,
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

### Environment Configuration

```typescript
// src/config/api.ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
  API_KEY: import.meta.env.VITE_API_KEY,
  TIMEOUT: 30000,
};
```

## WebSocket Live Streaming

### WebSocket Service Implementation

```typescript
// src/services/websocketService.ts
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private listeners = new Map<string, Set<Function>>();

  constructor(private url: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.handleReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: any) {
    const { type, payload } = data;
    const typeListeners = this.listeners.get(type);
    
    if (typeListeners) {
      typeListeners.forEach(callback => callback(payload));
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
        this.connect();
      }, this.reconnectInterval * this.reconnectAttempts);
    }
  }

  subscribe(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  unsubscribe(eventType: string, callback: Function) {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.delete(callback);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### React Hook for WebSocket

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { WebSocketService } from '@/services/websocketService';

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsService = useRef<WebSocketService | null>(null);

  useEffect(() => {
    wsService.current = new WebSocketService(url);
    
    wsService.current.connect()
      .then(() => {
        setIsConnected(true);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setIsConnected(false);
      });

    return () => {
      wsService.current?.disconnect();
    };
  }, [url]);

  const subscribe = (eventType: string, callback: Function) => {
    wsService.current?.subscribe(eventType, callback);
  };

  const unsubscribe = (eventType: string, callback: Function) => {
    wsService.current?.unsubscribe(eventType, callback);
  };

  const send = (data: any) => {
    wsService.current?.send(data);
  };

  return {
    isConnected,
    error,
    subscribe,
    unsubscribe,
    send,
  };
};
```

## Event Stream Integration

### Event Stream Hook

```typescript
// src/hooks/useEventStream.ts
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { Event, UUID } from '@/types/common';

export const useEventStream = (tenantId: UUID, wsUrl: string) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLive, setIsLive] = useState(true);
  const { isConnected, subscribe, unsubscribe, send } = useWebSocket(wsUrl);

  const handleNewEvent = useCallback((eventData: Event) => {
    if (eventData.tenant_id === tenantId && isLive) {
      setEvents(prev => [eventData, ...prev].slice(0, 100)); // Keep latest 100
    }
  }, [tenantId, isLive]);

  useEffect(() => {
    if (isConnected) {
      subscribe('event', handleNewEvent);
      
      // Subscribe to tenant-specific events
      send({
        type: 'subscribe',
        payload: { tenant_id: tenantId, eventTypes: ['*'] }
      });
    }

    return () => {
      unsubscribe('event', handleNewEvent);
    };
  }, [isConnected, handleNewEvent, tenantId, subscribe, unsubscribe, send]);

  const toggleLive = () => {
    setIsLive(!isLive);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return {
    events,
    isLive,
    isConnected,
    toggleLive,
    clearEvents,
  };
};
```

## Command API

### Command Service

```typescript
// src/services/commandService.ts
import { ApiService } from './apiService';
import { Command, UUID } from '@/types/common';

export interface CommandResult {
  commandId: UUID;
  status: 'accepted' | 'rejected';
  message?: string;
  events?: any[];
}

export class CommandService extends ApiService {
  async executeCommand(command: Omit<Command, 'id'>): Promise<CommandResult> {
    return this.post<CommandResult>('/commands', command);
  }

  async getCommandStatus(commandId: UUID): Promise<CommandResult> {
    return this.get<CommandResult>(`/commands/${commandId}/status`);
  }

  async getCommandHistory(tenantId: UUID, limit = 50): Promise<Command[]> {
    return this.get<Command[]>(`/commands?tenant_id=${tenantId}&limit=${limit}`);
  }
}
```

## Implementation Examples

### Mock Data Generation

```typescript
// src/utils/mockData.ts
import { Event, Command, Metadata, UUID } from '@/types/common';

export const generateMockEvent = (tenantId: UUID, overrides?: Partial<Event>): Event => {
  const eventTypes = ['UserCreated', 'OrderPlaced', 'PaymentProcessed', 'ProductUpdated'];
  const aggregateTypes = ['User', 'Order', 'Payment', 'Product'];
  
  const metadata: Metadata = {
    userId: `user-${Math.random().toString(36).substr(2, 6)}`,
    role: 'user',
    timestamp: new Date(),
    correlationId: `corr-${Math.random().toString(36).substr(2, 8)}`,
    causationId: `cmd-${Math.random().toString(36).substr(2, 8)}`,
    requestId: `req-${Math.random().toString(36).substr(2, 8)}`,
    source: 'web-api',
    tags: { environment: 'development' },
    schemaVersion: 1
  };

  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    tenant_id: tenantId,
    type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    payload: { randomData: Math.random(), timestamp: new Date() },
    aggregateId: `agg-${Math.random().toString(36).substr(2, 6)}`,
    aggregateType: aggregateTypes[Math.floor(Math.random() * aggregateTypes.length)],
    version: Math.floor(Math.random() * 5) + 1,
    metadata,
    ...overrides
  };
};

export const generateMockCommand = (tenantId: UUID, overrides?: Partial<Command>): Command => {
  const commandTypes = ['CreateUser', 'PlaceOrder', 'ProcessPayment', 'UpdateProduct'];
  
  const metadata: Metadata = {
    userId: `user-${Math.random().toString(36).substr(2, 6)}`,
    role: 'admin',
    timestamp: new Date(),
    correlationId: `corr-${Math.random().toString(36).substr(2, 8)}`,
    requestId: `req-${Math.random().toString(36).substr(2, 8)}`,
    source: 'navigator-ui',
    tags: { environment: 'development' },
    schemaVersion: 1
  };

  return {
    id: `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    tenant_id: tenantId,
    type: commandTypes[Math.floor(Math.random() * commandTypes.length)],
    payload: { randomData: Math.random(), timestamp: new Date() },
    status: 'pending',
    metadata,
    ...overrides
  };
};
```

## Code Locations

### Files to Create for API Integration

1. **Type Definitions**
   - Create: `src/types/common.ts` - Base types for Event, Command, Metadata

2. **Environment Configuration**
   - Create: `src/config/api.ts` - API endpoints and configuration

3. **Service Layer**
   - Create: `src/services/apiService.ts` - Base API service
   - Create: `src/services/websocketService.ts` - WebSocket management
   - Create: `src/services/commandService.ts` - Command API integration

4. **Hooks**
   - Create: `src/hooks/useWebSocket.ts` - WebSocket connection hook
   - Create: `src/hooks/useEventStream.ts` - Event streaming hook
   - Create: `src/hooks/useCommands.ts` - Command management hook

5. **Utilities**
   - Create: `src/utils/mockData.ts` - Mock data generators
   - Create: `src/utils/errorHandler.ts` - Centralized error handling

6. **Components to Update**
   - `src/components/EventStreamViewer.tsx` - Update with new Event interface
   - `src/components/CommandIssuer.tsx` - Update with new Command interface
   - `src/components/SystemStatus.tsx` - Add real system monitoring
   - `src/components/ProjectionExplorer.tsx` - Connect to projection APIs

### Environment Variables Needed

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
VITE_API_KEY=your-api-key-here
```

### Error Handling Strategy

```typescript
// src/utils/errorHandler.ts
import { toast } from "@/components/ui/use-toast";

export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  
  if (error.name === 'NetworkError') {
    toast({
      variant: "destructive",
      title: "Network Error",
      description: "Network connection failed. Please check your connection.",
    });
  } else if (error.status === 401) {
    toast({
      variant: "destructive", 
      title: "Authentication Failed",
      description: "Authentication failed. Please check your API key.",
    });
  } else if (error.status >= 500) {
    toast({
      variant: "destructive",
      title: "Server Error", 
      description: "Server error. Please try again later.",
    });
  } else {
    toast({
      variant: "destructive",
      title: "Error",
      description: error.message || "An unexpected error occurred.",
    });
  }
};
```

## Testing WebSocket Connection

```typescript
// src/utils/testConnection.ts
export const testWebSocketConnection = async (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    };
    
    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
  });
};
```

This documentation provides a complete foundation for integrating real APIs and WebSocket connections into your Domain Development Navigator application using your established Event and Command contracts.
