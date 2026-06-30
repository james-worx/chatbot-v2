import React, { useState, useCallback } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "../App.css"; // Ensure you include your CSS file

const Chatbot = ({ selectedModels, persona, onSendMessage }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [queryStats, setQueryStats] = useState({
    lastQueryTime: null,
    lastTokenUsage: null,
    lastPromptTokens: null,
    lastCompletionTokens: null,
    lastChunksSent: null,
    totalQueries: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalChunksSent: 0
  });

  // Function to map model names to base company names for images
  const getCompanyImage = (modelName) => {
    const companyMap = {
      // Groq Systems
      "groq/compound": "groq",
      "groq/compound-mini": "groq",

      // Meta Llama
      "llama-3.1-8b-instant": "llama",
      "llama-3.3-70b-versatile": "llama",
      "meta-llama/llama-4-maverick-17b-128e-instruct": "llama",
      "meta-llama/llama-4-scout-17b-16e-instruct": "llama",

      // OpenAI OSS (Groq Hosted)
      "openai/gpt-oss-120b": "openai",
      "openai/gpt-oss-20b": "openai",

      // Moonshot AI (no dedicated logo — falls back to system)
      "moonshotai/kimi-k2-instruct": "system",

      // Alibaba Cloud
      "qwen/qwen3-32b": "qwen",

      // Default fallback
      "system": "system",
      "user": "system"
    };
    
    return companyMap[modelName] || "system";
  };

  const addMessage = useCallback((message, sender, isMemory = false) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      // Memory blocks start expanded so the Mem0 retrieval + scores are visible.
      { sender, message, isMemory, collapsed: false },
    ]);
  }, []);

  const toggleCollapse = (index) => {
    const updatedMessages = [...messages];
    updatedMessages[index].collapsed = !updatedMessages[index].collapsed;
    setMessages(updatedMessages);
  };

  const updateQueryStats = useCallback((queryTime, tokenUsage, promptTokens, completionTokens, chunksSent) => {
    setQueryStats(prev => ({
      lastQueryTime: queryTime,
      lastTokenUsage: tokenUsage,
      lastPromptTokens: promptTokens,
      lastCompletionTokens: completionTokens,
      lastChunksSent: chunksSent,
      totalQueries: prev.totalQueries + 1,
      totalTokens: prev.totalTokens + (tokenUsage || 0),
      totalPromptTokens: prev.totalPromptTokens + (promptTokens || 0),
      totalCompletionTokens: prev.totalCompletionTokens + (completionTokens || 0),
      totalChunksSent: prev.totalChunksSent + (chunksSent || 0)
    }));
  }, []);

  const sendMessage = useCallback(async (message, omitMemory = false) => {
    if (!message.trim() || selectedModels.length === 0) return;

    setLoading(true);
    addMessage(message, "user");

    const startTime = Date.now();
    const apiBase = process.env.REACT_APP_API_URL || "";

    try {
      const response = await axios.post(`${apiBase}/api/chat`, {
        message,
        models: selectedModels,
        omitMemory: omitMemory,
        user_id: persona?.id,
        system_prompt: persona?.systemPrompt
      });

      let totalTokens = 0;
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalChunksSent = 0;
      
      response.data.forEach((botResponse) => {
        if (botResponse.retrieved_memory && botResponse.retrieved_memory.length > 0 && !omitMemory) {
          const memoryMarkdown = botResponse.retrieved_memory
            .map((mem) => {
              // Backend returns { memory, score }; tolerate legacy string form.
              const text = typeof mem === "string" ? mem : mem.memory;
              const score = typeof mem === "string" ? null : mem.score;
              return score != null
                ? `- \`relevance ${score.toFixed(3)}\` — ${text}`
                : `- ${text}`;
            })
            .join("\n");
          addMessage(memoryMarkdown, "memory", true);
        }
        addMessage(botResponse.response, botResponse.model);
        
        // Sum up token usage and chunks from all models
        if (botResponse.usage) {
          totalTokens += botResponse.usage.total_tokens || 0;
          totalPromptTokens += botResponse.usage.prompt_tokens || 0;
          totalCompletionTokens += botResponse.usage.completion_tokens || 0;
        }
        if (botResponse.chunks_sent) {
          totalChunksSent += botResponse.chunks_sent;
        }
      });

      const queryTime = Date.now() - startTime;
      updateQueryStats(queryTime, totalTokens, totalPromptTokens, totalCompletionTokens, totalChunksSent);
    } catch (error) {
      console.error("Error:", error);
      addMessage("Error fetching response", "system");
    }

    setLoading(false);
  }, [selectedModels, persona, addMessage, updateQueryStats]);

  // Listen for send message events from parent
  React.useEffect(() => {
    if (onSendMessage && onSendMessage.message) {
      sendMessage(onSendMessage.message, onSendMessage.omitMemory);
      onSendMessage.onSent(); // Notify parent that message was sent
    }
  }, [onSendMessage, sendMessage]);

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTokens = (tokens) => {
    if (tokens === null || tokens === undefined) return "0";
    if (tokens < 1000) return `${tokens}`;
    return `${(tokens / 1000).toFixed(1)}k`;
  };

  return (
    <div className="chatbot">
      <div className="chat-window">
        {messages.length === 0 && (
          <div className="chat-placeholder">
            <p>👋 Welcome! Type a message or paste a YouTube link to summarize.</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message-block ${msg.isMemory ? "memory-block" : ""} ${msg.sender === "user" ? "user-block" : ""}`}>
            {msg.isMemory ? (
              <div className="memory-container">
                <div className="memory-header" onClick={() => toggleCollapse(index)} style={{ cursor: "pointer" }}>
                  <span>🧠 Memory retrieved from Mem0 — injected as context</span>
                  <button className="collapse-btn">{msg.collapsed ? "Expand" : "Collapse"}</button>
                </div>
                {!msg.collapsed && <div className="memory-content"><ReactMarkdown>{msg.message}</ReactMarkdown></div>}
              </div>
            ) : (
              <>
                {msg.sender !== "user" && (
                  <div className="sender-info">
                    <img src={`/images/${getCompanyImage(msg.sender)}.png`} alt={msg.sender} className="sender-logo" />
                    <span className="sender-name">{msg.sender}</span>
                  </div>
                )}
                <div className={`message ${msg.sender}`}>
                  <ReactMarkdown>{msg.message}</ReactMarkdown>
                </div>
              </>
            )}
          </div>
        ))}

        {loading && <div className="loading">Bot is thinking...</div>}
      </div>
      
      {queryStats.lastQueryTime && (
        <div className="query-stats">
          <div className="stats-row">
            <span className="stat-label">Time:</span>
            <span className="stat-value">{formatTime(queryStats.lastQueryTime)}</span>
            <span className="stat-label">Chunks:</span>
            <span className="stat-value">{queryStats.lastChunksSent || 0}</span>
          </div>
          <div className="stats-row">
            <span className="stat-label">Input Tokens:</span>
            <span className="stat-value">{formatTokens(queryStats.lastPromptTokens)}</span>
            <span className="stat-label">Output Tokens:</span>
            <span className="stat-value">{formatTokens(queryStats.lastCompletionTokens)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;