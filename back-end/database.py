import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from config import settings

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor

    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    filename TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0,
    content_type TEXT NOT NULL DEFAULT 'video/mp4',
    storage_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_events (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    position_seconds REAL,
    seconds REAL,
    visitor_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_events_video ON video_events (video_id);
"""


def _adapt(sql: str) -> str:
    """Translate '?' placeholders to '%s' when running on PostgreSQL."""
    return sql.replace("?", "%s") if settings.is_postgres else sql


def _connect():
    if settings.is_postgres:
        if not HAS_PSYCOPG2:
            raise RuntimeError("psycopg2 is required when DATABASE_URL is set.")
        return psycopg2.connect(settings.database_url, cursor_factory=RealDictCursor)
    settings.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_conn():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except BaseException:
        conn.rollback()
        raise
    finally:
        conn.close()


def execute(sql: str, params=None):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(_adapt(sql), params or ())
        return cur.lastrowid


def fetchone(sql: str, params=None):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(_adapt(sql), params or ())
        row = cur.fetchone()
        return dict(row) if row else None


def fetchall(sql: str, params=None):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(_adapt(sql), params or ())
        return [dict(row) for row in cur.fetchall()]


def init_db():
    with get_conn() as conn:
        if settings.is_postgres:
            with conn.cursor() as cur:
                cur.execute(_adapt(SCHEMA))
        else:
            conn.executescript(SCHEMA)
        _migrate(conn)


def _migrate(conn):
    """Apply column additions that cannot live in CREATE TABLE IF NOT EXISTS."""
    if settings.is_postgres:
        with conn.cursor() as cur:
            cur.execute(
                _adapt(
                    "ALTER TABLE videos ADD COLUMN IF NOT EXISTS "
                    "settings TEXT NOT NULL DEFAULT '{}'"
                )
            )
    else:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(videos)")}
        if "settings" not in cols:
            conn.execute(
                "ALTER TABLE videos ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'"
            )


def to_iso(value):
    """Normalize a timestamp from any driver into an ISO 8601 string."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, str):
        return value.replace(" ", "T", 1) + ("Z" if "T" not in value else "")
    return value
