from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

# Provide a single helper to return current India/Kolkata timezone-aware datetime.
# Use stdlib zoneinfo when available, fall back to pytz, otherwise apply a fixed offset.
try:
    from zoneinfo import ZoneInfo
    IST = ZoneInfo("Asia/Kolkata")
    def now_ist():
        return datetime.now(IST)
except Exception:
    try:
        import pytz
        IST = pytz.timezone("Asia/Kolkata")
        def now_ist():
            return datetime.now(IST)
    except Exception:
        def now_ist():
            return datetime.utcnow() + timedelta(hours=5, minutes=30)

db = SQLAlchemy()


class Operator(db.Model):
    __tablename__ = 'operators'
    id = db.Column(db.Integer, primary_key=True)
    operator_id = db.Column(db.String(20), nullable=False, unique=True, index=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False, unique=True, index=True)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False)
    logged_user = db.Column(db.String(100))
    joining_date = db.Column(db.Date, nullable=True)
    skills = db.Column(db.String(500), nullable=True)  # comma-separated
    operation = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=now_ist)

    def to_dict(self):
        return {
            'id': self.id,
            'operator_id': self.operator_id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'joining_date': self.joining_date.isoformat() if self.joining_date else None,
            'skills': self.skills,
            'logged_user': self.logged_user,
            'operation': self.operation,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    permissions = db.Column(db.String(2000), nullable=True)  # JSON string of allowed routes/tabs
    

    def to_dict(self):
        import json
        perms = []
        try:
            if self.permissions:
                perms = json.loads(self.permissions)
        except Exception:
            perms = []
        return {
            'id': self.id,
            'name': self.name,
            'permissions': perms,
        }
class StudentEmployee(db.Model):
    __tablename__ = 'student_employee'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(20), unique=True, nullable=False, index=True)
    full_name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=True)
    user_type = db.Column(db.String(20), nullable=True)
    designation = db.Column(db.String(100), nullable=True)
    user_policy = db.Column(db.String(100), nullable=True)
    password = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    logged_user = db.Column(db.String(100), nullable=True)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add', nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'full_name': self.full_name,
            'department': self.department,
            'user_type': self.user_type,
            'designation': self.designation,
            'user_policy': self.user_policy,
            'email': self.email,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class CompanyDetails(db.Model):
    __tablename__ = 'company_details'
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500))
    contact_no = db.Column(db.String(50))
    email = db.Column(db.String(120))
    web_url = db.Column(db.String(255))
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    logged_user = db.Column(db.String(100))
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'company_name': self.company_name,
            'address': self.address,
            'contact_no': self.contact_no,
            'email': self.email,
            'web_url': self.web_url,
            'city': self.city,
            'state': self.state,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    project_name = db.Column(db.String(200), nullable=False)
    company_id = db.Column(db.Integer, nullable=True)  # optional link to CompanyDetails.id
    assigned_employees = db.Column(db.String(1000), nullable=True)  # comma-separated employee ids
    description = db.Column(db.String(1000), nullable=True)
    logged_user = db.Column(db.String(100), nullable=True)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'project_name': self.project_name,
            'company_id': self.company_id,
            'assigned_employees': self.assigned_employees.split(',') if self.assigned_employees else [],
            'description': self.description,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class WorkType(db.Model):
    __tablename__ = 'work_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'modules': [],
            'modules_raw': None,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }

class Module(db.Model):
    __tablename__ = 'modules'
    id = db.Column(db.Integer, primary_key=True)
    work_type_id = db.Column(db.Integer, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'work_type_id': self.work_type_id,
            'name': self.name,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class WorkEntry(db.Model):
    __tablename__ = 'work_entries'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    work_type = db.Column(db.String(200), nullable=False)
    module = db.Column(db.String(255), nullable=True)
    description = db.Column(db.String(2000), nullable=True)
    skills_learned = db.Column(db.String(1000), nullable=True)
    start_time = db.Column(db.String(20), nullable=True)
    end_time = db.Column(db.String(20), nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)
    project_id = db.Column(db.Integer, nullable=True, index=True)
    logged_user = db.Column(db.String(100), nullable=True, index=True)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'work_type': self.work_type,
            'module': self.module,
            'description': self.description,
            'skills_learned': self.skills_learned,
            'start_time': self.start_time,
            'end_time': self.end_time,
            'duration_minutes': self.duration_minutes,
            'project_id': self.project_id,
            'project_name': None,
            'duration': format_duration(self.duration_minutes) if self.duration_minutes is not None else None,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class Meeting(db.Model):
    __tablename__ = 'meetings'
    id = db.Column(db.Integer, primary_key=True)
    meeting_type = db.Column(db.String(50), nullable=False)  # individual, group, client
    meeting_date = db.Column(db.Date, nullable=False, index=True)
    project_id = db.Column(db.Integer, nullable=True)
    discussion_summary = db.Column(db.String(2000), nullable=False)
    action_points = db.Column(db.String(2000), nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)
    logged_user = db.Column(db.String(100), nullable=True, index=True)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'meeting_type': self.meeting_type,
            'meeting_date': self.meeting_date.isoformat() if self.meeting_date else None,
            'project_id': self.project_id,
            'discussion_summary': self.discussion_summary,
            'action_points': self.action_points,
            'duration_minutes': self.duration_minutes,
            'duration': format_duration(self.duration_minutes) if self.duration_minutes is not None else None,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class Issue(db.Model):
    __tablename__ = 'issues'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, nullable=True)
    date = db.Column(db.Date, nullable=False, index=True)
    problem_description = db.Column(db.String(2000), nullable=False)
    responsible_persons = db.Column(db.String(1000), nullable=True)  # comma-separated
    solved_persons = db.Column(db.String(1000), nullable=True)  # comma-separated
    start_time = db.Column(db.String(20), nullable=True)
    deadline = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default='pending')  # pending, in-progress, complete
    logged_user = db.Column(db.String(100), nullable=True, index=True)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'project_name': None,
            'date': self.date.isoformat() if self.date else None,
            'problem_description': self.problem_description,
            'responsible_persons': self.responsible_persons.split(',') if self.responsible_persons else [],
            'solved_persons': self.solved_persons.split(',') if self.solved_persons else [],
            'start_time': self.start_time,
            'deadline': self.deadline.isoformat() if self.deadline else None,
            'status': self.status,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class Holiday(db.Model):
    __tablename__ = 'holidays'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    logged_user = db.Column(db.String(100), nullable=True)
    datetime = db.Column(db.DateTime, default=now_ist)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'description': self.description,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class TeaCoffee(db.Model):
    __tablename__ = 'tea_coffee'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    time_of_day = db.Column(db.String(50), nullable=True)  # Morning/Afternoon/Evening
    qty = db.Column(db.Integer, nullable=True)
    price = db.Column(db.Float, nullable=True)
    logged_user = db.Column(db.String(100), nullable=True)
    datetime = db.Column(db.DateTime, default=datetime.utcnow)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'time_of_day': self.time_of_day,
            'qty': self.qty,
            'price': self.price,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class TeaCoffeePrice(db.Model):
    __tablename__ = 'tea_coffee_prices'
    id = db.Column(db.Integer, primary_key=True)
    time_of_day = db.Column(db.String(50), nullable=True)
    price = db.Column(db.Float, nullable=False)
    logged_user = db.Column(db.String(100), nullable=True)
    datetime = db.Column(db.DateTime, default=datetime.utcnow)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'time_of_day': self.time_of_day,
            'price': self.price,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }


class CompanyExpense(db.Model):
    __tablename__ = 'company_expenses'
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(2000), nullable=True)
    logged_user = db.Column(db.String(100), nullable=True)
    datetime = db.Column(db.DateTime, default=datetime.utcnow)
    operation = db.Column(db.String(50), default='Add')

    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'price': self.price,
            'description': self.description,
            'logged_user': self.logged_user,
            'datetime': self.datetime.isoformat() if self.datetime else None,
            'operation': self.operation,
        }



def format_duration(minutes):
    try:
        m = int(minutes)
    except Exception:
        return None
    h = m // 60
    mm = m % 60
    parts = []
    if h:
        parts.append(f"{h}h")
    if mm or not parts:
        parts.append(f"{mm}m")
    return ' '.join(parts)



