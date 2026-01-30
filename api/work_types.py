from flask import Blueprint, request, jsonify, session
from models_clean import db, WorkType, Module, now_ist

work_types_api = Blueprint('work_types_api', __name__, url_prefix='/Work_logs/api')


@work_types_api.route('/work_types', methods=['GET'])
def list_work_types():
    try:
        items = WorkType.query.filter(WorkType.operation != 'delete').order_by(WorkType.name.asc()).all()
        out = []
        for w in items:
            modules = Module.query.filter(Module.work_type_id == w.id).order_by(Module.id.asc()).all()
            d = w.to_dict()
            d['modules'] = [m.name for m in modules]
            d['modules_raw'] = ','.join([m.name for m in modules]) if modules else None
            out.append(d)
        return jsonify(out)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@work_types_api.route('/work_types', methods=['POST'])
def create_work_type():
    data = request.get_json() or {}
    name = data.get('name')
    if not name:
        return jsonify({'error': 'name is required'}), 400
    wt = WorkType(name=name.strip(), operation='Add', datetime=now_ist())
    db.session.add(wt)
    db.session.commit()
    # If modules provided, create entries in modules table
    modules = data.get('modules', [])
    if isinstance(modules, list) and modules:
        for mname in modules:
            mname = (mname or '').strip()
            if not mname: continue
            mod = Module(work_type_id=wt.id, name=mname, datetime=now_ist(), operation='Add')
            db.session.add(mod)
        db.session.commit()
    # return work type with modules
    modules_objs = Module.query.filter(Module.work_type_id == wt.id).order_by(Module.id.asc()).all()
    d = wt.to_dict()
    d['modules'] = [m.name for m in modules_objs]
    d['modules_raw'] = ','.join([m.name for m in modules_objs]) if modules_objs else None
    return jsonify(d), 201


@work_types_api.route('/work_types/<int:wt_id>', methods=['PUT'])
def update_work_type(wt_id):
    wt = WorkType.query.get(wt_id)
    if not wt:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json() or {}
    if 'name' in data:
        wt.name = data['name']
    # synchronize modules if provided: replace existing modules for this work type
    if 'modules' in data:
        mods = data['modules'] or []
        # Soft delete existing modules for this work type (mark as deleted, don't physically remove)
        existing_modules = Module.query.filter(Module.work_type_id == wt.id).all()
        for mod in existing_modules:
            mod.operation = 'delete'
        if isinstance(mods, list):
            for mname in mods:
                mname = (mname or '').strip()
                if not mname: continue
                mod = Module(work_type_id=wt.id, name=mname, datetime=now_ist(), operation='Update')
                db.session.add(mod)
    wt.operation = data.get('operation', 'Update')
    wt.datetime = now_ist()
    db.session.commit()
    return jsonify(wt.to_dict())


@work_types_api.route('/work_types/<int:wt_id>', methods=['DELETE'])
def delete_work_type(wt_id):
    wt = WorkType.query.get(wt_id)
    if not wt:
        return jsonify({'error': 'Not found'}), 404
    wt.operation = 'delete'
    wt.datetime = now_ist()
    db.session.commit()
    return jsonify({'success': True})


@work_types_api.route('/work_types/<int:wt_id>', methods=['GET'])
def get_work_type(wt_id):
    try:
        wt = WorkType.query.get(wt_id)
        if not wt or wt.operation == 'delete':
            return jsonify({'error': 'Not found'}), 404
        modules = Module.query.filter(Module.work_type_id == wt.id).order_by(Module.id.asc()).all()
        d = wt.to_dict()
        d['modules'] = [m.name for m in modules]
        d['modules_raw'] = ','.join([m.name for m in modules]) if modules else None
        return jsonify(d)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
