"""
Add composite indexes on audit_events for performance

Revision ID: 20250924_01_audit_events_idx
Revises: 20250917_01_add_rbac
Create Date: 2025-09-24
"""

from alembic import op
import sqlalchemy as sa


revision = '20250924_01_audit_events_idx'
down_revision = '20250917_01_add_rbac'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        "ix_audit_events_event_code_created_at",
        "audit_events",
        ["event_code", "created_at"],
    )
    op.create_index(
        "ix_audit_events_actor_user_id_created_at",
        "audit_events",
        ["actor_user_id", "created_at"],
    )
    op.create_index(
        "ix_audit_events_user_id_created_at",
        "audit_events",
        ["user_id", "created_at"],
    )


def downgrade():
    op.drop_index("ix_audit_events_user_id_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_actor_user_id_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_event_code_created_at", table_name="audit_events")
