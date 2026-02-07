use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{path::BaseDirectory, AppHandle, Manager};

const FONT_CACHE_FILE_NAME: &str = "fonts-cache.json";
const FONT_CACHE_TTL_SECS: u64 = 60 * 60 * 24 * 7;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct FontCache {
    generated_at_unix: u64,
    fonts: Vec<String>,
}

fn normalize_font_name(name: &str) -> Option<String> {
    let normalized = name.split_whitespace().collect::<Vec<_>>().join(" ");
    if normalized.is_empty() || normalized.starts_with('.') {
        None
    } else {
        Some(normalized)
    }
}

#[cfg(target_os = "macos")]
fn list_fonts_macos() -> Result<Vec<String>, String> {
    let output = Command::new("system_profiler")
        .args(["SPFontsDataType", "-json", "-detailLevel", "mini"])
        .output()
        .map_err(|error| format!("failed to run system_profiler: {error}"))?;

    if !output.status.success() {
        return Err("system_profiler returned a non-zero status".to_string());
    }

    let parsed: Value = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("failed to parse system_profiler output: {error}"))?;

    let mut families = BTreeSet::new();
    if let Some(items) = parsed.get("SPFontsDataType").and_then(Value::as_array) {
        for item in items {
            if let Some(typefaces) = item.get("typefaces").and_then(Value::as_array) {
                for typeface in typefaces {
                    if let Some(family) = typeface.get("family").and_then(Value::as_str) {
                        if let Some(normalized) = normalize_font_name(family) {
                            families.insert(normalized);
                        }
                    }

                    if let Some(fullname) = typeface.get("fullname").and_then(Value::as_str) {
                        if let Some(normalized) = normalize_font_name(fullname) {
                            families.insert(normalized);
                        }
                    }
                }
            }
        }
    }

    Ok(families.into_iter().collect())
}

#[cfg(target_os = "linux")]
fn list_fonts_linux() -> Result<Vec<String>, String> {
    let output = Command::new("fc-list")
        .args([":", "family"])
        .output()
        .map_err(|error| format!("failed to run fc-list: {error}"))?;

    if !output.status.success() {
        return Err("fc-list returned a non-zero status".to_string());
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("fc-list returned non-utf8 output: {error}"))?;

    let mut families = BTreeSet::new();
    for line in stdout.lines() {
        for family in line.split(',') {
            if let Some(normalized) = normalize_font_name(family) {
                families.insert(normalized);
            }
        }
    }

    Ok(families.into_iter().collect())
}

#[cfg(target_os = "windows")]
fn list_fonts_windows() -> Result<Vec<String>, String> {
    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts",
        ])
        .output()
        .map_err(|error| format!("failed to run reg query: {error}"))?;

    if !output.status.success() {
        return Err("reg query returned a non-zero status".to_string());
    }

    let stdout = String::from_utf8(output.stdout)
        .map_err(|error| format!("reg query returned non-utf8 output: {error}"))?;

    let mut families = BTreeSet::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("HKEY_") {
            continue;
        }

        // Example:
        // Arial (TrueType)    REG_SZ    arial.ttf
        // We only need the left-side display name.
        let name = trimmed
            .split("REG_")
            .next()
            .map(str::trim)
            .unwrap_or_default();
        let name = name.split(" (").next().map(str::trim).unwrap_or(name);

        if let Some(normalized) = normalize_font_name(name) {
            families.insert(normalized);
        }
    }

    Ok(families.into_iter().collect())
}

#[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
fn list_fonts_unsupported() -> Result<Vec<String>, String> {
    Err("font enumeration is not supported on this platform".to_string())
}

fn current_unix_seconds() -> u64 {
    match SystemTime::now().duration_since(UNIX_EPOCH) {
        Ok(duration) => duration.as_secs(),
        Err(_) => 0,
    }
}

fn cache_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .resolve(FONT_CACHE_FILE_NAME, BaseDirectory::AppConfig)
        .map_err(|error| format!("failed to resolve font cache path: {error}"))
}

async fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "font cache path has no parent directory".to_string())?;
    tokio::fs::create_dir_all(parent)
        .await
        .map_err(|error| format!("failed to create font cache directory: {error}"))
}

async fn read_font_cache(path: &Path) -> Result<Option<FontCache>, String> {
    if !path.exists() {
        return Ok(None);
    }

    let raw = tokio::fs::read_to_string(path)
        .await
        .map_err(|error| format!("failed to read font cache file: {error}"))?;

    match serde_json::from_str::<FontCache>(&raw) {
        Ok(parsed) => Ok(Some(parsed)),
        Err(_) => Ok(None),
    }
}

async fn write_font_cache(path: &Path, fonts: &[String]) -> Result<(), String> {
    ensure_parent_dir(path).await?;
    let payload = FontCache {
        generated_at_unix: current_unix_seconds(),
        fonts: fonts.to_vec(),
    };

    let json = serde_json::to_vec_pretty(&payload)
        .map_err(|error| format!("failed to serialize font cache file: {error}"))?;

    tokio::fs::write(path, json)
        .await
        .map_err(|error| format!("failed to write font cache file: {error}"))
}

fn is_cache_fresh(cache: &FontCache) -> bool {
    let age = current_unix_seconds().saturating_sub(cache.generated_at_unix);
    age <= FONT_CACHE_TTL_SECS
}

fn list_local_fonts_platform() -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    {
        return list_fonts_macos();
    }

    #[cfg(target_os = "linux")]
    {
        return list_fonts_linux();
    }

    #[cfg(target_os = "windows")]
    {
        return list_fonts_windows();
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        list_fonts_unsupported()
    }
}

async fn enumerate_local_fonts() -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(list_local_fonts_platform)
        .await
        .map_err(|error| format!("failed to join font enumeration task: {error}"))?
}

pub async fn warm_font_cache(app: &AppHandle) -> Result<(), String> {
    let path = cache_path(app)?;
    if let Some(cache) = read_font_cache(&path).await? {
        if is_cache_fresh(&cache) && !cache.fonts.is_empty() {
            return Ok(());
        }
    }

    let fonts = enumerate_local_fonts().await?;
    if fonts.is_empty() {
        return Ok(());
    }

    write_font_cache(&path, &fonts).await
}

#[tauri::command]
pub async fn list_local_fonts(app: AppHandle) -> Result<Vec<String>, String> {
    let path = cache_path(&app)?;
    let cached = read_font_cache(&path).await?;

    if let Some(cache) = cached.as_ref() {
        if is_cache_fresh(cache) && !cache.fonts.is_empty() {
            return Ok(cache.fonts.clone());
        }
    }

    match enumerate_local_fonts().await {
        Ok(fonts) => {
            if !fonts.is_empty() {
                let _ = write_font_cache(&path, &fonts).await;
            }
            Ok(fonts)
        }
        Err(error) => {
            if let Some(cache) = cached {
                if !cache.fonts.is_empty() {
                    return Ok(cache.fonts);
                }
            }
            Err(error)
        }
    }
}

#[tauri::command]
pub async fn refresh_local_fonts_cache(app: AppHandle) -> Result<Vec<String>, String> {
    let path = cache_path(&app)?;
    let fonts = enumerate_local_fonts().await?;
    if !fonts.is_empty() {
        let _ = write_font_cache(&path, &fonts).await;
    }
    Ok(fonts)
}
