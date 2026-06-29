import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import Chatbot from "./Chatbot";
import "../App.css";

const ChatContainer = forwardRef(({ selectedModels, onChatRemoved }, ref) => {
  const [chatInstances, setChatInstances] = useState([{ id: 1, name: "Chat 1", assignedModels: [] }]);
  const [inputs, setInputs] = useState({ 1: "" });
  const [sendMessages, setSendMessages] = useState({});
  const [editingNameId, setEditingNameId] = useState(null);
  const [maxReachedHint, setMaxReachedHint] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    sendToAllChats: (message, omitMemory = false) => {
      const timestamp = Date.now();
      const newSendMessages = {};
      
      chatInstances.forEach(chat => {
        if (chat.assignedModels.length > 0) {
          newSendMessages[chat.id] = { message, timestamp: timestamp + chat.id, omitMemory };
        }
      });
      
      setSendMessages(prev => ({ ...prev, ...newSendMessages }));
    }
  }));

  // One model per chat: add new chats when more models are selected (max 3 chats)
  useEffect(() => {
    if (selectedModels.length === 0) {
      setChatInstances((prev) => prev.map((chat) => ({ ...chat, assignedModels: [] })));
      return;
    }

    const targetChatCount = Math.min(selectedModels.length, 3);

    setChatInstances((prev) => {
      const prevIds = new Set(prev.map((c) => c.id));
      let updated = [...prev];

      while (updated.length < targetChatCount) {
        const newId = Math.max(0, ...updated.map((c) => c.id)) + 1;
        updated.push({
          id: newId,
          name: `Chat ${updated.length + 1}`,
          assignedModels: [],
        });
      }

      const newChatIds = updated.filter((c) => !prevIds.has(c.id)).map((c) => c.id);
      if (newChatIds.length > 0) {
        setInputs((prevInputs) => {
          const next = { ...prevInputs };
          newChatIds.forEach((id) => (next[id] = ""));
          return next;
        });
      }

      return updated.map((chat, i) => ({
        ...chat,
        assignedModels: i < selectedModels.length ? [selectedModels[i]] : [],
      }));
    });
  }, [selectedModels]);

  const addNewChat = () => {
    if (chatInstances.length >= 3) {
      setMaxReachedHint(true);
      setTimeout(() => setMaxReachedHint(false), 2500);
      return;
    }
    const newId = Math.max(0, ...chatInstances.map((c) => c.id)) + 1;
    setChatInstances([...chatInstances, { id: newId, name: `Chat ${chatInstances.length + 1}`, assignedModels: [] }]);
    setInputs(prev => ({ ...prev, [newId]: "" }));
  };

  const updateChatName = (chatId, newName) => {
    const trimmed = newName.trim() || `Chat ${chatId}`;
    setChatInstances((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, name: trimmed } : c))
    );
    setEditingNameId(null);
  };

  const removeChat = (chatId) => {
    if (chatInstances.length > 1) {
      const chatToRemove = chatInstances.find((c) => c.id === chatId);
      if (chatToRemove?.assignedModels?.length && onChatRemoved) {
        onChatRemoved(chatToRemove.assignedModels);
      }
      setChatInstances(chatInstances.filter((chat) => chat.id !== chatId));
      setInputs((prev) => {
        const newInputs = { ...prev };
        delete newInputs[chatId];
        return newInputs;
      });
    }
  };

  const handleInputChange = (chatId, value) => {
    setInputs(prev => ({ ...prev, [chatId]: value }));
  };

  const handleSendMessage = (chatId) => {
    const message = inputs[chatId];
    if (message.trim()) {
      setSendMessages(prev => ({ ...prev, [chatId]: { message, timestamp: Date.now() } }));
      setInputs(prev => ({ ...prev, [chatId]: "" }));
    }
  };

  const handleMessageSent = (chatId) => {
    setSendMessages(prev => {
      const newSendMessages = { ...prev };
      delete newSendMessages[chatId];
      return newSendMessages;
    });
  };

  const handleKeyPress = (chatId, e) => {
    if (e.key === 'Enter') {
      handleSendMessage(chatId);
    }
  };

  // Determine CSS class based on number of chats
  const getGridClass = () => {
    switch (chatInstances.length) {
      case 1:
        return 'single-chat';
      case 2:
        return 'double-chat';
      case 3:
        return 'triple-chat';
      default:
        return 'single-chat';
    }
  };

  return (
    <div className="chat-container">
      <div className={`chat-grid ${getGridClass()}`}>
        {chatInstances.map((chat) => (
          <div key={chat.id} className="chat-instance">
            <div className="chat-header">
              <div className="chat-title-row">
                {editingNameId === chat.id ? (
                  <input
                    className="chat-name-input"
                    type="text"
                    value={chat.name}
                    onChange={(e) =>
                      setChatInstances((prev) =>
                        prev.map((c) =>
                          c.id === chat.id ? { ...c, name: e.target.value } : c
                        )
                      )}
                    onBlur={() => updateChatName(chat.id, chat.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") updateChatName(chat.id, chat.name);
                      if (e.key === "Escape") setEditingNameId(null);
                    }}
                    autoFocus
                    aria-label="Chat name"
                  />
                ) : (
                  <h3
                    className="chat-name"
                    onClick={() => setEditingNameId(chat.id)}
                    title="Click to rename"
                  >
                    {chat.name}
                  </h3>
                )}
                {chatInstances.length > 1 && (
                  <button
                    className="remove-chat-btn"
                    onClick={() => removeChat(chat.id)}
                    title="Remove chat"
                    aria-label="Remove chat"
                  >
                    ×
                  </button>
                )}
              </div>
              {chat.assignedModels.length > 0 && (
                <div className="assigned-models">
                  {chat.assignedModels.map((model, index) => (
                    <span key={index} className="model-badge">
                      {model}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Chatbot
              selectedModels={chat.assignedModels}
              onSendMessage={
                sendMessages[chat.id]
                  ? {
                      message: sendMessages[chat.id].message,
                      omitMemory: sendMessages[chat.id].omitMemory,
                      onSent: () => handleMessageSent(chat.id),
                    }
                  : null
              }
            />
            <div className="input-area">
              <input
                type="text"
                value={inputs[chat.id] || ""}
                onChange={(e) => handleInputChange(chat.id, e.target.value)}
                onKeyDown={(e) => handleKeyPress(chat.id, e)}
                placeholder="Type a message or paste a YouTube link..."
              />
              <button onClick={() => handleSendMessage(chat.id)}>Send</button>
            </div>
          </div>
        ))}
      </div>

      {maxReachedHint && (
        <div className="max-chats-hint" role="status">
          Maximum of 3 chats. Remove one to add another.
        </div>
      )}

      <button
        type="button"
        className={`add-chat-btn ${chatInstances.length >= 3 ? "disabled" : ""}`}
        onClick={addNewChat}
        disabled={chatInstances.length >= 3}
        title={chatInstances.length >= 3 ? "Maximum 3 chats" : "New chat"}
        aria-label="New chat"
      >
        +
      </button>
    </div>
  );
});

export default ChatContainer; 