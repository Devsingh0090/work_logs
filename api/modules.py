from flask import Blueprint, request, jsonify, session
from models_clean import db, Module, now_ist

modules_api = Blueprint('modules_api', __name__, url_prefix='/Work_logs/api')

@modules_api.route('/modules', methods=['GET'])
def list_modules():
    try:
        work_type_id = request.args.get('work_type_id')
        q = Module.query
        if work_type_id:
            q = q.filter(Module.work_type_id == int(work_type_id))
        items = q.order_by(Module.id.asc()).all()
        return jsonify([m.to_dict() for m in items])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@modules_api.route('/modules', methods=['POST'])
def create_module():
    data = request.get_json() or {}
    try:
        wt = int(data.get('work_type_id'))
    except Exception:
        return jsonify({'error': 'work_type_id is required and must be an integer'}), 400
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'name is required'}), 400
    m = Module(work_type_id=wt, name=name, datetime=now_ist(), operation='Add')
    db.session.add(m)
    db.session.commit()
    return jsonify(m.to_dict()), 201

@modules_api.route('/modules/<int:m_id>', methods=['PUT'])
def update_module(m_id):
    m = Module.query.get(m_id)
    if not m:
        return jsonify({'error':'Not found'}), 404
    data = request.get_json() or {}
    if 'name' in data:
        m.name = data.get('name')
    if 'work_type_id' in data:
        try:
            m.work_type_id = int(data.get('work_type_id'))
        except Exception:
            pass
    m.operation = data.get('operation', 'Update')
    m.datetime = now_ist()
    db.session.commit()
    return jsonify(m.to_dict())

@modules_api.route('/modules/<int:m_id>', methods=['DELETE'])
def delete_module(m_id):
    m = Module.query.get(m_id)
    if not m:
        return jsonify({'error':'Not found'}), 404
    m.operation = 'delete'
    db.session.commit()
    return jsonify({'success': True})
