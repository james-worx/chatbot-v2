import React, { useState, useEffect } from "react";
import "../App.css"; // Ensure you include your CSS file

const ModelList = ({ selectedModels: controlledSelection, onSelectionChange }) => {
  const [models, setModels] = useState([]);
  const [internalSelected, setInternalSelected] = useState([]);
  const selectedModels = controlledSelection !== undefined ? controlledSelection : internalSelected;

  const getShortenedModelName = (modelId) => {
    const nameMap = {
      // Groq Systems
      "compound-beta": "Compound Beta",
      "groq/compound": "Groq Compound",
      "groq/compound-mini": "Groq Compound Mini",
  
      // Production Models
      "gemma2-9b-it": "Gemma 2-9B IT",
      "llama-3.1-8b-instant": "Llama 3.1-8B Instant",
      "llama-3.3-70b-versatile": "Llama 3.3-70B Versatile",
      "meta-llama/llama-guard-4-12b": "Llama Guard 4-12B",
  
      // OpenAI (Groq Hosted OSS)
      "openai/gpt-oss-120b": "GPT OSS 120B",
      "openai/gpt-oss-20b": "GPT OSS 20B",
      "openai/gpt-oss-safeguard-20b": "GPT OSS Safeguard 20B",
      "whisper-large-v3": "Whisper Large v3",
      "whisper-large-v3-turbo": "Whisper Large v3 Turbo",
  
      // Moonshot AI
      "moonshotai/kimi-k2-instruct": "Kimi K2 Instruct",
      "moonshotai/kimi-k2-instruct-0905": "Kimi K2 Instruct (0905)",
  
      // Alibaba Cloud
      "qwen/qwen3-32b": "Qwen 3-32B",
  
      // Canopy Labs
      "canopylabs/orpheus-v1-english": "Orpheus v1 (English)",
      "canopylabs/orpheus-arabic-saudi": "Orpheus (Arabic - Saudi)",
  
      // SDAIA
      "allam-2-7b": "Allam 2 7B",
  
      // Preview Models
      "deepseek-r1-distill-llama-70b": "DeepSeek R1 Distill",
      "meta-llama/llama-4-maverick-17b-128e-instruct": "Llama 4 Maverick 17B",
      "meta-llama/llama-4-scout-17b-16e-instruct": "Llama 4 Scout 17B",
      "meta-llama/llama-prompt-guard-2-22m": "Llama Prompt Guard 2-22M",
      "meta-llama/llama-prompt-guard-2-86m": "Llama Prompt Guard 2-86M",
      "meta-llama/llama-guard-4-12b": "Llama Guard 4-12B",
      "mistral-saba-24b": "Mistral Saba 24B",
  
      // Legacy / Deprecated
      "llama-guard-3-8b": "Llama Guard 3-8B",
      "llama3-70b-8192": "Llama 3-70B",
      "llama3-8b-8192": "Llama 3-8B",
      "llama-3.2-1b-preview": "Llama 3.2-1B",
      "llama-3.3-70b-specdec": "Llama 3.3-70B SpecDec",
      "llama-3.2-90b-vision-preview": "Llama 3.2-90B Vision",
      "llama-3.2-11b-vision-preview": "Llama 3.2-11B Vision",
      "mixtral-8x7b-32768": "Mixtral 8x7B",
      "llama-3.2-3b-preview": "Llama 3.2-3B",
  
      // Default fallback
      "system": "System",
      "user": "User"
    };
  
    return nameMap[modelId] || modelId;
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
        {models.map((model) => (
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