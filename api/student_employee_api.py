from flask import Blueprint, request, jsonify, session
from models_clean import db, StudentEmployee, now_ist
import re

student_employee_api = Blueprint('student_employee_api', __name__)


def is_valid_full_name(name):
    if not name or not isinstance(name, str):
        return False
    return re.match(r"^[A-Za-z .'-]+$", name) is not None


def is_valid_user_id(uid):
    if not uid or not isinstance(uid, str):
        return False
    return re.match(r'^[A-Za-z0-9\-]+$', uid) is not None


def is_valid_designation(des):
    if des is None:
        return True
    if not isinstance(des, str):
        return False
    return re.match(r"^[A-Za-z0-9 .-]{0,40}$", des) is not None


def is_valid_email(email):
    if not email:
        return True
    if not isinstance(email, str):
        return False
    return re.match(r'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$', email) is not None


@student_employee_api.route('/Work_logs/api/users', methods=['POST'])
def add_user():
    data = request.get_json() or {}
    required = ['user_id', 'full_name', 'department', 'user_type', 'user_policy', 'designation', 'email']
    missing = [r for r in required if not data.get(r)]
    if missing:
        return jsonify({'message': f'Missing required fields: {", ".join(missing)}'}), 400

    if 'full_name' in data and not is_valid_full_name(data.get('full_name')):
        return jsonify({'message': 'Invalid full name.'}), 400
    if 'user_id' in data and not is_valid_user_id(data.get('user_id')):
        return jsonify({'message': 'Invalid user ID.'}), 400
    if 'designation' in data and not is_valid_designation(data.get('designation')):
        return jsonify({'message': 'Invalid designation.'}), 400
    if 'email' in data and not is_valid_email(data.get('email')):
        return jsonify({'message': 'Invalid email address.'}), 400

    if StudentEmployee.query.filter_by(user_id=data['user_id']).filter(StudentEmployee.operation != 'delete').first():
        return jsonify({'message': 'Duplicate user ID already exists.'}), 409
    if data.get('email'):
        existing_email = StudentEmployee.query.filter_by(email=data['email']).filter(StudentEmployee.operation != 'delete').first()
        if existing_email:
            return jsonify({'message': 'Duplicate email already exists.'}), 409

    password_val = data.get('user_id')
    new_user = StudentEmployee(
        user_id=data.get('user_id'),
        full_name=data.get('full_name'),
        department=data.get('department'),
        user_type=data.get('user_type'),
        designation=data.get('designation'),
        user_policy=data.get('user_policy'),
        password=password_val,
        email=data.get('email'),
        logged_user=session.get('operator_id', 'Unknown'),
        datetime=now_ist(),
        operation='Add',
    )

    db.session.add(new_user)
    db.session.commit()
    return jsonify({'success': True, 'message': 'User added successfully.'}), 201