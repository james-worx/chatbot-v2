import React, { useState, useCallback } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "../App.css"; // Ensure you include your CSS file

const Chatbot = ({ selectedModels, onSendMessage }) => {
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
      "compound-beta": "groq",
      
      // Production Models
      "gemma2-9b-it": "gemma",
      "llama-3.1-8b-instant": "llama",
      "llama-3.3-70b-versatile": "llama",
      "meta-llama/llama-guard-4-12b": "llama",
      
      // Preview Models
      "deepseek-r1-distill-llama-70b": "deepseek",
      "meta-llama/llama-4-maverick-17b-128e-instruct": "llama",
      "meta-llama/llama-4-scout-17b-16e-instruct": "llama",
      "meta-llama/llama-prompt-guard-2-22m": "llama",
      "meta-llama/llama-prompt-guard-2-86m": "llama",
      "mistral-saba-24b": "mixtral",
      "qwen/qwen3-32b": "qwen",
      
      // Legacy/Deprecated Models (keeping for backward compatibility)
      "llama-guard-3-8b": "llama",
      "llama3-70b-8192": "llama",
      "llama3-8b-8192": "llama",
      "llama-3.2-1b-preview": "llama",
      "llama-3.3-70b-specdec": "llama",
      "llama-3.2-90b-vision-preview": "llama",
      "llama-3.2-11b-vision-preview": "llama",
      "mixtral-8x7b-32768": "mixtral",
      "llama-3.2-3b-preview": "llama",
      
      // Default fallback
      "system": "system",
      "user": "system"
    };
    
    return companyMap[modelName] || "system";
  };

  const addMessage = useCallback((message, sender, isMemory = false) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender, message, isMemory, collapsed: isMemory ? true : false },
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

    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
    const youtubeMatch = message.match(youtubeRegex);

    // Handle YouTube transcript
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      addMessage("Fetching transcript...", "system");

      const response = await axios.post(`${apiBase}/api/youtube-transcript`, {
        videoId,
      });

      if (response.data.transcript) {
        const transcript = response.data.transcript;

        // Directly pass transcript into the summarization prompt without storing it as memory
        const summarizationPrompt = `Summarize the key points of this YouTube video transcript:\n\n${transcript}`;
        addMessage(summarizationPrompt, "system"); // Add as a system message (NOT MEMORY)

        // Now send summarization prompt to the chatbot
        const chatResponse = await axios.post(`${apiBase}/api/chat`, {
          message: summarizationPrompt,
          models: selectedModels,
          omitMemory: omitMemory
        });

        let totalTokens = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        let totalChunksSent = 0;
        
        chatResponse.data.forEach((botResponse) => {
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
      } else {
        addMessage("Could not retrieve transcript for the YouTube video.", "system");
      }

      setLoading(false);
      return;
    }

    // Default behavior for non-YouTube messages
    try {
      const response = await axios.post(`${apiBase}/api/chat`, {
        message,
        models: selectedModels,
        omitMemory: omitMemory
      });

      let totalTokens = 0;
      let totalPromptTokens = 0;
      let totalCompletionTokens = 0;
      let totalChunksSent = 0;
      
      response.data.forEach((botResponse) => {
        if (botResponse.retrieved_memory && botResponse.retrieved_memory.length > 0 && !omitMemory) {
          const memoryMarkdown = botResponse.retrieved_memory
            .map((mem) => `- ${mem}`)
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
  }, [selectedModels, addMessage, updateQueryStats]);

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
                  <span>Retrieved Memory</span>
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