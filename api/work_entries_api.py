from flask import Blueprint, request, jsonify, session
from models_clean import db, WorkEntry
from datetime import datetime, time
import traceback
from sqlalchemy import or_


def compute_duration_minutes(start_ts, end_ts):
    try:
        if not start_ts or not end_ts:
            return None
        # start_ts and end_ts expected as 'HH:MM' or 'HH:MM:SS'
        s_parts = [int(x) for x in start_ts.split(':')]
        e_parts = [int(x) for x in end_ts.split(':')]
        s_minutes = s_parts[0]*60 + s_parts[1]
        e_minutes = e_parts[0]*60 + e_parts[1]
        diff = e_minutes - s_minutes
        if diff < 0:
            diff += 24*60
        return diff
    except Exception:
        return None


work_entries_api = Blueprint('work_entries_api', __name__, url_prefix='/Work_logs/api/work_entries')


@work_entries_api.route('', methods=['GET'])
def list_work_entries():
    try:
        # optional date range filters: start and end in YYYY-MM-DD
        start_q = request.args.get('start')
        end_q = request.args.get('end')
        q = WorkEntry.query
        try:
            if start_q:
                dstart = datetime.fromisoformat(start_q).date()
                q = q.filter(WorkEntry.date >= dstart)
            if end_q:
                dend = datetime.fromisoformat(end_q).date()
                q = q.filter(WorkEntry.date <= dend)
        except Exception:
            # ignore parse errors and return all
            pass
        # Restrict to logged-in user's entries when session present
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user:
            try:
                q = q.filter(or_(WorkEntry.logged_user == current_user, WorkEntry.logged_user == str(current_user)))
            except Exception:
                pass
        entries = q.order_by(WorkEntry.date.desc()).all()
        
        # Batch-fetch projects to avoid N+1 query
        project_ids = {e.project_id for e in entries if e.project_id}
        projects_map = {}
        if project_ids:
            from models_clean import Project
            projects = Project.query.filter(Project.id.in_(project_ids)).all()
            projects_map = {p.id: p.project_name for p in projects}

        out = []
        for e in entries:
            d = e.to_dict()
            d['project_name'] = projects_map.get(e.project_id) if e.project_id else None
            out.append(d)
        return jsonify(out)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500


@work_entries_api.route('/<int:entry_id>', methods=['GET'])
def get_work_entry(entry_id):
    try:
        e = WorkEntry.query.get(entry_id)
        if not e:
            return jsonify({'error': 'Not found'}), 404
        # enforce owner-only access when session present
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user and e.logged_user and str(e.logged_user) != str(current_user):
            return jsonify({'error': 'forbidden'}), 403
        return jsonify(e.to_dict())
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500


@work_entries_api.route('', methods=['POST'])
def create_work_entry():
    try:
        data = request.get_json() or {}
        try:
            date = datetime.fromisoformat(data.get('date')).date() if data.get('date') else None
        except Exception:
            return jsonify({'error': 'Invalid date format'}), 400
        if not date or not data.get('work_type'):
            return jsonify({'error': 'Missing required fields'}), 400
        # determine logged_user from session when available
        current_user = session.get('operator_id') or session.get('user_id')
        entry = WorkEntry(
            date=date,
            work_type=data.get('work_type'),
            module=(data.get('module') if data.get('module') not in [None, ''] else '-'),
            description=data.get('description', ''),
            skills_learned=data.get('skills_learned', ''),
            start_time=data.get('start_time', ''),
            end_time=data.get('end_time', ''),
            logged_user=(current_user or data.get('logged_user'))
        )
        # optional project
        try:
            entry.project_id = int(data.get('project_id')) if data.get('project_id') else None
        except Exception:
            entry.project_id = None
        # compute duration and store
        entry.duration_minutes = compute_duration_minutes(data.get('start_time', ''), data.get('end_time', ''))
        db.session.add(entry)
        db.session.commit()
        return jsonify(entry.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500


@work_entries_api.route('/<int:entry_id>', methods=['PUT'])
def update_work_entry(entry_id):
    try:
        e = WorkEntry.query.get(entry_id)
        if not e:
            return jsonify({'error': 'Not found'}), 404
        # enforce owner-only updates
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user and e.logged_user and str(e.logged_user) != str(current_user):
            return jsonify({'error': 'forbidden'}), 403
        data = request.get_json() or {}
        try:
            if data.get('date'):
                e.date = datetime.fromisoformat(data.get('date')).date()
        except Exception:
            return jsonify({'error': 'Invalid date format'}), 400
        e.work_type = data.get('work_type', e.work_type)
        # module: if provided in payload, store value or '-' when empty; otherwise keep existing
        if 'module' in data:
            e.module = (data.get('module') if data.get('module') not in [None, ''] else '-')
        e.description = data.get('description', e.description)
        e.skills_learned = data.get('skills_learned', e.skills_learned)
        e.start_time = data.get('start_time', e.start_time)
        e.end_time = data.get('end_time', e.end_time)
        # optional project
        try:
            e.project_id = int(data.get('project_id')) if data.get('project_id') else None
        except Exception:
            pass
        # recompute duration
        e.duration_minutes = compute_duration_minutes(e.start_time, e.end_time)
        e.logged_user = data.get('logged_user', e.logged_user)
        db.session.commit()
        return jsonify(e.to_dict())
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500


@work_entries_api.route('/<int:entry_id>', methods=['DELETE'])
def delete_work_entry(entry_id):
    try:
        e = WorkEntry.query.get(entry_id)
        if not e:
            return jsonify({'error': 'Not found'}), 404
        current_user = session.get('operator_id') or session.get('user_id')
        if current_user and e.logged_user and str(e.logged_user) != str(current_user):
            return jsonify({'error': 'forbidden'}), 403
        # Soft delete: mark as deleted without removing from database
        e.operation = 'Delete'
        # DO NOT use db.session.delete(e) - that physically removes the record
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500
