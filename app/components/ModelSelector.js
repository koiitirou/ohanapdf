import { MODEL_OPTIONS } from "../utils/modelConfig";

export default function ModelSelector({ selectedModel, onSelectModel }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        justifyContent: "center",
        marginBottom: "20px",
        flexWrap: "wrap",
      }}
    >
      {MODEL_OPTIONS.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelectModel(m.id)}
          type="button"
          style={{
            padding: "8px 16px",
            fontSize: "0.9rem",
            borderRadius: "20px",
            border:
              selectedModel === m.id ? "1px solid #666" : "1px solid #ccc",
            background: selectedModel === m.id ? "#f0f0f0" : "transparent",
            color: selectedModel === m.id ? "#333" : "#666",
            fontWeight: selectedModel === m.id ? "bold" : "normal",
            cursor: "pointer",
            outline: "none",
            transition: "all 0.2s ease",
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
