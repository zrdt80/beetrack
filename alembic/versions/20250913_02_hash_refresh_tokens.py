"""Hash existing refresh tokens and add hashed_refresh_token column

Revision ID: 20250913_02_hash_refresh_tokens
Revises: 20250913_01_add_audit_events
Create Date: 2025-09-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session
from passlib.context import CryptContext

revision = '20250913_02_hash_refresh_tokens'
down_revision = '20250913_01_add_audit_events'
branch_labels = None
depends_on = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def upgrade() -> None:
    op.add_column('user_sessions', sa.Column('hashed_refresh_token', sa.String(length=256), nullable=True))

    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        for row in session.execute(sa.text("SELECT id, refresh_token FROM user_sessions")):
            if row.refresh_token:
                hashed = pwd_context.hash(row.refresh_token)
                session.execute(sa.text("UPDATE user_sessions SET hashed_refresh_token=:h WHERE id=:i"), {"h": hashed, "i": row.id})
        session.commit()
    except Exception:
        session.rollback()
        raise


def downgrade() -> None:
    op.drop_column('user_sessions', 'hashed_refresh_token')