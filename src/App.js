import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import ChatContainer from "./components/ChatContainer";
import ModelList from "./components/ModelList";
import LoadingScreen from "./components/LoadingScreen";
import PersonaSelector from "./components/PersonaSelector";
import personas from "./data/personas.json";

function App() {
  const [selectedModels, setSelectedModels] = useState([]);
  const [globalInput, setGlobalInput] = useState("");
  const [omitMemory, setOmitMemory] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(personas[0]);
  const [isLoading, setIsLoading] = useState(true);
  const chatContainerRef = useRef();

  // Show loading screen on every refresh
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Show loading for 2 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleGlobalSend = () => {
    if (globalInput.trim() && chatContainerRef.current) {
      chatContainerRef.current.sendToAllChats(globalInput, omitMemory);
      setGlobalInput("");
    }
  };

  const handleGlobalKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleGlobalSend();
    }
  };

  const handleChatRemoved = (modelsToUnselect) => {
    setSelectedModels((prev) => prev.filter((m) => !modelsToUnselect.includes(m)));
  };

  return (
    <div className="App">
      <LoadingScreen isLoading={isLoading} />
      
      {!isLoading && (
        <>
          <div className="header-container">
            <h1>Ask AI</h1>
            <p>powered by Groq accelerated inference, Mem0 long-term memory</p>
            <PersonaSelector
              personas={personas}
              selectedPersonaId={selectedPersona.id}
              onSelect={setSelectedPersona}
            />
            <p className="persona-hint">
              Chatting as <strong>{selectedPersona.name}</strong> — responses use {selectedPersona.name}'s memories as context.
            </p>
          </div>

          <div className="global-input-container">
            <div className="global-input-area">
              <input 
                type="text" 
                value={globalInput} 
                onChange={(e) => setGlobalInput(e.target.value)}
                onKeyDown={handleGlobalKeyPress}
                placeholder="Ask all chatbots simultaneously..." 
                className="global-input"
              />
              <div className="global-controls">
                <label className="memory-checkbox">
                  <input 
                    type="checkbox" 
                    checked={omitMemory}
                    onChange={(e) => setOmitMemory(e.target.checked)}
                  />
                  <span>Omit Memory</span>
                </label>
                <button 
                  onClick={handleGlobalSend}
                  className="global-send-btn"
                  disabled={!globalInput.trim()}
                >
                  Send to All
                </button>
              </div>
            </div>
          </div>

          <div className="center-section">
            <ModelList
              selectedModels={selectedModels}
              onSelectionChange={setSelectedModels}
            />
            <ChatContainer
              ref={chatContainerRef}
              selectedModels={selectedModels}
              persona={selectedPersona}
              onChatRemoved={handleChatRemoved}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default App;