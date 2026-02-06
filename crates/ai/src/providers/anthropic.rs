use super::{
    AIModel, AIProvider, AIProviderError, AIProviderType, ChatMessage, ChatResponse, ChatRole,
    FinishReason, ModelInfo, StreamChunk, ToolCall, ToolDefinition,
};
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

const ANTHROPIC_MESSAGES_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODELS_API_URL: &str = "https://api.anthropic.com/v1/models";
const ANTHROPIC_API_VERSION: &str = "2023-06-01";
const DEFAULT_MAX_TOKENS: u32 = 4096;

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
}

impl AnthropicProvider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }
}

// ============================================================================
// Request Types
// ============================================================================

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<AnthropicMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tools: Vec<AnthropicTool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_choice: Option<AnthropicToolChoice>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct AnthropicToolChoice {
    #[serde(rename = "type")]
    choice_type: String,
}

#[derive(Debug, Serialize)]
struct AnthropicMessage {
    role: String,
    content: Vec<AnthropicRequestContentBlock>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum AnthropicRequestContentBlock {
    Text {
        text: String,
    },
    ToolUse {
        id: String,
        name: String,
        input: serde_json::Value,
    },
    ToolResult {
        tool_use_id: String,
        content: String,
    },
}

#[derive(Debug, Serialize)]
struct AnthropicTool {
    name: String,
    description: String,
    input_schema: serde_json::Value,
}

// ============================================================================
// Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicResponseContentBlock>,
    #[serde(default)]
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponseContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    input: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize, Clone)]
struct AnthropicErrorEnvelope {
    error: AnthropicErrorPayload,
}

#[derive(Debug, Deserialize, Clone)]
struct AnthropicErrorPayload {
    message: String,
    #[serde(rename = "type")]
    error_type: Option<String>,
}

// ============================================================================
// Streaming Types
// ============================================================================

#[derive(Debug, Deserialize)]
struct AnthropicStreamEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(default)]
    index: Option<usize>,
    #[serde(default)]
    content_block: Option<AnthropicStreamContentBlock>,
    #[serde(default)]
    delta: Option<AnthropicStreamDelta>,
    #[serde(default)]
    stop_reason: Option<String>,
    #[serde(default)]
    error: Option<AnthropicErrorPayload>,
}

#[derive(Debug, Deserialize)]
struct AnthropicStreamContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    input: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct AnthropicStreamDelta {
    #[serde(rename = "type", default)]
    delta_type: Option<String>,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    partial_json: Option<String>,
    #[serde(default)]
    stop_reason: Option<String>,
}

// ============================================================================
// Conversion Helpers
// ============================================================================

fn convert_tool(tool: &ToolDefinition) -> AnthropicTool {
    AnthropicTool {
        name: tool.name.clone(),
        description: tool.description.clone(),
        input_schema: serde_json::json!({
            "type": tool.parameters.param_type,
            "properties": tool.parameters.properties,
            "required": tool.parameters.required,
        }),
    }
}

fn convert_messages(messages: &[ChatMessage]) -> (Option<String>, Vec<AnthropicMessage>) {
    let mut system_messages = Vec::new();
    let mut anthropic_messages = Vec::new();

    for msg in messages {
        match msg.role {
            ChatRole::System => {
                if let Some(content) = msg.content.as_deref().filter(|c| !c.is_empty()) {
                    system_messages.push(content.to_string());
                }
            }
            ChatRole::User => {
                if let Some(content) = msg.content.as_deref().filter(|c| !c.is_empty()) {
                    anthropic_messages.push(AnthropicMessage {
                        role: "user".to_string(),
                        content: vec![AnthropicRequestContentBlock::Text {
                            text: content.to_string(),
                        }],
                    });
                }
            }
            ChatRole::Assistant => {
                let mut blocks = Vec::new();

                if let Some(content) = msg.content.as_deref().filter(|c| !c.is_empty()) {
                    blocks.push(AnthropicRequestContentBlock::Text {
                        text: content.to_string(),
                    });
                }

                if let Some(tool_calls) = &msg.tool_calls {
                    for tc in tool_calls {
                        let input: serde_json::Value =
                            serde_json::from_str(&tc.arguments).unwrap_or(serde_json::json!({}));
                        blocks.push(AnthropicRequestContentBlock::ToolUse {
                            id: tc.id.clone(),
                            name: tc.name.clone(),
                            input,
                        });
                    }
                }

                if !blocks.is_empty() {
                    anthropic_messages.push(AnthropicMessage {
                        role: "assistant".to_string(),
                        content: blocks,
                    });
                }
            }
            ChatRole::Tool => {
                if let (Some(tool_use_id), Some(content)) = (&msg.tool_call_id, &msg.content) {
                    anthropic_messages.push(AnthropicMessage {
                        role: "user".to_string(),
                        content: vec![AnthropicRequestContentBlock::ToolResult {
                            tool_use_id: tool_use_id.clone(),
                            content: content.clone(),
                        }],
                    });
                }
            }
        }
    }

    let system = if system_messages.is_empty() {
        None
    } else {
        Some(system_messages.join("\n\n"))
    };

    (system, anthropic_messages)
}

fn parse_finish_reason(reason: Option<&str>) -> FinishReason {
    match reason {
        Some("end_turn") | Some("stop_sequence") => FinishReason::Stop,
        Some("tool_use") => FinishReason::ToolCalls,
        Some("max_tokens") => FinishReason::Length,
        Some("refusal") => FinishReason::ContentFilter,
        _ => FinishReason::Unknown,
    }
}

fn parse_error_response(status_code: u16, body: &str) -> AIProviderError {
    if let Ok(error_response) = serde_json::from_str::<AnthropicErrorEnvelope>(body) {
        let mut err = AIProviderError::new(error_response.error.message);
        if let Some(error_type) = error_response.error.error_type {
            err = err.with_type(error_type);
        }
        if status_code == 429 || status_code >= 500 {
            err = err.retryable();
        }
        return err;
    }

    let mut err = AIProviderError::new(body.to_string());
    if status_code == 429 || status_code >= 500 {
        err = err.retryable();
    }
    err
}

// ============================================================================
// AIProvider Implementation
// ============================================================================

#[async_trait]
impl AIProvider for AnthropicProvider {
    fn provider_type(&self) -> AIProviderType {
        AIProviderType::Anthropic
    }

    async fn chat(
        &self,
        model: &AIModel,
        messages: Vec<ChatMessage>,
        tools: &[ToolDefinition],
    ) -> Result<ChatResponse, AIProviderError> {
        let (system, anthropic_messages) = convert_messages(&messages);
        let anthropic_tools: Vec<AnthropicTool> = tools.iter().map(convert_tool).collect();

        let request = AnthropicRequest {
            model: model.api_model_id(),
            max_tokens: DEFAULT_MAX_TOKENS,
            messages: anthropic_messages,
            system,
            tools: anthropic_tools,
            tool_choice: if tools.is_empty() {
                None
            } else {
                Some(AnthropicToolChoice {
                    choice_type: "auto".to_string(),
                })
            },
            stream: None,
        };

        let response = self
            .client
            .post(ANTHROPIC_MESSAGES_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_API_VERSION)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIProviderError::new(format!("Request failed: {}", e)).retryable())?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|e| AIProviderError::new(format!("Failed to read response: {}", e)))?;

        if !status.is_success() {
            return Err(parse_error_response(status.as_u16(), &body));
        }

        let anthropic_response: AnthropicResponse = serde_json::from_str(&body)
            .map_err(|e| AIProviderError::new(format!("Failed to parse response: {}", e)))?;

        let mut content = String::new();
        let mut tool_calls = Vec::new();

        for block in anthropic_response.content {
            match block.block_type.as_str() {
                "text" => {
                    if let Some(text) = block.text {
                        content.push_str(&text);
                    }
                }
                "tool_use" => {
                    if let (Some(id), Some(name)) = (block.id, block.name) {
                        let input = block.input.unwrap_or(serde_json::json!({}));
                        let arguments = serde_json::to_string(&input).unwrap_or_default();
                        tool_calls.push(ToolCall {
                            id,
                            name,
                            arguments,
                        });
                    }
                }
                _ => {}
            }
        }

        let finish_reason = if !tool_calls.is_empty() {
            FinishReason::ToolCalls
        } else {
            parse_finish_reason(anthropic_response.stop_reason.as_deref())
        };

        Ok(ChatResponse {
            content: if content.is_empty() {
                None
            } else {
                Some(content)
            },
            tool_calls,
            finish_reason,
        })
    }

    async fn chat_stream(
        &self,
        model: &AIModel,
        messages: Vec<ChatMessage>,
        tools: &[ToolDefinition],
    ) -> Result<mpsc::Receiver<StreamChunk>, AIProviderError> {
        let (system, anthropic_messages) = convert_messages(&messages);
        let anthropic_tools: Vec<AnthropicTool> = tools.iter().map(convert_tool).collect();

        let request = AnthropicRequest {
            model: model.api_model_id(),
            max_tokens: DEFAULT_MAX_TOKENS,
            messages: anthropic_messages,
            system,
            tools: anthropic_tools,
            tool_choice: if tools.is_empty() {
                None
            } else {
                Some(AnthropicToolChoice {
                    choice_type: "auto".to_string(),
                })
            },
            stream: Some(true),
        };

        let response = self
            .client
            .post(ANTHROPIC_MESSAGES_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_API_VERSION)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AIProviderError::new(format!("Request failed: {}", e)).retryable())?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(parse_error_response(status.as_u16(), &body));
        }

        let (tx, rx) = mpsc::channel(100);
        let mut stream = response.bytes_stream();

        tokio::spawn(async move {
            use futures_util::StreamExt;
            use std::collections::HashMap;

            let mut buffer = String::new();
            let mut tool_call_ids_by_index: HashMap<usize, String> = HashMap::new();
            let mut done_sent = false;

            while let Some(chunk_result) = stream.next().await {
                match chunk_result {
                    Ok(chunk) => {
                        let chunk_str = String::from_utf8_lossy(&chunk);
                        buffer.push_str(&chunk_str);

                        while let Some(pos) =
                            buffer.find("\n\n").or_else(|| buffer.find("\r\n\r\n"))
                        {
                            let delimiter_len = if buffer[pos..].starts_with("\r\n\r\n") {
                                4
                            } else {
                                2
                            };
                            let event = buffer[..pos].to_string();
                            buffer = buffer[pos + delimiter_len..].to_string();

                            let mut _event_name: Option<String> = None;
                            let mut data_payload = String::new();

                            for line in event.lines() {
                                if let Some(name) = line.strip_prefix("event: ") {
                                    _event_name = Some(name.to_string());
                                } else if let Some(data) = line.strip_prefix("data: ") {
                                    if !data_payload.is_empty() {
                                        data_payload.push('\n');
                                    }
                                    data_payload.push_str(data);
                                }
                            }

                            if data_payload.is_empty() {
                                continue;
                            }

                            if data_payload == "[DONE]" {
                                if !done_sent {
                                    let _ = tx
                                        .send(StreamChunk::Done {
                                            finish_reason: FinishReason::Stop,
                                        })
                                        .await;
                                }
                                return;
                            }

                            if let Ok(event) =
                                serde_json::from_str::<AnthropicStreamEvent>(&data_payload)
                            {
                                if event.event_type == "error" {
                                    let error_msg = event
                                        .error
                                        .map(|e| e.message)
                                        .unwrap_or_else(|| "Stream error".to_string());
                                    let _ = tx.send(StreamChunk::Error(error_msg)).await;
                                    return;
                                }

                                match event.event_type.as_str() {
                                    "content_block_start" => {
                                        if let Some(block) = event.content_block {
                                            match block.block_type.as_str() {
                                                "text" => {
                                                    if let Some(text) =
                                                        block.text.filter(|t| !t.is_empty())
                                                    {
                                                        let _ = tx
                                                            .send(StreamChunk::Content(text))
                                                            .await;
                                                    }
                                                }
                                                "tool_use" => {
                                                    let index = event.index.unwrap_or(0);
                                                    let id = block.id.unwrap_or_else(|| {
                                                        format!("tool_use_{}", index)
                                                    });
                                                    let name =
                                                        block.name.unwrap_or_else(|| "tool".into());

                                                    tool_call_ids_by_index
                                                        .insert(index, id.clone());

                                                    let _ = tx
                                                        .send(StreamChunk::ToolCallStart {
                                                            id: id.clone(),
                                                            name,
                                                        })
                                                        .await;

                                                    if let Some(input) = block.input {
                                                        let input_json =
                                                            serde_json::to_string(&input)
                                                                .unwrap_or_default();
                                                        if !input_json.is_empty()
                                                            && input_json != "{}"
                                                        {
                                                            let _ = tx
                                                                .send(StreamChunk::ToolCallDelta {
                                                                    id,
                                                                    arguments: input_json,
                                                                })
                                                                .await;
                                                        }
                                                    }
                                                }
                                                _ => {}
                                            }
                                        }
                                    }
                                    "content_block_delta" => {
                                        if let Some(delta) = event.delta {
                                            match delta.delta_type.as_deref() {
                                                Some("text_delta") => {
                                                    if let Some(text) =
                                                        delta.text.filter(|t| !t.is_empty())
                                                    {
                                                        let _ = tx
                                                            .send(StreamChunk::Content(text))
                                                            .await;
                                                    }
                                                }
                                                Some("input_json_delta") => {
                                                    if let (Some(index), Some(partial_json)) =
                                                        (event.index, delta.partial_json)
                                                    {
                                                        if let Some(id) =
                                                            tool_call_ids_by_index.get(&index)
                                                        {
                                                            let _ = tx
                                                                .send(StreamChunk::ToolCallDelta {
                                                                    id: id.clone(),
                                                                    arguments: partial_json,
                                                                })
                                                                .await;
                                                        }
                                                    }
                                                }
                                                _ => {}
                                            }
                                        }
                                    }
                                    "message_delta" => {
                                        let finish_reason = event
                                            .stop_reason
                                            .or_else(|| event.delta.and_then(|d| d.stop_reason));

                                        if let Some(reason) = finish_reason {
                                            done_sent = true;
                                            let _ = tx
                                                .send(StreamChunk::Done {
                                                    finish_reason: parse_finish_reason(Some(
                                                        &reason,
                                                    )),
                                                })
                                                .await;
                                        }
                                    }
                                    "message_stop" => {
                                        if !done_sent {
                                            let _ = tx
                                                .send(StreamChunk::Done {
                                                    finish_reason: FinishReason::Stop,
                                                })
                                                .await;
                                        }
                                        return;
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let _ = tx.send(StreamChunk::Error(e.to_string())).await;
                        return;
                    }
                }
            }

            if !done_sent {
                let _ = tx
                    .send(StreamChunk::Done {
                        finish_reason: FinishReason::Stop,
                    })
                    .await;
            }
        });

        Ok(rx)
    }
}

// ============================================================================
// Model Fetching
// ============================================================================

#[derive(Debug, Deserialize)]
struct AnthropicModelsResponse {
    data: Vec<AnthropicModelEntry>,
}

#[derive(Debug, Deserialize)]
struct AnthropicModelEntry {
    id: String,
    #[serde(default)]
    display_name: Option<String>,
}

/// Fetches available models from the Anthropic API.
/// Returns them as `ModelInfo` with the `anthropic/` prefix on the id.
pub async fn fetch_models(api_key: &str) -> Result<Vec<ModelInfo>, AIProviderError> {
    let client = Client::new();
    let response = client
        .get(ANTHROPIC_MODELS_API_URL)
        .header("x-api-key", api_key)
        .header("anthropic-version", ANTHROPIC_API_VERSION)
        .send()
        .await
        .map_err(|e| AIProviderError::new(format!("Failed to fetch models: {}", e)))?;

    let status = response.status();
    let body = response.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(parse_error_response(status.as_u16(), &body));
    }

    let models_response: AnthropicModelsResponse = serde_json::from_str(&body)
        .map_err(|e| AIProviderError::new(format!("Failed to parse models response: {}", e)))?;

    let models = models_response
        .data
        .into_iter()
        .map(|m| ModelInfo {
            id: format!("anthropic/{}", m.id.clone()),
            name: m.display_name.unwrap_or_else(|| m.id.clone()),
            provider: AIProviderType::Anthropic,
            logo_provider: Some("anthropic".to_string()),
        })
        .collect();

    Ok(models)
}
