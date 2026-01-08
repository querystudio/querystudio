mod database;
mod license;
mod queries;
mod storage;

use database::{ColumnInfo, ConnectionConfig, ConnectionManager, QueryResult, TableInfo};
use license::{
    ActivateLicenseResponse, DeactivateLicenseResponse, LicenseManager, LicenseState,
    StoredLicense, ValidateLicenseResponse,
};
use storage::{SavedConnection, SavedConnections};
use std::sync::Arc;
use tauri::{
    AppHandle, State,
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};

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

// ============================================================================
// License Commands
// ============================================================================

#[tauri::command]
async fn get_license_status(
    app_handle: AppHandle,
    state: State<'_, LicenseState>,
) -> Result<Option<StoredLicense>, String> {
    // First check in-memory state
    if let Some(license) = state.get_license() {
        return Ok(Some(license));
    }
    
    // Try to load from disk
    if let Ok(Some(license)) = storage::load_license(&app_handle) {
        state.set_license(license.clone());
        return Ok(Some(license));
    }
    
    Ok(None)
}

#[tauri::command]
async fn validate_license(
    state: State<'_, LicenseState>,
    license_key: String,
) -> Result<ValidateLicenseResponse, String> {
    state.validate_license(&license_key).await
}

#[tauri::command]
async fn activate_license(
    app_handle: AppHandle,
    state: State<'_, LicenseState>,
    license_key: String,
) -> Result<ActivateLicenseResponse, String> {
    let result = state.activate_license(&license_key, None).await?;
    
    // Persist to disk if successful
    if result.success {
        if let Some(license) = state.get_license() {
            storage::save_license(&app_handle, &license)?;
        }
    }
    
    Ok(result)
}

#[tauri::command]
async fn deactivate_license(
    app_handle: AppHandle,
    state: State<'_, LicenseState>,
) -> Result<DeactivateLicenseResponse, String> {
    let result = state.deactivate_license().await?;
    
    // Remove from disk if successful
    if result.success {
        storage::remove_license(&app_handle)?;
    }
    
    Ok(result)
}

#[tauri::command]
async fn revalidate_license(
    app_handle: AppHandle,
    state: State<'_, LicenseState>,
) -> Result<bool, String> {
    let is_valid = state.revalidate_license().await?;
    
    if is_valid {
        // Update stored license with new validation time
        if let Some(license) = state.get_license() {
            storage::save_license(&app_handle, &license)?;
        }
    } else {
        // License is no longer valid, remove from disk
        storage::remove_license(&app_handle)?;
    }
    
    Ok(is_valid)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_state: DbState = Arc::new(ConnectionManager::new());
    let license_state: LicenseState = Arc::new(LicenseManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_state)
        .manage(license_state)
        .setup(|app| {
            // Create the menu
            let app_menu = Submenu::with_items(
                app,
                "QueryStudio",
                true,
                &[
                    &PredefinedMenuItem::about(app, Some("About QueryStudio"), None)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "settings", "Settings...", true, Some("CmdOrCtrl+,"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::services(app, Some("Services"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::hide(app, Some("Hide QueryStudio"))?,
                    &PredefinedMenuItem::hide_others(app, Some("Hide Others"))?,
                    &PredefinedMenuItem::show_all(app, Some("Show All"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::quit(app, Some("Quit QueryStudio"))?,
                ],
            )?;

            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &MenuItem::with_id(app, "new_connection", "New Connection", true, Some("CmdOrCtrl+N"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "disconnect", "Disconnect", true, Some("CmdOrCtrl+W"))?,
                ],
            )?;

            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::undo(app, Some("Undo"))?,
                    &PredefinedMenuItem::redo(app, Some("Redo"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, Some("Cut"))?,
                    &PredefinedMenuItem::copy(app, Some("Copy"))?,
                    &PredefinedMenuItem::paste(app, Some("Paste"))?,
                    &PredefinedMenuItem::select_all(app, Some("Select All"))?,
                ],
            )?;

            let view_menu = Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &MenuItem::with_id(app, "view_data", "Table Data", true, Some("CmdOrCtrl+1"))?,
                    &MenuItem::with_id(app, "view_query", "Query Editor", true, Some("CmdOrCtrl+2"))?,
                    &MenuItem::with_id(app, "view_ai", "AI Assistant", true, Some("CmdOrCtrl+3"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "refresh", "Refresh", true, Some("CmdOrCtrl+R"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "command_palette", "Command Palette...", true, Some("CmdOrCtrl+K"))?,
                ],
            )?;

            let window_menu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, Some("Minimize"))?,
                    &PredefinedMenuItem::maximize(app, Some("Zoom"))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::fullscreen(app, Some("Enter Full Screen"))?,
                ],
            )?;

            let help_menu = Submenu::with_items(
                app,
                "Help",
                true,
                &[
                    &MenuItem::with_id(app, "documentation", "Documentation", true, None::<&str>)?,
                ],
            )?;

            let menu = Menu::with_items(
                app,
                &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu, &help_menu],
            )?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(move |app_handle, event| {
                match event.id().as_ref() {
                    "new_connection" => {
                        let _ = app_handle.emit("menu-event", "new_connection");
                    }
                    "disconnect" => {
                        let _ = app_handle.emit("menu-event", "disconnect");
                    }
                    "settings" => {
                        let _ = app_handle.emit("menu-event", "settings");
                    }
                    "view_data" => {
                        let _ = app_handle.emit("menu-event", "view_data");
                    }
                    "view_query" => {
                        let _ = app_handle.emit("menu-event", "view_query");
                    }
                    "view_ai" => {
                        let _ = app_handle.emit("menu-event", "view_ai");
                    }
                    "refresh" => {
                        let _ = app_handle.emit("menu-event", "refresh");
                    }
                    "command_palette" => {
                        let _ = app_handle.emit("menu-event", "command_palette");
                    }
                    "documentation" => {
                        let _ = app_handle.emit("menu-event", "documentation");
                    }
                    _ => {}
                }
            });

            Ok(())
        })
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
            // License commands
            get_license_status,
            validate_license,
            activate_license,
            deactivate_license,
            revalidate_license,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
