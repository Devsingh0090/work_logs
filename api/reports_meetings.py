from flask import Blueprint, jsonify
from models_clean import Meeting
import traceback
import sys

reports_meetings = Blueprint('reports_meetings', __name__, url_prefix='/Work_logs/api/reports/meetings')


@reports_meetings.route('', methods=['GET'])
def list_all_meetings():
    try:
        print('[REPORTS API] Fetching all meetings for report...', file=sys.stderr)
        meetings = Meeting.query.order_by(Meeting.meeting_date.desc(), Meeting.id.desc()).all()
        print(f'[REPORTS API] Found {len(meetings)} meetings', file=sys.stderr)
        out = [m.to_dict() for m in meetings]
        # Resolve logged_user ids to human-readable names when possible
        try:
            from models_clean import Operator, StudentEmployee, Project
            for m, d in zip(meetings, out):
                try:
                    name = None
                    if m.logged_user:
                        op = Operator.query.filter_by(operator_id=m.logged_user).first()
                        if not op:
                            op = Operator.query.filter_by(operator_id=str(m.logged_user)).first()
                        if op:
                            name = op.name
                        else:
                            se = StudentEmployee.query.filter_by(user_id=m.logged_user).first()
                            if not se:
                                se = StudentEmployee.query.filter_by(user_id=str(m.logged_user)).first()
                            if se:
                                name = se.full_name
                    if getattr(m, 'project_id', None):
                        try:
                            p = Project.query.get(m.project_id)
                            if p:
                                d['project_name'] = p.project_name
                        except Exception:
                            pass
                    if name:
                        d['logged_user'] = name
                except Exception:
                    pass
        except Exception:
            pass
        print('[REPORTS API] Successfully returning meetings', file=sys.stderr)
        return jsonify(out)
    except Exception as e:
        print(f'[REPORTS API ERROR] {str(e)}', file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500
