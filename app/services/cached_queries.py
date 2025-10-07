from typing import Optional, List
from sqlalchemy.orm import Session
from app import models
from app.services.cache import cache_service
import json


async def get_user_by_id_cached(db: Session, user_id: int) -> Optional[dict]:
    cache_key = cache_service.generate_key("user", user_id)

    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except json.JSONDecodeError:
            pass

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None

    user_dict = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "is_active": user.is_active,
        "two_factor_enabled": user.two_factor_enabled,
        "avatar_url": user.avatar_url,
        "theme": user.theme,
        "timezone": user.timezone,
        "locale": user.locale,
    }

    await cache_service.set(cache_key, json.dumps(user_dict), ttl=600)

    return user_dict


async def get_user_permissions_cached(db: Session, user_id: int) -> List[str]:
    cache_key = cache_service.generate_key("user_perms", user_id)

    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except json.JSONDecodeError:
            pass

    from sqlalchemy.orm import joinedload

    assignments = (
        db.query(models.UserRoleAssignment)
        .options(
            joinedload(models.UserRoleAssignment.role).joinedload(
                models.Role.permissions
            )
        )
        .filter(
            models.UserRoleAssignment.user_id == user_id,
            models.UserRoleAssignment.is_active == True,
        )
        .all()
    )

    permissions = set()
    for assignment in assignments:
        if assignment.role and assignment.role.permissions:
            for perm in assignment.role.permissions:
                permissions.add(perm.name)

    permissions_list = list(permissions)

    await cache_service.set(cache_key, json.dumps(permissions_list), ttl=300)

    return permissions_list


async def get_apiary_members_cached(db: Session, apiary_id: int) -> List[dict]:
    cache_key = cache_service.generate_key("apiary_members", apiary_id)

    cached = await cache_service.get(cache_key)
    if cached:
        try:
            return json.loads(cached)
        except json.JSONDecodeError:
            pass

    members = (
        db.query(models.ApiaryMember, models.User.username)
        .join(models.User, models.User.id == models.ApiaryMember.user_id)
        .filter(
            models.ApiaryMember.apiary_id == apiary_id,
            models.ApiaryMember.is_active == True,
        )
        .all()
    )

    members_list = []
    for member, username in members:
        members_list.append(
            {
                "id": member.id,
                "user_id": member.user_id,
                "username": username,
                "role": (
                    member.role.value if hasattr(member.role, "value") else member.role
                ),
                "joined_at": member.joined_at.isoformat() if member.joined_at else None,
            }
        )

    await cache_service.set(cache_key, json.dumps(members_list), ttl=300)

    return members_list


async def invalidate_user_cache(user_id: int):
    from app.services.cache import invalidate_cache

    await invalidate_cache("user", user_id)
    await invalidate_cache("user_perms", user_id)


async def invalidate_apiary_cache(apiary_id: int):
    from app.services.cache import invalidate_cache

    await invalidate_cache("apiary_members", apiary_id)
