from flask import Blueprint, request, jsonify, session
from models_clean import db, Meeting
from datetime import datetime
from sqlalchemy import or_

bp = Blueprint('meetings_api', __name__, url_prefix='/Work_logs/api/meetings')


@bp.route('', methods=['GET'])
def list_meetings():
    try:
        # Optional start/end date filtering (expects YYYY-MM-DD)
        start = request.args.get('start')
        end = request.args.get('end')
        q = Meeting.query.filter(Meeting.operation != 'delete')
        if start:
            try:
                sd = datetime.fromisoformat(start).date()
                q = q.filter(Meeting.meeting_date >= sd)
            except Exception:
                return jsonify({'error': 'invalid start date format, use YYYY-MM-DD'}), 400
        if end:
            try:
                ed = datetime.fromisoformat(end).date()
                q = q.filter(Meeting.meeting_date <= ed)
            except Exception:
                return jsonify({'error': 'invalid end date format, use YYYY-MM-DD'}), 400

        # restrict to logged-in user's meetings
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user:
            try:
                q = q.filter(or_(Meeting.logged_user == current_user, Meeting.logged_user == str(current_user)))
            except Exception:
                pass

        meetings = q.order_by(Meeting.meeting_date.desc(), Meeting.id.desc()).all()
        
        # Batch-fetch project names (N+1 fix)
        project_ids = {m.project_id for m in meetings if m.project_id}
        projects_map = {}
        if project_ids:
            from models_clean import Project
            projects = Project.query.filter(Project.id.in_(project_ids)).all()
            projects_map = {p.id: p.project_name for p in projects}
            
        out = []
        for m in meetings:
            d = m.to_dict()
            if m.project_id in projects_map:
                d['project_name'] = projects_map[m.project_id]
            out.append(d)
        return jsonify(out)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['POST'])
def create_meeting():
    data = request.get_json() or {}
    try:
        meeting_type = data.get('meeting_type')
        meeting_date = data.get('meeting_date')
        discussion_summary = data.get('discussion_summary')
        if not meeting_type or not meeting_date or not discussion_summary:
            return jsonify({'error': 'meeting_type, meeting_date and discussion_summary are required'}), 400

        m = Meeting(
            meeting_type=meeting_type,
            meeting_date=datetime.fromisoformat(meeting_date).date(),
            project_id=data.get('project_id'),
            discussion_summary=discussion_summary,
            action_points=data.get('action_points'),
            duration_minutes=data.get('duration_minutes'),
            logged_user=(session.get('operator_id') or session.get('user_id') or data.get('logged_user'))
        )
        db.session.add(m)
        db.session.commit()
        return jsonify(m.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['PUT'])
def update_meeting(id):
    data = request.get_json() or {}
    m = Meeting.query.get_or_404(id)
    try:
        # enforce owner-only updates
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user and m.logged_user and str(m.logged_user) != str(current_user):
            return jsonify({'error': 'forbidden'}), 403
        if 'meeting_type' in data:
            m.meeting_type = data.get('meeting_type')
        if 'meeting_date' in data:
            m.meeting_date = datetime.fromisoformat(data.get('meeting_date')).date()
        if 'project_id' in data:
            m.project_id = data.get('project_id')
        if 'discussion_summary' in data:
            m.discussion_summary = data.get('discussion_summary')
        if 'action_points' in data:
            m.action_points = data.get('action_points')
        if 'duration_minutes' in data:
            m.duration_minutes = data.get('duration_minutes')
        db.session.commit()
        return jsonify(m.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['DELETE'])
def delete_meeting(id):
    m = Meeting.query.get_or_404(id)
    try:
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user and m.logged_user and str(m.logged_user) != str(current_user):
            return jsonify({'error': 'forbidden'}), 403
        # Soft delete: mark as deleted without physically removing
        m.operation = 'delete'
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
