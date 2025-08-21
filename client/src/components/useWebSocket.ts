import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket(listId?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!listId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected for list:", listId);
        // Subscribe to list updates
        ws.send(JSON.stringify({
          type: "subscribe_list",
          listId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "item_added" || message.type === "item_deleted") {
            // Invalidate list queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["/api/lists"] });
            queryClient.invalidateQueries({ queryKey: ["/api/lists", message.listId] });
          }
        } catch (error) {
          console.error("Error handling WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected for list:", listId);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }

    return () => {
      if (wsRef.current) {
        // Unsubscribe from list updates
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "unsubscribe_list",
            listId,
          }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [listId, queryClient]);

  return wsRef.current;
}
