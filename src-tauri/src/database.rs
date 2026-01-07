use crate::queries;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio_postgres::{Client, NoTls};

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

        let (client, connection) = tokio_postgres::connect(&conn_string, NoTls)
            .await
            .map_err(|e| e.to_string())?;

        tokio::spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("Connection error: {}", e);
            }
        });

        self.connections.write().insert(id, Arc::new(client));
        Ok(())
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
            .map_err(|e| e.to_string())?;

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
            .map_err(|e| e.to_string())?;

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
        let rows = client.query(query, &[]).await.map_err(|e| e.to_string())?;

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
            .map_err(|e| e.to_string())?;

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
