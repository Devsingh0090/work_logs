from flask import Blueprint, request, jsonify, session
from models_clean import db, Issue
from datetime import datetime
from sqlalchemy import or_

bp = Blueprint('issues_api', __name__, url_prefix='/Work_logs/api/issues')


@bp.route('', methods=['GET'])
def list_issues():
    try:
        q = Issue.query.filter(Issue.operation != 'delete')
        # restrict to logged-in user's issues
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user:
            try:
                q = q.filter(or_(Issue.logged_user == current_user, Issue.logged_user == str(current_user)))
            except Exception:
                pass
        issues = q.order_by(Issue.date.desc(), Issue.id.desc()).all()
        
        # Batch-fetch project names to avoid N+1 query
        project_ids = {i.project_id for i in issues if i.project_id}
        projects_map = {}
        if project_ids:
            from models_clean import Project
            projects = Project.query.filter(Project.id.in_(project_ids)).all()
            projects_map = {p.id: p.project_name for p in projects}
        
        out = []
        for i in issues:
            d = i.to_dict()
            if i.project_id in projects_map:
                d['project_name'] = projects_map[i.project_id]
            out.append(d)
        return jsonify(out)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['POST'])
def create_issue():
    data = request.get_json() or {}
    try:
        project_id = data.get('project_id')
        date = data.get('date')
        problem_description = data.get('problem_description')
        # required fields
        if not date or not problem_description:
            return jsonify({'error': 'date and problem_description are required'}), 400
        if not project_id:
            return jsonify({'error': 'project_id is required'}), 400

        # Accept arrays or comma-separated strings for persons
        resp = data.get('responsible_persons') or []
        solved = data.get('solved_persons') or []
        # require at least one responsible and one solved person
        def list_count(x):
            if x is None:
                return 0
            if isinstance(x, list):
                return len([v for v in x if str(v).strip()])
            if isinstance(x, str):
                return 1 if x.strip() else 0
            return 0
        if list_count(resp) == 0:
            return jsonify({'error': 'responsible_persons required'}), 400
        if list_count(solved) == 0:
            return jsonify({'error': 'solved_persons required'}), 400
        def normalize_list(x):
            if x is None:
                return ''
            if isinstance(x, list):
                return ','.join([str(v).strip() for v in x if str(v).strip()])
            return str(x)

        # require start_time and deadline
        if not data.get('start_time'):
            return jsonify({'error': 'start_time is required'}), 400
        if not data.get('deadline'):
            return jsonify({'error': 'deadline is required'}), 400

        issue = Issue(
            project_id=project_id,
            date=datetime.fromisoformat(date).date(),
            problem_description=problem_description,
            responsible_persons=normalize_list(resp),
            solved_persons=normalize_list(solved),
            start_time=data.get('start_time'),
            deadline=(datetime.fromisoformat(data.get('deadline')) if data.get('deadline') else None),
            status=data.get('status') or 'pending',
            logged_user=(session.get('operator_id') or session.get('user_id') or data.get('logged_user'))
        )
        db.session.add(issue)
        db.session.commit()
        return jsonify(issue.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['PUT'])
def update_issue(id):
    data = request.get_json() or {}
    issue = Issue.query.get_or_404(id)
    try:
        # enforce owner-only updates
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user and issue.logged_user and str(issue.logged_user) != str(current_user):
            return jsonify({'error': 'forbidden'}), 403
        if 'project_id' in data:
            issue.project_id = data.get('project_id')
        if 'date' in data:
            issue.date = datetime.fromisoformat(data.get('date')).date()
        if 'problem_description' in data:
            issue.problem_description = data.get('problem_description')
        if 'responsible_persons' in data:
            resp = data.get('responsible_persons')
            issue.responsible_persons = ','.join(resp) if isinstance(resp, list) else str(resp)
        if 'solved_persons' in data:
            sol = data.get('solved_persons')
            issue.solved_persons = ','.join(sol) if isinstance(sol, list) else str(sol)
        if 'start_time' in data:
            issue.start_time = data.get('start_time')
        if 'deadline' in data:
            issue.deadline = (datetime.fromisoformat(data.get('deadline')) if data.get('deadline') else None)
        if 'status' in data:
            issue.status = data.get('status')
        db.session.commit()
        return jsonify(issue.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['DELETE'])
def delete_issue(id):
    issue = Issue.query.get_or_404(id)
    try:
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user and issue.logged_user and str(issue.logged_user) != str(current_user):
            return jsonify({'error': 'forbidden'}), 403
        # Soft delete: mark as deleted without physically removing
        issue.operation = 'delete'
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
