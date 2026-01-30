from flask import Blueprint, request, jsonify, session
from models_clean import db, Operator, Role, now_ist
from sqlalchemy import or_
from datetime import datetime

from flask import session

users_bp = Blueprint('users', __name__)


def parse_date(d):
    if not d:
        return None
    try:
        return datetime.strptime(d, '%Y-%m-%d').date()
    except Exception:
        return None


@users_bp.route('/Work_logs/api/operators', methods=['GET'])
def get_operators():
    try:
        operators = Operator.query.filter(Operator.operation != 'delete').all()
        return jsonify([op.to_dict() for op in operators])
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@users_bp.route('/Work_logs/api/operators/<int:operator_id>', methods=['GET'])
def get_operator(operator_id):
    try:
        op = Operator.query.get_or_404(operator_id)
        return jsonify(op.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/Work_logs/api/operators', methods=['POST'])
def create_operator():
    data = request.get_json() or {}
    required_fields = ['name', 'email', 'password', 'role']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if Operator.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400

    if data.get('operator_id'):
        operator_id = data['operator_id']
        if Operator.query.filter_by(operator_id=operator_id).first():
            return jsonify({'error': 'Operator ID already exists'}), 400
    else:
        operator_id = f"OPR{Operator.query.count() + 1:03d}"

    joining_date = parse_date(data.get('joining_date'))
    skills = data.get('skills')

    operator = Operator(
        operator_id=operator_id,
        name=data['name'],
        email=data['email'],
        password=data['password'],
        role=data['role'],
        joining_date=joining_date,
        skills=skills,
        operation=data.get('operation', 'Add'),
        created_at=now_ist(),
    )
    operator.logged_user = session.get('operator_id') or data.get('logged_user')
    db.session.add(operator)
    db.session.commit()
    return jsonify(operator.to_dict()), 201


@users_bp.route('/Work_logs/api/operators/<int:operator_id>', methods=['PUT'])
def update_operator(operator_id):
    op = Operator.query.get(operator_id)
    if not op:
        op = Operator.query.filter_by(operator_id=str(operator_id)).first()
    if not op:
        return jsonify({'error': 'Operator not found'}), 404

    data = request.get_json() or {}
    if 'operator_id' in data and data['operator_id'] != op.operator_id:
        if Operator.query.filter_by(operator_id=data['operator_id']).first():
            return jsonify({'error': 'Operator ID already exists'}), 400
        op.operator_id = data['operator_id']

    if 'email' in data and data['email'] != op.email:
        if Operator.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        op.email = data['email']

    op.name = data.get('name', op.name)
    if data.get('password'):
        op.password = data.get('password')
    op.role = data.get('role', op.role)
    jd = parse_date(data.get('joining_date'))
    if jd:
        op.joining_date = jd
    if 'skills' in data:
        op.skills = data.get('skills')

    op.operation = data.get('operation', 'Update')
    op.logged_user = session.get('operator_id') or data.get('logged_user', op.logged_user)
    op.created_at = now_ist()

    db.session.commit()
    return jsonify(op.to_dict())


@users_bp.route('/Work_logs/api/operators/<int:operator_id>', methods=['DELETE'])
def delete_operator(operator_id):
    op = Operator.query.get(operator_id)
    if not op:
        op = Operator.query.filter_by(operator_id=str(operator_id)).first()
    if not op:
        return jsonify({'error': 'Operator not found'}), 404
    op.operation = 'delete'
    op.created_at = now_ist()
    db.session.commit()
    return jsonify({'message': 'Operator marked as deleted'})


@users_bp.route('/Work_logs/api/me', methods=['GET'])
def get_current_user_context():
    """Unified endpoint to return user details and permissions in one request."""
    try:
        op_id = session.get('operator_id') or session.get('user_id')
        if not op_id:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
            
        op = Operator.query.filter((Operator.operator_id == str(op_id)) | (Operator.id == op_id)).first()
        if not op:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        # Fetch role permissions
        import json
        perms = []
        role_obj = Role.query.filter_by(name=op.role).first()
        if role_obj and role_obj.permissions:
            try:
                perms = json.loads(role_obj.permissions)
            except:
                perms = []
        
        return jsonify({
            'success': True,
            'user': {
                'id': op.id,
                'name': op.name,
                'email': op.email,
                'role': op.role,
                'operator_id': op.operator_id
            },
            'permissions': perms
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@users_bp.route('/Work_logs/api/me/profile', methods=['PUT'])
def update_my_profile():
    try:
        op_id = session.get('operator_id') or session.get('user_id')
        if not op_id:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
            
        op = Operator.query.filter((Operator.operator_id == str(op_id)) | (Operator.id == op_id)).first()
        if not op:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        data = request.get_json() or {}
        op.name = data.get('name', op.name)
        op.email = data.get('email', op.email)
        op.skills = data.get('skills', op.skills)
        
        if 'joining_date' in data:
            jd = parse_date(data['joining_date'])
            if jd:
                op.joining_date = jd
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Profile updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@users_bp.route('/Work_logs/api/me/password', methods=['PUT'])
def update_my_password():
    try:
        op_id = session.get('operator_id') or session.get('user_id')
        if not op_id:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
            
        op = Operator.query.filter((Operator.operator_id == str(op_id)) | (Operator.id == op_id)).first()
        if not op:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        data = request.get_json() or {}
        current_pwd = data.get('current_password')
        new_pwd = data.get('new_password')
        
        if not current_pwd or not new_pwd:
            return jsonify({'success': False, 'message': 'Current and new password required'}), 400
            
        # Simple plain text check check as per current models_clean.py (Operator.password is likely plain text)
        if op.password != current_pwd:
            return jsonify({'success': False, 'message': 'Incorrect current password'}), 400
            
        op.password = new_pwd
        db.session.commit()
        return jsonify({'success': True, 'message': 'Password updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@users_bp.route('/Work_logs/api/me/notifications', methods=['GET'])
def get_my_notifications():
    try:
        op_id = session.get('operator_id') or session.get('user_id')
        if not op_id:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
            
        op = Operator.query.filter((Operator.operator_id == str(op_id)) | (Operator.id == op_id)).first()
        if not op:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        # 1. Fetch Assigned Projects
        from models_clean import Project
        # Projects store PK IDs (e.g. '1', '2,3') while Issues store names.
        # We search for op.id (string), op.name, and op.operator_id
        assigned_projects = Project.query.filter(
            or_(
                Project.assigned_employees.like(f'%{op.id}%'),
                Project.assigned_employees.like(f'%{op.name}%'),
                Project.assigned_employees.like(f'%{op.operator_id}%')
            )
        ).all()
        
        # 2. Fetch Solved Issues (where user is listsed as solved_person)
        from models_clean import Issue
        solved_issues = Issue.query.filter(
            or_(
                Issue.solved_persons.like(f'%{op.name}%'),
                Issue.solved_persons.like(f'%{op.operator_id}%')
            )
        ).order_by(Issue.date.desc()).all()
        
        # Batch project names for issues
        p_ids = {i.project_id for i in solved_issues if i.project_id}
        p_map = {p.id: p.project_name for p in Project.query.filter(Project.id.in_(p_ids)).all()} if p_ids else {}

        return jsonify({
            'success': True,
            'projects': [p.to_dict() for p in assigned_projects],
            'issues': [
                {**i.to_dict(), 'project_name': p_map.get(i.project_id, 'No Project')} 
                for i in solved_issues
            ]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@users_bp.route('/Work_logs/api/operator_details/current', methods=['GET'])
def get_current_operator_details():
    # Attempt to return current logged-in operator details using session
    try:
        op_id = session.get('operator_id') or session.get('user_id')
        if not op_id:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401

        # Operator routes may store operator_id as string like 'OPR001' or numeric id
        op = Operator.query.filter((Operator.operator_id == str(op_id)) | (Operator.id == op_id)).first()
        if not op:
            return jsonify({'success': False, 'message': 'Operator not found in DB'}), 404

        return jsonify({
            'success': True,
            'name': op.name,
            'operator_id': op.operator_id,
            'id': op.id,
            'email': op.email,
            'role': op.role,
            'skills': op.skills,
            'joining_date': op.joining_date.strftime('%Y-%m-%d') if op.joining_date else None,
            'logged_in': True
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@users_bp.route('/Work_logs/api/roles', methods=['GET'])
def list_roles():
    try:
        roles = Role.query.all()
        return jsonify([r.to_dict() for r in roles])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/Work_logs/api/roles/<int:role_id>', methods=['GET'])
def get_role(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'error': 'Role not found'}), 404
        return jsonify(role.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/Work_logs/api/roles', methods=['POST'])
def create_role():
    try:
        data = request.get_json() or {}
        name = data.get('name')
        permissions = data.get('permissions', [])
        if not name:
            return jsonify({'error': 'name is required'}), 400
        if Role.query.filter_by(name=name).first():
            return jsonify({'error': 'Role name already exists'}), 400
        import json
        role = Role(name=name, permissions=json.dumps(permissions))
        db.session.add(role)
        db.session.commit()
        return jsonify(role.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/Work_logs/api/roles/<int:role_id>', methods=['PUT'])
def update_role(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'error': 'Role not found'}), 404
        data = request.get_json() or {}
        name = data.get('name')
        permissions = data.get('permissions')
        if name:
            # ensure uniqueness
            existing = Role.query.filter(Role.name == name, Role.id != role.id).first()
            if existing:
                return jsonify({'error': 'Role name already exists'}), 400
            role.name = name
        if permissions is not None:
            import json
            role.permissions = json.dumps(permissions)
        
        db.session.commit()
        return jsonify(role.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/Work_logs/api/roles/<int:role_id>', methods=['DELETE'])
def delete_role(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'error': 'Role not found'}), 404
        # Prevent accidental data loss: if any operator uses this role, refuse deletion
        from models_clean import Operator
        in_use = Operator.query.filter(Operator.role == role.name).first()
        if in_use:
            return jsonify({'error': 'Role is in use by operators; cannot delete'}), 400
        # Otherwise mark as deleted by renaming and clearing permissions (preserves audit/history)
        role.name = f"deleted_{role.id}_{role.name}"
        role.permissions = '[]'
        db.session.commit()
        return jsonify({'message': 'Role marked as deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500