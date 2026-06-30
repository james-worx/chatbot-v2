import React from "react";
import "../App.css";

const PersonaSelector = ({ personas, selectedPersonaId, onSelect }) => {
  return (
    <div className="persona-selector" role="radiogroup" aria-label="Select a persona">
      {personas.map((persona) => {
        const active = persona.id === selectedPersonaId;
        return (
          <button
            key={persona.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`persona-card ${active ? "active" : ""}`}
            onClick={() => onSelect(persona)}
            title={`Use ${persona.name}'s memories`}
          >
            <span className="persona-emoji">{persona.emoji}</span>
            <span className="persona-text">
              <span className="persona-name">{persona.name}</span>
              <span className="persona-tagline">{persona.tagline}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PersonaSelector;
