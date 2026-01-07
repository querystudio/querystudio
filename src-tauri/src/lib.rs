mod database;
mod queries;
mod storage;

use database::{ColumnInfo, ConnectionConfig, ConnectionManager, QueryResult, TableInfo};
use storage::{SavedConnection, SavedConnections};
use std::sync::Arc;
use tauri::{AppHandle, State};

type DbState = Arc<ConnectionManager>;

#[tauri::command]
async fn connect(
    state: State<'_, DbState>,
    id: String,
    config: ConnectionConfig,
) -> Result<(), String> {
    state.connect(id, config).await
}

#[tauri::command]
async fn disconnect(state: State<'_, DbState>, id: String) -> Result<(), String> {
    state.disconnect(&id)
}

#[tauri::command]
async fn test_connection(config: ConnectionConfig) -> Result<(), String> {
    let manager = ConnectionManager::new();
    manager.connect("test".to_string(), config).await?;
    manager.disconnect("test")?;
    Ok(())
}

#[tauri::command]
async fn list_tables(
    state: State<'_, DbState>,
    connection_id: String,
) -> Result<Vec<TableInfo>, String> {
    state.list_tables(&connection_id).await
}

#[tauri::command]
async fn get_table_columns(
    state: State<'_, DbState>,
    connection_id: String,
    schema: String,
    table: String,
) -> Result<Vec<ColumnInfo>, String> {
    state
        .get_table_columns(&connection_id, &schema, &table)
        .await
}

#[tauri::command]
async fn get_table_data(
    state: State<'_, DbState>,
    connection_id: String,
    schema: String,
    table: String,
    limit: i64,
    offset: i64,
) -> Result<QueryResult, String> {
    state
        .get_table_data(&connection_id, &schema, &table, limit, offset)
        .await
}

#[tauri::command]
async fn execute_query(
    state: State<'_, DbState>,
    connection_id: String,
    query: String,
) -> Result<QueryResult, String> {
    state.execute_query(&connection_id, &query).await
}

#[tauri::command]
async fn get_table_count(
    state: State<'_, DbState>,
    connection_id: String,
    schema: String,
    table: String,
) -> Result<i64, String> {
    state
        .get_table_count(&connection_id, &schema, &table)
        .await
}

#[tauri::command]
async fn get_saved_connections(app_handle: AppHandle) -> Result<SavedConnections, String> {
    storage::load_connections(&app_handle)
}

#[tauri::command]
async fn save_connection(app_handle: AppHandle, connection: SavedConnection) -> Result<(), String> {
    storage::add_connection(&app_handle, connection)
}

#[tauri::command]
async fn delete_saved_connection(app_handle: AppHandle, id: String) -> Result<(), String> {
    storage::remove_connection(&app_handle, &id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_state: DbState = Arc::new(ConnectionManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            connect,
            disconnect,
            test_connection,
            list_tables,
            get_table_columns,
            get_table_data,
            execute_query,
            get_table_count,
            get_saved_connections,
            save_connection,
            delete_saved_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
