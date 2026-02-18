use keyring::Entry;

const KEYCHAIN_SERVICE: &str = "dev.querystudio.connection-credentials";

fn validate_secret_kind(kind: &str) -> Result<(), String> {
    if kind.is_empty() {
        return Err("secret kind cannot be empty".to_string());
    }

    if kind
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        Ok(())
    } else {
        Err("secret kind may only contain letters, numbers, '-' and '_'".to_string())
    }
}

fn account_name(connection_id: &str, kind: &str) -> Result<String, String> {
    if connection_id.trim().is_empty() {
        return Err("connection id cannot be empty".to_string());
    }

    validate_secret_kind(kind)?;
    Ok(format!("{connection_id}:{kind}"))
}

#[cfg(target_os = "macos")]
fn keychain_entry(account: &str) -> Result<Entry, String> {
    Entry::new(KEYCHAIN_SERVICE, account)
        .map_err(|error| format!("failed to init keychain entry: {error}"))
}

#[tauri::command]
pub fn keychain_set_connection_secret(
    connection_id: String,
    kind: String,
    secret: String,
) -> Result<(), String> {
    if secret.is_empty() {
        return Err("secret cannot be empty".to_string());
    }

    let account = account_name(&connection_id, &kind)?;

    #[cfg(target_os = "macos")]
    {
        let entry = keychain_entry(&account)?;
        entry
            .set_password(&secret)
            .map_err(|error| format!("failed to write keychain secret: {error}"))?;
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("keychain credentials are only supported on macOS".to_string())
    }
}

#[tauri::command]
pub fn keychain_get_connection_secret(
    connection_id: String,
    kind: String,
) -> Result<Option<String>, String> {
    let account = account_name(&connection_id, &kind)?;

    #[cfg(target_os = "macos")]
    {
        let entry = keychain_entry(&account)?;
        match entry.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(format!("failed to read keychain secret: {error}")),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("keychain credentials are only supported on macOS".to_string())
    }
}

#[tauri::command]
pub fn keychain_delete_connection_secret(
    connection_id: String,
    kind: String,
) -> Result<(), String> {
    let account = account_name(&connection_id, &kind)?;

    #[cfg(target_os = "macos")]
    {
        let entry = keychain_entry(&account)?;
        match entry.delete_credential() {
            Ok(_) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(format!("failed to delete keychain secret: {error}")),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("keychain credentials are only supported on macOS".to_string())
    }
}
