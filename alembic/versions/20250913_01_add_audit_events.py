"""Add audit_events table

Revision ID: 20250913_01_add_audit_events
Revises: 20250911_01_idx_and_cnstrnt
Create Date: 2025-09-13
"""
from alembic import op
import sqlalchemy as sa

revision = '20250913_01_add_audit_events'
down_revision = '20250911_01_idx_and_cnstrnt'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'audit_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('session_id', sa.Integer(), nullable=True),
        sa.Column('event_code', sa.String(length=64), nullable=False),
        sa.Column('severity', sa.String(length=16), nullable=False, server_default='info'),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('user_agent', sa.String(length=256), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
    )
    op.create_index('ix_audit_events_created_at', 'audit_events', ['created_at'])
    op.create_index('ix_audit_events_event_code', 'audit_events', ['event_code'])
    op.create_index('ix_audit_events_user_id', 'audit_events', ['user_id'])
    op.create_index('ix_audit_events_actor_user_id', 'audit_events', ['actor_user_id'])
    op.create_index('ix_audit_events_session_id', 'audit_events', ['session_id'])
    op.create_index('ix_audit_events_severity', 'audit_events', ['severity'])


def downgrade() -> None:
    op.drop_index('ix_audit_events_severity', table_name='audit_events')
    op.drop_index('ix_audit_events_session_id', table_name='audit_events')
    op.drop_index('ix_audit_events_actor_user_id', table_name='audit_events')
    op.drop_index('ix_audit_events_user_id', table_name='audit_events')
    op.drop_index('ix_audit_events_event_code', table_name='audit_events')
    op.drop_index('ix_audit_events_created_at', table_name='audit_events')
    op.drop_table('audit_events')
