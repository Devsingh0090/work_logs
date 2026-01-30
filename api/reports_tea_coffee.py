from flask import Blueprint, jsonify
from models_clean import TeaCoffee
import traceback
import sys

reports_tea_coffee = Blueprint('reports_tea_coffee', __name__, url_prefix='/Work_logs/api/reports/tea_coffee')


@reports_tea_coffee.route('', methods=['GET'])
def list_all_tea_coffee():
    try:
        print('[REPORTS API] Fetching all tea/coffee records for report...', file=sys.stderr)
        items = TeaCoffee.query.order_by(TeaCoffee.date.desc(), TeaCoffee.id.desc()).all()
        print(f'[REPORTS API] Found {len(items)} tea/coffee records', file=sys.stderr)
        out = [t.to_dict() for t in items]
        # Resolve logged_user ids to human-readable names when possible
        try:
            from models_clean import Operator, StudentEmployee
            for t, d in zip(items, out):
                try:
                    name = None
                    if t.logged_user:
                        op = Operator.query.filter_by(operator_id=t.logged_user).first()
                        if not op:
                            op = Operator.query.filter_by(operator_id=str(t.logged_user)).first()
                        if op:
                            name = op.name
                        else:
                            se = StudentEmployee.query.filter_by(user_id=t.logged_user).first()
                            if not se:
                                se = StudentEmployee.query.filter_by(user_id=str(t.logged_user)).first()
                            if se:
                                name = se.full_name
                    if name:
                        d['logged_user'] = name
                except Exception:
                    pass
        except Exception:
            pass
        return jsonify(out)
    except Exception as e:
        print(f'[REPORTS API ERROR] {str(e)}', file=sys.stderr)
        traceback.print_exc()
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500
