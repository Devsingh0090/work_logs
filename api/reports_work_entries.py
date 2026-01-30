from flask import Blueprint, jsonify
from models_clean import WorkEntry
from datetime import datetime
import traceback
import sys

reports_work_entries = Blueprint('reports_work_entries', __name__, url_prefix='/Work_logs/api/reports/work_entries')


@reports_work_entries.route('', methods=['GET'])
def list_all_work_entries():
    try:
        print('[REPORTS API] Fetching all work entries for report...', file=sys.stderr)
        entries = WorkEntry.query.order_by(WorkEntry.date.desc()).all()
        print(f'[REPORTS API] Found {len(entries)} work entries', file=sys.stderr)
        out = [e.to_dict() for e in entries]
        # Resolve logged_user ids to human-readable names when possible (Optimized Batch)
        try:
            from models_clean import Operator, StudentEmployee
            logged_users = {e.logged_user for e in entries if e.logged_user}
            
            # 1. Batch fetch Operators
            ops = Operator.query.filter(Operator.operator_id.in_(logged_users)).all()
            user_name_map = {op.operator_id: op.name for op in ops}
            
            # 2. Batch fetch StudentEmployees for remaining IDs
            remaining_ids = logged_users - set(user_name_map.keys())
            if remaining_ids:
                students = StudentEmployee.query.filter(StudentEmployee.user_id.in_(remaining_ids)).all()
                for s in students:
                    user_name_map[s.user_id] = s.full_name
            
            # Apply names to output
            for d in out:
                raw_user = d.get('logged_user')
                if raw_user in user_name_map:
                    d['logged_user'] = user_name_map[raw_user]
        except Exception:
            # if models aren't available/resolution fails, return raw values
            pass
        print('[REPORTS API] Successfully returning work entries', file=sys.stderr)
        return jsonify(out)
    except Exception as e:
        print(f'[REPORTS API ERROR] {str(e)}', file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500
