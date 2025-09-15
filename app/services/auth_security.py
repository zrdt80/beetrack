import time
import hashlib
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from app.config import settings
from app.utils.logger import log_event, record_audit_event


class AuthFailureTracker:    
    def __init__(self):
        self._failures: Dict[str, Dict] = {}
        self._locked_accounts: Dict[str, datetime] = {}
        self._suspicious_ips: Dict[str, Dict] = {}
    
    def _get_key(self, identifier: str, ip: str) -> str:
        return hashlib.md5(f"{identifier}:{ip}".encode()).hexdigest()
    
    def record_failure(self, email: str, ip: str, user_agent: str = None) -> Dict:
        key = self._get_key(email, ip)
        now = datetime.now()
        
        if key not in self._failures:
            self._failures[key] = {
                'email': email,
                'ip': ip,
                'attempts': 0,
                'first_attempt': now,
                'last_attempt': now,
                'penalty_until': None,
                'escalation_level': 0
            }
        
        record = self._failures[key]
        record['attempts'] += 1
        record['last_attempt'] = now
        
        penalty_info = self._calculate_penalty(record)
        record.update(penalty_info)
        
        self._track_ip_activity(ip, email)
        
        log_event(f"Auth failure #{record['attempts']} for {email} from {ip}", level="WARNING")
        
        record_audit_event(
            "LOGIN_FAILURE_TRACKED",
            metadata={
                "email": email,
                "ip_address": ip,
                "attempts": record['attempts'],
                "penalty_seconds": penalty_info.get('penalty_seconds', 0),
                "escalation_level": record['escalation_level'],
                "user_agent": user_agent
            },
            ip=ip,
            user_agent=user_agent
        )
        
        return {
            'attempts': record['attempts'],
            'penalty_until': record['penalty_until'],
            'penalty_seconds': penalty_info.get('penalty_seconds', 0),
            'is_locked': penalty_info.get('penalty_seconds', 0) > 0,
            'escalation_level': record['escalation_level']
        }
    
    def _calculate_penalty(self, record: Dict) -> Dict:
        attempts = record['attempts']
        
        if attempts <= 2:
            return {'penalty_seconds': 0, 'penalty_until': None}
        
        elif attempts <= 5:
            penalty_seconds = 2 ** (attempts - 2)
            record['escalation_level'] = 1
            
        elif attempts <= 10:
            penalty_seconds = 60 * (2 ** (attempts - 6))
            record['escalation_level'] = 2
            
        else:
            penalty_seconds = settings.lockout_duration_minutes * 60
            record['escalation_level'] = 3
        
        penalty_until = datetime.now() + timedelta(seconds=penalty_seconds)
        
        return {
            'penalty_seconds': penalty_seconds,
            'penalty_until': penalty_until
        }
    
    def _track_ip_activity(self, ip: str, email: str):
        if ip not in self._suspicious_ips:
            self._suspicious_ips[ip] = {
                'failed_emails': set(),
                'total_attempts': 0,
                'first_attempt': datetime.now(),
                'last_attempt': datetime.now()
            }
        
        ip_record = self._suspicious_ips[ip]
        ip_record['failed_emails'].add(email)
        ip_record['total_attempts'] += 1
        ip_record['last_attempt'] = datetime.now()
        
        if len(ip_record['failed_emails']) >= 5 or ip_record['total_attempts'] >= 20:
            log_event(f"Suspicious activity from IP {ip}: {len(ip_record['failed_emails'])} emails, {ip_record['total_attempts']} attempts", level="ERROR")
            
            record_audit_event(
                "SUSPICIOUS_AUTH_PATTERN",
                metadata={
                    "ip_address": ip,
                    "unique_emails": len(ip_record['failed_emails']),
                    "total_attempts": ip_record['total_attempts'],
                    "pattern": "credential_stuffing_suspected"
                },
                ip=ip
            )
    
    def is_locked(self, email: str, ip: str) -> Tuple[bool, Optional[Dict]]:
        key = self._get_key(email, ip)
        
        if key not in self._failures:
            return False, None
        
        record = self._failures[key]
        
        if not record.get('penalty_until'):
            return False, None
        
        if datetime.now() < record['penalty_until']:
            remaining_seconds = int((record['penalty_until'] - datetime.now()).total_seconds())
            
            return True, {
                'locked': True,
                'remaining_seconds': remaining_seconds,
                'attempts': record['attempts'],
                'escalation_level': record['escalation_level'],
                'penalty_until': record['penalty_until']
            }
        
        self._reset_or_reduce_failures(key)
        return False, None
    
    def _reset_or_reduce_failures(self, key: str):
        if key in self._failures:
            record = self._failures[key]
            
            record['attempts'] = max(0, record['attempts'] // 2)
            record['penalty_until'] = None
            
            if record['attempts'] <= 2:
                record['escalation_level'] = 0
    
    def record_success(self, email: str, ip: str):
        key = self._get_key(email, ip)
        
        if key in self._failures:
            attempts = self._failures[key]['attempts']
            del self._failures[key]
            
            log_event(f"Auth success for {email} from {ip} - cleared {attempts} previous failures")
            
            record_audit_event(
                "LOGIN_SUCCESS_AFTER_FAILURES",
                metadata={
                    "email": email,
                    "ip_address": ip,
                    "cleared_attempts": attempts
                },
                ip=ip
            )
    
    def get_failure_stats(self, email: str = None, ip: str = None) -> Dict:
        stats = {
            'total_tracked_combinations': len(self._failures),
            'currently_locked': 0,
            'high_escalation_count': 0,
            'suspicious_ips': len(self._suspicious_ips)
        }
        
        for record in self._failures.values():
            if record.get('penalty_until') and datetime.now() < record['penalty_until']:
                stats['currently_locked'] += 1
            
            if record.get('escalation_level', 0) >= 2:
                stats['high_escalation_count'] += 1
        
        if email and ip:
            key = self._get_key(email, ip)
            if key in self._failures:
                stats['specific_record'] = self._failures[key]
        
        return stats
    
    def cleanup_expired(self):
        now = datetime.now()
        expired_keys = []
        
        for key, record in self._failures.items():
            if (now - record['last_attempt']).total_seconds() > 86400:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self._failures[key]
        
        expired_ips = []
        for ip, record in self._suspicious_ips.items():
            if (now - record['last_attempt']).total_seconds() > 86400:
                expired_ips.append(ip)
        
        for ip in expired_ips:
            del self._suspicious_ips[ip]


auth_failure_tracker = AuthFailureTracker()