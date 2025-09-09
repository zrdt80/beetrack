"""add log level column

Revision ID: 20250815_02_add_log_level
Revises: add_indexes_20250815
Create Date: 2025-08-15
"""
from alembic import op
import sqlalchemy as sa

revision = '20250815_02_add_log_level'
down_revision = '20250815_01_add_indexes'
branch_labels = None
depends_on = None

LEVEL_MAP = [
    ('error', ['failed', 'error']),
    ('success', ['successful', 'created', 'updated']),
    ('warning', ['warning', 'skipped'])
]

def upgrade():
    conn = op.get_bind()
    
    result = conn.execute(sa.text("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'logs' AND column_name = 'level'
    """))
    
    column_exists = result.fetchone() is not None
    
    if not column_exists:
        op.add_column('logs', sa.Column('level', sa.String(length=20), nullable=False, server_default='info'))
        
        for level, patterns in LEVEL_MAP:
            for p in patterns:
                conn.execute(sa.text("UPDATE logs SET level=:level WHERE lower(event) LIKE :pattern"), {'level': level, 'pattern': f'%{p}%'})

        op.alter_column('logs', 'level', server_default=None)
    
    index_result = conn.execute(sa.text("""
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'logs' AND indexname = 'ix_logs_level'
    """))
    
    index_exists = index_result.fetchone() is not None
    
    if not index_exists:
        op.create_index('ix_logs_level', 'logs', ['level'])


def downgrade():
    op.drop_index('ix_logs_level', table_name='logs')
    op.drop_column('logs', 'level')
