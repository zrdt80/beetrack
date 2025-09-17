"""Add RBAC tables and permissions

Revision ID: 20250917_01_add_rbac
Revises: 20250913_02_hash_refresh_tokens
Create Date: 2025-09-17 17:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime, timezone


revision = '20250917_01_add_rbac'
down_revision = '20250913_02_hash_refresh_tokens'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    op.create_table('permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('category', sa.String(length=64), nullable=True),
        sa.Column('is_system', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_permissions_category'), 'permissions', ['category'], unique=False)
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)
    op.create_index(op.f('ix_permissions_name'), 'permissions', ['name'], unique=True)

    op.create_table('role_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.Column('granted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permission')
    )
    op.create_index(op.f('ix_role_permissions_id'), 'role_permissions', ['id'], unique=False)
    op.create_index(op.f('ix_role_permissions_permission_id'), 'role_permissions', ['permission_id'], unique=False)
    op.create_index(op.f('ix_role_permissions_role_id'), 'role_permissions', ['role_id'], unique=False)

    op.create_table('user_role_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by', sa.Integer(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'role_id', name='uq_user_role')
    )
    op.create_index(op.f('ix_user_role_assignments_assigned_by'), 'user_role_assignments', ['assigned_by'], unique=False)
    op.create_index(op.f('ix_user_role_assignments_id'), 'user_role_assignments', ['id'], unique=False)
    op.create_index(op.f('ix_user_role_assignments_is_active'), 'user_role_assignments', ['is_active'], unique=False)
    op.create_index(op.f('ix_user_role_assignments_role_id'), 'user_role_assignments', ['role_id'], unique=False)
    op.create_index(op.f('ix_user_role_assignments_user_id'), 'user_role_assignments', ['user_id'], unique=False)

    roles_table = sa.table('roles',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('is_system', sa.Boolean),
        sa.column('created_at', sa.DateTime)
    )

    permissions_table = sa.table('permissions',
        sa.column('id', sa.Integer),
        sa.column('name', sa.String),
        sa.column('description', sa.String),
        sa.column('category', sa.String),
        sa.column('is_system', sa.Boolean),
        sa.column('created_at', sa.DateTime)
    )

    role_permissions_table = sa.table('role_permissions',
        sa.column('role_id', sa.Integer),
        sa.column('permission_id', sa.Integer),
        sa.column('granted_at', sa.DateTime)
    )

    user_role_assignments_table = sa.table('user_role_assignments',
        sa.column('user_id', sa.Integer),
        sa.column('role_id', sa.Integer),
        sa.column('assigned_at', sa.DateTime),
        sa.column('is_active', sa.Boolean)
    )

    now = datetime.now(timezone.utc)

    op.bulk_insert(roles_table, [
        {'id': 1, 'name': 'admin', 'description': 'Administrator with most privileges', 'is_system': True, 'created_at': now},
        {'id': 2, 'name': 'worker', 'description': 'Worker with operational access', 'is_system': True, 'created_at': now},
        {'id': 3, 'name': 'user', 'description': 'Basic user access', 'is_system': True, 'created_at': now},
    ])

    permissions = [
        {'id': 1, 'name': 'admin.view_overview', 'description': 'View admin overview dashboard', 'category': 'admin', 'is_system': True, 'created_at': now},
        {'id': 2, 'name': 'admin.view_audit', 'description': 'View audit logs', 'category': 'admin', 'is_system': True, 'created_at': now},
        {'id': 3, 'name': 'admin.view_sessions', 'description': 'View user sessions', 'category': 'admin', 'is_system': True, 'created_at': now},
        {'id': 4, 'name': 'admin.manage_sessions', 'description': 'Manage user sessions', 'category': 'admin', 'is_system': True, 'created_at': now},
        {'id': 5, 'name': 'admin.manage_roles', 'description': 'Manage user roles', 'category': 'admin', 'is_system': True, 'created_at': now},
        {'id': 6, 'name': 'admin.manage_permissions', 'description': 'Manage permissions and roles', 'category': 'admin', 'is_system': True, 'created_at': now},
        {'id': 7, 'name': 'users.view', 'description': 'View user profiles', 'category': 'user', 'is_system': True, 'created_at': now},
        {'id': 8, 'name': 'users.manage', 'description': 'Create and manage users', 'category': 'user', 'is_system': True, 'created_at': now},
        {'id': 9, 'name': 'apiaries.view', 'description': 'View apiaries', 'category': 'apiary', 'is_system': True, 'created_at': now},
        {'id': 10, 'name': 'apiaries.create', 'description': 'Create apiaries', 'category': 'apiary', 'is_system': True, 'created_at': now},
        {'id': 11, 'name': 'apiaries.manage', 'description': 'Manage apiaries', 'category': 'apiary', 'is_system': True, 'created_at': now},
        {'id': 12, 'name': 'hives.view', 'description': 'View hives', 'category': 'hive', 'is_system': True, 'created_at': now},
        {'id': 13, 'name': 'hives.create', 'description': 'Create hives', 'category': 'hive', 'is_system': True, 'created_at': now},
        {'id': 14, 'name': 'hives.manage', 'description': 'Manage hives', 'category': 'hive', 'is_system': True, 'created_at': now},
        {'id': 15, 'name': 'inspections.view', 'description': 'View inspections', 'category': 'inspection', 'is_system': True, 'created_at': now},
        {'id': 16, 'name': 'inspections.create', 'description': 'Create inspections', 'category': 'inspection', 'is_system': True, 'created_at': now},
        {'id': 17, 'name': 'inspections.manage', 'description': 'Manage inspections', 'category': 'inspection', 'is_system': True, 'created_at': now},
        {'id': 18, 'name': 'orders.view', 'description': 'View orders', 'category': 'order', 'is_system': True, 'created_at': now},
        {'id': 19, 'name': 'orders.create', 'description': 'Create orders', 'category': 'order', 'is_system': True, 'created_at': now},
        {'id': 20, 'name': 'orders.manage', 'description': 'Manage orders', 'category': 'order', 'is_system': True, 'created_at': now},
    ]
    op.bulk_insert(permissions_table, permissions)

    role_permission_assignments = [
        *[{'role_id': 1, 'permission_id': i, 'granted_at': now} for i in range(1, 21)],
        *[{'role_id': 2, 'permission_id': i, 'granted_at': now} for i in [9, 12, 13, 15, 16, 18, 19]],
        *[{'role_id': 3, 'permission_id': i, 'granted_at': now} for i in [9, 12, 15, 18]],
    ]
    op.bulk_insert(role_permissions_table, role_permission_assignments)

    connection = op.get_bind()
    result = connection.execute(sa.text("SELECT id, role FROM users"))
    users = result.fetchall()
    
    user_assignments = []
    for user_id, user_role in users:
        if user_role == 'admin':
            role_id = 1
        elif user_role == 'worker':
            role_id = 2
        else:
            role_id = 3
            
        user_assignments.append({
            'user_id': user_id,
            'role_id': role_id,
            'assigned_at': now,
            'is_active': True
        })
    
    if user_assignments:
        op.bulk_insert(user_role_assignments_table, user_assignments)


def downgrade():
    op.drop_table('user_role_assignments')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')