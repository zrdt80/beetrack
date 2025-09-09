"""add indexes for scalability

Revision ID: 20250815_01_add_indexes
Revises: 
Create Date: 2025-08-15
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20250815_01_add_indexes'
down_revision: Union[str, None] = 'f0b4babf601a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    
    result = conn.execute(sa.text("""
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'inspections' AND indexname = 'ix_inspections_hive_id'
    """))
    if not result.fetchone():
        op.create_index('ix_inspections_hive_id', 'inspections', ['hive_id'], unique=False)
    
    result = conn.execute(sa.text("""
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'orders' AND indexname = 'ix_orders_user_id_date'
    """))
    if not result.fetchone():
        op.create_index('ix_orders_user_id_date', 'orders', ['user_id', 'date'], unique=False)
    
    result = conn.execute(sa.text("""
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'logs' AND indexname = 'ix_logs_timestamp'
    """))
    if not result.fetchone():
        op.create_index('ix_logs_timestamp', 'logs', ['timestamp'], unique=False)


def downgrade() -> None:
    try:
        op.drop_index('ix_logs_timestamp', table_name='logs')
    except Exception:
        pass
    try:
        op.drop_index('ix_orders_user_id_date', table_name='orders')
    except Exception:
        pass
    try:
        op.drop_index('ix_inspections_hive_id', table_name='inspections')
    except Exception:
        pass
