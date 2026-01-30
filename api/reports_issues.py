from flask import Blueprint, jsonify
from models_clean import Issue
import traceback
import sys

reports_issues = Blueprint('reports_issues', __name__, url_prefix='/Work_logs/api/reports/issues')


@reports_issues.route('', methods=['GET'])
def list_all_issues():
    try:
        print('[REPORTS API] Fetching all issues for report...', file=sys.stderr)
        items = Issue.query.order_by(Issue.date.desc(), Issue.id.desc()).all()
        print(f'[REPORTS API] Found {len(items)} issues', file=sys.stderr)
        out = [i.to_dict() for i in items]
        try:
            from models_clean import Operator, StudentEmployee, Project
            for i, d in zip(items, out):
                try:
                    name = None
                    if i.logged_user:
                        op = Operator.query.filter_by(operator_id=i.logged_user).first()
                        if not op:
                            op = Operator.query.filter_by(operator_id=str(i.logged_user)).first()
                        if op:
                            name = op.name
                        else:
                            se = StudentEmployee.query.filter_by(user_id=i.logged_user).first()
                            if not se:
                                se = StudentEmployee.query.filter_by(user_id=str(i.logged_user)).first()
                            if se:
                                name = se.full_name
                    if getattr(i, 'project_id', None):
                        try:
                            p = Project.query.get(i.project_id)
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
        print('[REPORTS API] Successfully returning issues', file=sys.stderr)
        return jsonify(out)
    except Exception as e:
        print(f'[REPORTS API ERROR] {str(e)}', file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500
