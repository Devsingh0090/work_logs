from flask import Blueprint, request, jsonify, session
from models_clean import db, TeaCoffee
from datetime import datetime

bp = Blueprint('tea_coffee_api', __name__, url_prefix='/Work_logs/api/tea_coffee')

@bp.route('', methods=['GET'])
def list_tea_coffee():
    try:
        q = TeaCoffee.query.filter(TeaCoffee.operation != 'delete').order_by(TeaCoffee.date.desc(), TeaCoffee.id.desc())
        start = request.args.get('start')
        end = request.args.get('end')
        try:
            if start:
                sd = datetime.fromisoformat(start).date()
                q = q.filter(TeaCoffee.date >= sd)
            if end:
                ed = datetime.fromisoformat(end).date()
                q = q.filter(TeaCoffee.date <= ed)
        except Exception:
            pass
        items = q.all()
        return jsonify([i.to_dict() for i in items])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_tea_coffee():
    data = request.get_json() or {}
    try:
        date = data.get('date')
        if not date:
            return jsonify({'error': 'date is required'}), 400
        try:
            d = datetime.fromisoformat(date).date()
        except Exception:
            return jsonify({'error': 'invalid date format (use YYYY-MM-DD)'}), 400
        # Interpret incoming `price` as unit price. Store total price = qty * unit_price
        qty_val = None
        unit_price = None
        try:
            if data.get('qty') is not None:
                qty_val = int(data.get('qty'))
        except Exception:
            qty_val = None
        try:
            if data.get('price') is not None:
                unit_price = float(data.get('price'))
        except Exception:
            unit_price = None

        total_price = None
        if qty_val is not None and unit_price is not None:
            total_price = qty_val * unit_price
        else:
            # fallback: if only price provided, treat it as total price
            if unit_price is not None:
                total_price = unit_price

        tc = TeaCoffee(
            date=d,
            time_of_day=data.get('time_of_day'),
            qty=qty_val,
            price=total_price,
            logged_user=(session.get('operator_id') or session.get('user_id') or data.get('logged_user'))
        )
        db.session.add(tc)
        db.session.commit()
        return jsonify(tc.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:id>', methods=['PUT'])
def update_tea_coffee(id):
    data = request.get_json() or {}
    tc = TeaCoffee.query.get_or_404(id)
    try:
        if 'date' in data:
            try:
                tc.date = datetime.fromisoformat(data.get('date')).date()
            except Exception:
                return jsonify({'error': 'invalid date format'}), 400
        if 'time_of_day' in data:
            tc.time_of_day = data.get('time_of_day')
        if 'qty' in data:
            try:
                tc.qty = int(data.get('qty')) if data.get('qty') is not None else None
            except Exception:
                pass
        # Recompute stored total price when qty or price (unit price) changes.
        price_provided = 'price' in data
        qty_provided = 'qty' in data
        new_unit_price = None
        if price_provided:
            try:
                new_unit_price = float(data.get('price')) if data.get('price') is not None else None
            except Exception:
                new_unit_price = None

        # Decide final stored price
        try:
            current_qty = tc.qty
            if qty_provided:
                # tc.qty was already updated above
                current_qty = int(data.get('qty')) if data.get('qty') is not None else None
        except Exception:
            current_qty = tc.qty

        final_price = tc.price
        if qty_provided and price_provided:
            if current_qty is not None and new_unit_price is not None:
                final_price = current_qty * new_unit_price
            elif new_unit_price is not None:
                final_price = new_unit_price
        elif price_provided:
            # only price changed; treat provided price as unit price and multiply by existing qty if present
            if current_qty is not None and new_unit_price is not None:
                final_price = current_qty * new_unit_price
            else:
                final_price = new_unit_price

        tc.price = final_price
        db.session.commit()
        return jsonify(tc.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:id>', methods=['DELETE'])
def delete_tea_coffee(id):
    tc = TeaCoffee.query.get_or_404(id)
    try:
        # Soft delete: mark as deleted without physically removing
        tc.operation = 'delete'
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
