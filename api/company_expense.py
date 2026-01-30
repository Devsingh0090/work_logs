from flask import Blueprint, request, jsonify, session
from models_clean import db, CompanyExpense, now_ist
from datetime import datetime

bp = Blueprint('company_expense_api', __name__, url_prefix='/Work_logs/api/company_expense')


@bp.route('', methods=['GET'])
def list_expenses():
    try:
        q = CompanyExpense.query.order_by(CompanyExpense.date.desc(), CompanyExpense.id.desc())
        start = request.args.get('start')
        end = request.args.get('end')
        try:
            if start:
                sd = datetime.fromisoformat(start).date()
                q = q.filter(CompanyExpense.date >= sd)
            if end:
                ed = datetime.fromisoformat(end).date()
                q = q.filter(CompanyExpense.date <= ed)
        except Exception:
            pass
        items = q.all()
        return jsonify([i.to_dict() for i in items])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['POST'])
def create_expense():
    data = request.get_json() or {}
    try:
        date = data.get('date')
        price = data.get('price')
        if not date or price is None:
            return jsonify({'error': 'date and price are required'}), 400
        # require non-empty description
        desc = data.get('description')
        if not desc or not str(desc).strip():
            return jsonify({'error': 'description is required'}), 400
        try:
            d = datetime.fromisoformat(date).date()
        except Exception:
            return jsonify({'error': 'invalid date format (use YYYY-MM-DD)'}), 400
        try:
            p = float(price)
        except Exception:
            return jsonify({'error': 'invalid price value'}), 400

        ce = CompanyExpense(
            date=d,
            price=p,
            description=data.get('description'),
            logged_user=(session.get('operator_id') or session.get('user_id') or data.get('logged_user'))
        )
        db.session.add(ce)
        db.session.commit()
        return jsonify(ce.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['DELETE'])
def delete_expense(id):
    try:
        item = CompanyExpense.query.get_or_404(id)
        # Soft-delete: mark as deleted instead of physically removing the record
        item.operation = 'delete'
        item.logged_user = session.get('operator_id') or session.get('user_id') or item.logged_user
        item.datetime = now_ist()
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['PUT'])
def update_expense(id):
    data = request.get_json() or {}
    ce = CompanyExpense.query.get_or_404(id)
    try:
        if 'date' in data:
            try:
                ce.date = datetime.fromisoformat(data.get('date')).date()
            except Exception:
                return jsonify({'error': 'invalid date format'}), 400
        if 'price' in data:
            try:
                ce.price = float(data.get('price'))
            except Exception:
                return jsonify({'error': 'invalid price value'}), 400
        if 'description' in data:
            # don't allow empty description
            if not data.get('description') or not str(data.get('description')).strip():
                return jsonify({'error': 'description is required'}), 400
            ce.description = data.get('description')
        db.session.commit()
        return jsonify(ce.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['GET'])
def get_expense(id):
    try:
        item = CompanyExpense.query.get_or_404(id)
        return jsonify(item.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500
