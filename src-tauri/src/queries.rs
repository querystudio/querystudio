pub const LIST_TABLES: &str = r#"
SELECT 
    t.table_schema as schema,
    t.table_name as name,
    COALESCE(s.n_live_tup, 0)::bigint as row_count
FROM information_schema.tables t
LEFT JOIN pg_stat_user_tables s 
    ON s.schemaname = t.table_schema 
    AND s.relname = t.table_name
WHERE t.table_type = 'BASE TABLE'
    AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY t.table_schema, t.table_name
"#;

pub const GET_TABLE_COLUMNS: &str = r#"
SELECT 
    c.column_name as name,
    c.data_type,
    c.is_nullable = 'YES' as is_nullable,
    COALESCE(pk.is_primary_key, false) as is_primary_key,
    c.column_default IS NOT NULL as has_default
FROM information_schema.columns c
LEFT JOIN (
    SELECT kcu.column_name, true as is_primary_key
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = $1
        AND tc.table_name = $2
) pk ON c.column_name = pk.column_name
WHERE c.table_schema = $1 AND c.table_name = $2
ORDER BY c.ordinal_position
"#;

pub fn select_table_data(schema: &str, table: &str, limit: i64, offset: i64) -> String {
    format!(
        "SELECT * FROM \"{}\".\"{}\" LIMIT {} OFFSET {}",
        schema, table, limit, offset
    )
}

pub fn count_table_rows(schema: &str, table: &str) -> String {
    format!("SELECT COUNT(*) as count FROM \"{}\".\"{}\"", schema, table)
}
