"""partial unique index pending role change requests

Revision ID: rcr_20250818_02
Revises: rcr_20250818_01
Create Date: 2025-08-18
"""
from alembic import op
import sqlalchemy as sa

revision = 'rcr_20250818_02'
down_revision = 'rcr_20250818_01'
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.create_index(
            'uq_role_change_requests_user_pending',
            'role_change_requests',
            ['user_id'],
            unique=True,
            postgresql_where=sa.text("status = 'pending'"),
        )
    except Exception:
        pass


def downgrade():
    try:
        op.drop_index('uq_role_change_requests_user_pending', table_name='role_change_requests')
    except Exception:
        pass
