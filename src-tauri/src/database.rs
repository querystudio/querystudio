use crate::queries;
use native_tls::TlsConnector;
use parking_lot::RwLock;
use postgres_native_tls::MakeTlsConnector;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio_postgres::Client;

fn format_db_error(e: tokio_postgres::Error) -> String {
    // Try to get detailed database error info
    if let Some(db_err) = e.as_db_error() {
        let mut msg = String::new();

        // Main error message
        msg.push_str(db_err.message());

        // Add detail if available
        if let Some(detail) = db_err.detail() {
            msg.push_str(&format!("\nDetail: {}", detail));
        }

        // Add hint if available
        if let Some(hint) = db_err.hint() {
            msg.push_str(&format!("\nHint: {}", hint));
        }

        // Add position info if available
        if let Some(position) = db_err.position() {
            match position {
                tokio_postgres::error::ErrorPosition::Original(pos) => {
                    msg.push_str(&format!("\nPosition: {}", pos));
                }
                tokio_postgres::error::ErrorPosition::Internal { position, query } => {
                    msg.push_str(&format!(
                        "\nInternal position: {} in query: {}",
                        position, query
                    ));
                }
            }
        }

        // Add where clause if available
        if let Some(where_) = db_err.where_() {
            msg.push_str(&format!("\nWhere: {}", where_));
        }

        // Add schema/table/column/constraint info if available
        if let Some(schema) = db_err.schema() {
            msg.push_str(&format!("\nSchema: {}", schema));
        }
        if let Some(table) = db_err.table() {
            msg.push_str(&format!("\nTable: {}", table));
        }
        if let Some(column) = db_err.column() {
            msg.push_str(&format!("\nColumn: {}", column));
        }
        if let Some(constraint) = db_err.constraint() {
            msg.push_str(&format!("\nConstraint: {}", constraint));
        }

        return msg;
    }

    e.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ConnectionConfig {
    ConnectionString {
        connection_string: String,
    },
    Parameters {
        host: String,
        port: u16,
        database: String,
        username: String,
        password: String,
    },
}

impl ConnectionConfig {
    pub fn to_connection_string(&self) -> String {
        match self {
            ConnectionConfig::ConnectionString { connection_string } => connection_string.clone(),
            ConnectionConfig::Parameters {
                host,
                port,
                database,
                username,
                password,
            } => format!(
                "host={} port={} dbname={} user={} password={}",
                host, port, database, username, password
            ),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TableInfo {
    pub schema: String,
    pub name: String,
    pub row_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
    pub has_default: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub row_count: usize,
}

pub struct ConnectionManager {
    connections: RwLock<HashMap<String, Arc<Client>>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
        }
    }

    pub async fn connect(&self, id: String, config: ConnectionConfig) -> Result<(), String> {
        let conn_string = config.to_connection_string();

        // Try SSL first, then fall back to non-SSL
        let client = match self.connect_with_ssl(&conn_string).await {
            Ok(client) => client,
            Err(_ssl_err) => {
                // Fall back to non-SSL connection
                self.connect_without_ssl(&conn_string).await?
            }
        };

        self.connections.write().insert(id, Arc::new(client));
        Ok(())
    }

    async fn connect_with_ssl(&self, conn_string: &str) -> Result<Client, String> {
        // Create a TLS connector that accepts invalid certificates (for self-signed certs)
        let tls_connector = TlsConnector::builder()
            .danger_accept_invalid_certs(true)
            .danger_accept_invalid_hostnames(true)
            .build()
            .map_err(|e| format!("Failed to create TLS connector: {}", e))?;

        let connector = MakeTlsConnector::new(tls_connector);

        // Append sslmode=require if not already present
        let ssl_conn_string = if conn_string.contains("sslmode=") {
            conn_string.to_string()
        } else {
            format!("{} sslmode=require", conn_string)
        };

        let (client, connection) = tokio_postgres::connect(&ssl_conn_string, connector)
            .await
            .map_err(|e| format!("SSL connection failed: {}", e))?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Connection error: {}", e);
            }
        });

        Ok(client)
    }

    async fn connect_without_ssl(&self, conn_string: &str) -> Result<Client, String> {
        let (client, connection) = tokio_postgres::connect(conn_string, tokio_postgres::NoTls)
            .await
            .map_err(|e| format!("Connection failed: {}", e))?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Connection error: {}", e);
            }
        });

        Ok(client)
    }

    pub fn disconnect(&self, id: &str) -> Result<(), String> {
        self.connections
            .write()
            .remove(id)
            .ok_or_else(|| "Connection not found".to_string())?;
        Ok(())
    }

    pub fn get_client(&self, id: &str) -> Result<Arc<Client>, String> {
        self.connections
            .read()
            .get(id)
            .cloned()
            .ok_or_else(|| "Connection not found".to_string())
    }

    pub async fn list_tables(&self, connection_id: &str) -> Result<Vec<TableInfo>, String> {
        let client = self.get_client(connection_id)?;

        let rows = client
            .query(queries::LIST_TABLES, &[])
            .await
            .map_err(format_db_error)?;

        let tables = rows
            .iter()
            .map(|row| TableInfo {
                schema: row.get("schema"),
                name: row.get("name"),
                row_count: row.get("row_count"),
            })
            .collect();

        Ok(tables)
    }

    pub async fn get_table_columns(
        &self,
        connection_id: &str,
        schema: &str,
        table: &str,
    ) -> Result<Vec<ColumnInfo>, String> {
        let client = self.get_client(connection_id)?;

        let rows = client
            .query(queries::GET_TABLE_COLUMNS, &[&schema, &table])
            .await
            .map_err(format_db_error)?;

        let columns = rows
            .iter()
            .map(|row| ColumnInfo {
                name: row.get("name"),
                data_type: row.get("data_type"),
                is_nullable: row.get("is_nullable"),
                is_primary_key: row.get("is_primary_key"),
                has_default: row.get("has_default"),
            })
            .collect();

        Ok(columns)
    }

    pub async fn get_table_data(
        &self,
        connection_id: &str,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult, String> {
        let client = self.get_client(connection_id)?;
        let query = queries::select_table_data(schema, table, limit, offset);
        self.execute_query_internal(&client, &query).await
    }

    pub async fn execute_query(
        &self,
        connection_id: &str,
        query: &str,
    ) -> Result<QueryResult, String> {
        let client = self.get_client(connection_id)?;
        self.execute_query_internal(&client, query).await
    }

    async fn execute_query_internal(
        &self,
        client: &Client,
        query: &str,
    ) -> Result<QueryResult, String> {
        let rows = client.query(query, &[]).await.map_err(format_db_error)?;

        if rows.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                row_count: 0,
            });
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect();

        let result_rows: Vec<Vec<serde_json::Value>> = rows
            .iter()
            .map(|row| {
                row.columns()
                    .iter()
                    .enumerate()
                    .map(|(i, col)| postgres_value_to_json(row, i, col.type_()))
                    .collect()
            })
            .collect();

        Ok(QueryResult {
            columns,
            row_count: result_rows.len(),
            rows: result_rows,
        })
    }

    pub async fn get_table_count(
        &self,
        connection_id: &str,
        schema: &str,
        table: &str,
    ) -> Result<i64, String> {
        let client = self.get_client(connection_id)?;
        let query = queries::count_table_rows(schema, table);
        let row = client
            .query_one(&query, &[])
            .await
            .map_err(format_db_error)?;

        Ok(row.get::<_, i64>("count"))
    }
}

fn postgres_value_to_json(
    row: &tokio_postgres::Row,
    idx: usize,
    pg_type: &tokio_postgres::types::Type,
) -> serde_json::Value {
    use tokio_postgres::types::Type;

    match *pg_type {
        Type::BOOL => row
            .try_get::<_, Option<bool>>(idx)
            .ok()
            .flatten()
            .map(serde_json::Value::Bool)
            .unwrap_or(serde_json::Value::Null),
        Type::INT2 => row
            .try_get::<_, Option<i16>>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),
        Type::INT4 => row
            .try_get::<_, Option<i32>>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),
        Type::INT8 => row
            .try_get::<_, Option<i64>>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::Number(v.into()))
            .unwrap_or(serde_json::Value::Null),
        Type::FLOAT4 => row
            .try_get::<_, Option<f32>>(idx)
            .ok()
            .flatten()
            .and_then(|v| serde_json::Number::from_f64(v as f64))
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        Type::FLOAT8 => row
            .try_get::<_, Option<f64>>(idx)
            .ok()
            .flatten()
            .and_then(serde_json::Number::from_f64)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        Type::JSON | Type::JSONB => row
            .try_get::<_, Option<serde_json::Value>>(idx)
            .ok()
            .flatten()
            .unwrap_or(serde_json::Value::Null),
        Type::UUID => row
            .try_get::<_, Option<uuid::Uuid>>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::String(v.to_string()))
            .unwrap_or(serde_json::Value::Null),
        Type::TIMESTAMP | Type::TIMESTAMPTZ => row
            .try_get::<_, Option<chrono::NaiveDateTime>>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::String(v.to_string()))
            .unwrap_or(serde_json::Value::Null),
        Type::DATE => row
            .try_get::<_, Option<chrono::NaiveDate>>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::String(v.to_string()))
            .unwrap_or(serde_json::Value::Null),
        Type::TIME => row
            .try_get::<_, Option<chrono::NaiveTime>>(idx)
            .ok()
            .flatten()
            .map(|v| serde_json::Value::String(v.to_string()))
            .unwrap_or(serde_json::Value::Null),
        _ => row
            .try_get::<_, Option<String>>(idx)
            .ok()
            .flatten()
            .map(serde_json::Value::String)
            .unwrap_or(serde_json::Value::Null),
    }
}
