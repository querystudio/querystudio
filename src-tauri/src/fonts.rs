use serde_json::Value;
use std::collections::BTreeSet;
use std::process::Command;

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

#[tauri::command]
pub fn list_local_fonts() -> Result<Vec<String>, String> {
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
