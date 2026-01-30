from flask import Blueprint, request, jsonify, session
from models_clean import db, Holiday
from datetime import datetime

bp = Blueprint('holidays_api', __name__, url_prefix='/Work_logs/api/holidays')

@bp.route('', methods=['GET'])
def list_holidays():
    try:
        from datetime import date, timedelta
        
        today = date.today()
        # auto-sync window: next 30 days
        sync_end = today + timedelta(days=30)

        # 1. Identify recurring dates in sync window
        recurring_needed = []
        curr = today
        while curr <= sync_end:
            weekday = curr.weekday()
            kind = None
            if weekday == 6: # Sunday
                kind = "Sunday"
            elif weekday == 5: # Saturday
                day = curr.day
                if 8 <= day <= 14: kind = "2nd Saturday"
                elif 22 <= day <= 28: kind = "4th Saturday"
            
            if kind:
                recurring_needed.append({'date': curr, 'desc': f"{kind} (Auto)"})
            curr += timedelta(days=1)

        # 2. Sync with DB: Insert any missing recurring holidays
        for rec in recurring_needed:
            # Check if record exists for this date (regardless of operation)
            existing = Holiday.query.filter_by(date=rec['date']).first()
            if not existing:
                new_h = Holiday(
                    date=rec['date'],
                    description=rec['desc'],
                    operation='Add',
                    logged_user='System'
                )
                db.session.add(new_h)
        
        if recurring_needed:
            db.session.commit()

        # 3. Return only holidays NOT marked as deleted
        q = Holiday.query.filter(Holiday.operation != 'delete').order_by(Holiday.date.desc())
        
        start_param = request.args.get('start')
        end_param = request.args.get('end')
        try:
            if start_param:
                sd = datetime.fromisoformat(start_param).date()
                q = q.filter(Holiday.date >= sd)
            if end_param:
                ed = datetime.fromisoformat(end_param).date()
                q = q.filter(Holiday.date <= ed)
        except Exception:
            pass
        
        holidays = q.all()
        return jsonify([h.to_dict() for h in holidays])
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_holiday():
    data = request.get_json() or {}
    try:
        date_str = data.get('date')
        if not date_str:
            return jsonify({'error': 'date is required'}), 400
        try:
            d = datetime.fromisoformat(date_str).date()
        except Exception:
            return jsonify({'error': 'invalid date format (use YYYY-MM-DD)'}), 400
        
        # require description
        desc = data.get('description')
        if not desc or not str(desc).strip():
            return jsonify({'error': 'description is required'}), 400

        # Check if a deleted record exists for this date, if so, reactivate it
        existing = Holiday.query.filter_by(date=d).first()
        if existing:
            existing.operation = 'Add'
            existing.description = data.get('description') or existing.description
            existing.logged_user = (session.get('operator_id') or session.get('user_id') or data.get('logged_user'))
            h = existing
        else:
            h = Holiday(
                date=d,
                description=data.get('description'),
                operation='Add',
                logged_user=(session.get('operator_id') or session.get('user_id') or data.get('logged_user'))
            )
            db.session.add(h)
        
        db.session.commit()
        return jsonify(h.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:id>', methods=['PUT'])
def update_holiday(id):
    data = request.get_json() or {}
    h = Holiday.query.get_or_404(id)
    try:
        if 'date' in data:
            try:
                h.date = datetime.fromisoformat(data.get('date')).date()
            except Exception:
                return jsonify({'error': 'invalid date format'}), 400
        if 'description' in data:
            h.description = data.get('description')
        h.operation = 'Update'
        db.session.commit()
        return jsonify(h.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:id>', methods=['DELETE'])
def delete_holiday(id):
    h = Holiday.query.get_or_404(id)
    try:
        # Soft delete to prevent auto-sync from recreating it
        h.operation = 'delete'
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
