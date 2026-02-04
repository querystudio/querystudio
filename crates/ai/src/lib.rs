pub mod agent;
pub mod providers;
pub mod tools;
pub mod types;

// Re-export key types for convenient access
pub use agent::{Agent, AgentEvent, AgentMessage, AgentToolCall};
pub use providers::{
    create_ai_provider, get_available_models, AIModel, AIProvider, AIProviderError, AIProviderType,
    ChatMessage, ChatResponse, ChatRole, FinishReason, ModelInfo, StreamChunk, ToolCall,
    ToolDefinition, ToolParameters,
};
pub use types::{ColumnInfo, DatabaseOperations, DatabaseType, QueryResult, TableInfo};
