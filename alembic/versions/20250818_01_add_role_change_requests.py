"""add role change requests table

Revision ID: rcr_20250818_01
Revises: 20250815_02_add_log_level
Create Date: 2025-08-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'rcr_20250818_01'
down_revision: Union[str, None] = '20250815_02_add_log_level'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    userrole_enum = postgresql.ENUM('admin', 'worker', 'user', name='userrole', create_type=False)
    status_enum = sa.Enum('pending', 'approved', 'rejected', 'canceled', name='rolerequeststatus')

    op.create_table(
        'role_change_requests',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('from_role', userrole_enum, nullable=False),
        sa.Column('to_role', userrole_enum, nullable=False),
        sa.Column('status', status_enum, nullable=False, server_default='pending'),
        sa.Column('reason', sa.String(length=500), nullable=True),
        sa.Column('admin_comment', sa.String(length=500), nullable=True),
        sa.Column('decided_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('decided_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['decided_by'], ['users.id']),
    )
    op.create_index('ix_role_change_requests_user_id', 'role_change_requests', ['user_id'], unique=False)
    op.create_index('ix_role_change_requests_status', 'role_change_requests', ['status'], unique=False)
    op.create_index('ix_role_change_requests_decided_by', 'role_change_requests', ['decided_by'], unique=False)


def downgrade() -> None:
    try:
        op.drop_index('ix_role_change_requests_decided_by', table_name='role_change_requests')
    except Exception:
        pass
    try:
        op.drop_index('ix_role_change_requests_status', table_name='role_change_requests')
    except Exception:
        pass
    try:
        op.drop_index('ix_role_change_requests_user_id', table_name='role_change_requests')
    except Exception:
        pass
    op.drop_table('role_change_requests')
