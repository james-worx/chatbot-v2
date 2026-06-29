import React, { useState, useEffect } from "react";
import "../App.css"; // Ensure you include your CSS file

const ModelList = ({ selectedModels: controlledSelection, onSelectionChange }) => {
  const [models, setModels] = useState([]);
  const [internalSelected, setInternalSelected] = useState([]);
  const selectedModels = controlledSelection !== undefined ? controlledSelection : internalSelected;

  const getShortenedModelName = (modelId) => {
    const nameMap = {
      // Groq Systems
      "groq/compound": "Groq Compound",
      "groq/compound-mini": "Groq Compound Mini",

      // Core Chat Models
      "llama-3.1-8b-instant": "Llama 3.1-8B Instant",
      "llama-3.3-70b-versatile": "Llama 3.3-70B Versatile",
      "meta-llama/llama-4-maverick-17b-128e-instruct": "Llama 4 Maverick 17B",
      "meta-llama/llama-4-scout-17b-16e-instruct": "Llama 4 Scout 17B",

      // OpenAI OSS (Groq Hosted)
      "openai/gpt-oss-120b": "GPT OSS 120B",
      "openai/gpt-oss-20b": "GPT OSS 20B",

      // Moonshot AI
      "moonshotai/kimi-k2-instruct": "Kimi K2 Instruct",

      // Alibaba Cloud
      "qwen/qwen3-32b": "Qwen 3-32B",

      // Default fallback
      "system": "System",
      "user": "User"
    };
  
    return nameMap[modelId] || null; // returning null hides non-chat models
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await import("../data/groq-models.json");
        setModels(response.data);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    fetchModels();
  }, []);

  const handleCheckboxChange = (id) => {
    const prevSelected = selectedModels;
    if (prevSelected.includes(id)) {
      const updatedSelection = prevSelected.filter((modelId) => modelId !== id);
      onSelectionChange(updatedSelection);
      if (controlledSelection === undefined) setInternalSelected(updatedSelection);
    } else {
      if (prevSelected.length >= 3) {
        alert("You can only select up to 3 models at a time.");
        return;
      }
      const updatedSelection = [...prevSelected, id];
      onSelectionChange(updatedSelection);
      if (controlledSelection === undefined) setInternalSelected(updatedSelection);
    }
  };

  return (
    <div className="model-list">
      <h2>Select Models (Max 3)</h2>
      <div className="model-list-panel">
      {models
  .filter((model) => getShortenedModelName(model.id)) // only render chat models
  .map((model) => (
    <label key={model.id} className="model-item">
      <input
        type="checkbox"
        checked={selectedModels.includes(model.id)}
        onChange={() => handleCheckboxChange(model.id)}
      />
      <span className="model-name">{getShortenedModelName(model.id)}</span>
      <span className="model-owner">({model.owned_by})</span>
    </label>
  ))}
      </div>
      {selectedModels.length > 0 && (
        <div className="selected-count">
          Selected: {selectedModels.length}/3
        </div>
      )}
    </div>
  );
};

export default ModelList;