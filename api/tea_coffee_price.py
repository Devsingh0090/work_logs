from flask import Blueprint, request, jsonify, session
from models_clean import db, TeaCoffeePrice
from datetime import datetime

bp = Blueprint('tea_coffee_price_api', __name__, url_prefix='/Work_logs/api/tea_coffee_price')


@bp.route('', methods=['GET'])
def list_prices():
    try:
        items = TeaCoffeePrice.query.filter(TeaCoffeePrice.operation != 'delete').order_by(TeaCoffeePrice.id.desc()).all()
        return jsonify([i.to_dict() for i in items])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('', methods=['POST'])
def create_price():
    data = request.get_json() or {}
    try:
        price = data.get('price')
        if price is None:
            return jsonify({'error': 'price is required'}), 400
        try:
            p = float(price)
        except Exception:
            return jsonify({'error': 'invalid price value'}), 400

        tcp = TeaCoffeePrice(
            time_of_day=data.get('time_of_day'),
            price=p,
            logged_user=(session.get('operator_id') or session.get('user_id') or data.get('logged_user'))
        )
        db.session.add(tcp)
        db.session.commit()
        return jsonify(tcp.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:id>', methods=['DELETE'])
def delete_price(id):
    try:
        item = TeaCoffeePrice.query.get_or_404(id)
        # Soft delete: mark as deleted without physically removing
        item.operation = 'delete'
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
