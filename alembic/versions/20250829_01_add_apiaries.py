"""add apiaries and related tables

Revision ID: 20250829_01_add_apiaries
Revises: 20250825_01_avatar_and_pref
Create Date: 2025-08-29
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20250829_01_add_apiaries'
down_revision = '20250825_01_avatar_and_pref'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'apiaryrole') THEN
                CREATE TYPE apiaryrole AS ENUM ('owner', 'manager', 'worker');
            END IF;
        END$$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitationstatus') THEN
                CREATE TYPE invitationstatus AS ENUM ('pending', 'accepted', 'declined', 'canceled');
            END IF;
        END$$;
        """
    )


    op.create_table(
        'apiaries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('location', sa.String(length=200), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id']),
    )
    op.create_index('ix_apiaries_owner_id', 'apiaries', ['owner_id'], unique=False)
    op.create_index('uq_apiaries_owner_name', 'apiaries', ['owner_id', 'name'], unique=True)

    op.execute(
        """
        CREATE TABLE apiary_members (
            id INTEGER PRIMARY KEY,
            apiary_id INTEGER NOT NULL REFERENCES apiaries(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            role apiaryrole NOT NULL DEFAULT 'worker',
            joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE
        );
        """
    )
    op.create_index('ix_apiary_members_apiary_id', 'apiary_members', ['apiary_id'], unique=False)
    op.create_index('ix_apiary_members_user_id', 'apiary_members', ['user_id'], unique=False)
    op.create_index('uq_apiary_member_unique', 'apiary_members', ['apiary_id', 'user_id'], unique=True)

    op.execute(
        """
        CREATE TABLE apiary_invitations (
            id INTEGER PRIMARY KEY,
            apiary_id INTEGER NOT NULL REFERENCES apiaries(id),
            inviter_id INTEGER NOT NULL REFERENCES users(id),
            invitee_email VARCHAR(120) NOT NULL,
            role apiaryrole NOT NULL DEFAULT 'worker',
            status invitationstatus NOT NULL DEFAULT 'pending',
            token VARCHAR(64) NOT NULL,
            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
            decided_at TIMESTAMP WITHOUT TIME ZONE NULL
        );
        """
    )
    op.create_index('ix_apiary_invitations_apiary_id', 'apiary_invitations', ['apiary_id'], unique=False)
    op.create_index('ix_apiary_invitations_status', 'apiary_invitations', ['status'], unique=False)
    op.create_index('uq_apiary_invitations_token', 'apiary_invitations', ['token'], unique=True)


def downgrade() -> None:
    try:
        op.drop_index('uq_apiary_invitations_token', table_name='apiary_invitations')
        op.drop_index('ix_apiary_invitations_status', table_name='apiary_invitations')
        op.drop_index('ix_apiary_invitations_apiary_id', table_name='apiary_invitations')
        op.drop_table('apiary_invitations')
    except Exception:
        pass

    try:
        op.drop_index('uq_apiary_member_unique', table_name='apiary_members')
        op.drop_index('ix_apiary_members_user_id', table_name='apiary_members')
        op.drop_index('ix_apiary_members_apiary_id', table_name='apiary_members')
        op.drop_table('apiary_members')
    except Exception:
        pass

    try:
        op.drop_index('uq_apiaries_owner_name', table_name='apiaries')
        op.drop_index('ix_apiaries_owner_id', table_name='apiaries')
        op.drop_table('apiaries')
    except Exception:
        pass

    try:
        sa.Enum(name='invitationstatus').drop(op.get_bind(), checkfirst=True)
    except Exception:
        pass
    try:
        sa.Enum(name='apiaryrole').drop(op.get_bind(), checkfirst=True)
    except Exception:
        pass
