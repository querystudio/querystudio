use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum DatabaseType {
    #[default]
    Postgres,
    Mysql,
    Sqlite,
    Redis,
    Mongodb,
}

impl fmt::Display for DatabaseType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DatabaseType::Postgres => write!(f, "PostgreSQL"),
            DatabaseType::Mysql => write!(f, "MySQL"),
            DatabaseType::Sqlite => write!(f, "SQLite"),
            DatabaseType::Redis => write!(f, "Redis"),
            DatabaseType::Mongodb => write!(f, "MongoDB"),
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

#[async_trait]
pub trait DatabaseOperations: Send + Sync {
    async fn list_tables(&self, connection_id: &str) -> Result<Vec<TableInfo>, String>;
    async fn get_table_columns(
        &self,
        connection_id: &str,
        schema: &str,
        table: &str,
    ) -> Result<Vec<ColumnInfo>, String>;
    async fn execute_query(&self, connection_id: &str, query: &str) -> Result<QueryResult, String>;
    async fn get_table_data(
        &self,
        connection_id: &str,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult, String>;
}
