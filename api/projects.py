from flask import Blueprint, request, jsonify, session
from models_clean import db, Project, WorkEntry, Operator, format_duration, now_ist
from sqlalchemy import func, distinct

projects_api = Blueprint('projects_api', __name__, url_prefix='/Work_logs/api')


@projects_api.route('/projects', methods=['GET'])
def list_projects():
    try:
        assigned_to = request.args.get('assigned_to')
        if not assigned_to:
            # Fallback to current session user to avoid localStorage dependency on frontend
            assigned_to = session.get('operator_id') or session.get('user_id')
            
        query = Project.query.filter(Project.operation != 'delete')
        
        if assigned_to:
            from models_clean import Operator
            # target_id should be the internal numeric ID for assigned_employees string checks
            op = Operator.query.filter((Operator.operator_id == str(assigned_to)) | (Operator.id == assigned_to)).first()
            target_id = str(op.id) if op else str(assigned_to)
                
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    Project.assigned_employees == target_id,
                    Project.assigned_employees.like(f'%,{target_id}'),
                    Project.assigned_employees.like(f'{target_id},%'),
                    Project.assigned_employees.like(f'%,{target_id},%'),
                    Project.logged_user == str(assigned_to)
                )
            )
            
        projects = query.all()
        return jsonify([p.to_dict() for p in projects])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@projects_api.route('/projects/<int:project_id>', methods=['GET'])
def get_project(project_id):
    p = Project.query.get(project_id)
    if not p:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(p.to_dict())


@projects_api.route('/projects', methods=['POST'])
def create_project():
    data = request.get_json() or {}
    try:
        name = data.get('project_name')
        if not name:
            return jsonify({'error': 'project_name is required'}), 400
        # prevent duplicate project names (case-insensitive), ignoring deleted projects
        existing = Project.query.filter(func.lower(Project.project_name) == name.lower(), Project.operation != 'delete').first()
        if existing:
            return jsonify({'error': 'Project with this name already exists'}), 409
        company_id = data.get('company_id')
        employees = data.get('assigned_employees', [])
        if isinstance(employees, list):
            employees_str = ','.join([str(e) for e in employees])
        else:
            employees_str = str(employees)
        proj = Project(
            project_name=name,
            company_id=company_id,
            assigned_employees=employees_str,
            description=data.get('description'),
            logged_user=session.get('operator_id') or session.get('user_id') or None,
            datetime=now_ist(),
            operation='Add'
        )
        db.session.add(proj)
        db.session.commit()
        return jsonify(proj.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@projects_api.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    proj = Project.query.get(project_id)
    if not proj:
        return jsonify({'error': 'Project not found'}), 404
    data = request.get_json() or {}
    # if renaming, ensure no other active project has same name
    if 'project_name' in data:
        new_name = (data.get('project_name') or '').strip()
        if new_name:
            conflict = Project.query.filter(Project.id != project_id, func.lower(Project.project_name) == new_name.lower(), Project.operation != 'delete').first()
            if conflict:
                return jsonify({'error': 'Another project with this name already exists'}), 409
    if 'project_name' in data:
        proj.project_name = data['project_name']
    if 'company_id' in data:
        proj.company_id = data['company_id']
    if 'assigned_employees' in data:
        emps = data['assigned_employees']
        proj.assigned_employees = ','.join([str(e) for e in emps]) if isinstance(emps, list) else str(emps)
    if 'description' in data:
        proj.description = data['description']
    proj.logged_user = session.get('operator_id') or session.get('user_id') or proj.logged_user
    proj.datetime = now_ist()
    proj.operation = data.get('operation', 'Update')
    db.session.commit()
    return jsonify(proj.to_dict())


@projects_api.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    proj = Project.query.get(project_id)
    if not proj:
        return jsonify({'error': 'Project not found'}), 404
    proj.operation = 'delete'
    proj.logged_user = session.get('operator_id') or session.get('user_id') or proj.logged_user
    proj.datetime = now_ist()
    db.session.commit()
    return jsonify({'message': 'Project marked as deleted'})

@projects_api.route('/projects/<int:project_id>/stats', methods=['GET'])
def get_project_stats(project_id):
    try:
        from models_clean import WorkEntry, Operator, db, format_duration
        from sqlalchemy import func, distinct
        
        # 1. Project-wide totals
        project_aggregated = db.session.query(
            func.count(WorkEntry.id).label('total_entries'),
            func.count(distinct(WorkEntry.date)).label('total_days'),
            func.sum(WorkEntry.duration_minutes).label('total_minutes')
        ).filter(
            WorkEntry.project_id == project_id,
            WorkEntry.operation != 'delete'
        ).first()

        # 2. Per-user stats with all work dates batch-fetched
        # First, get all work entries for this project to avoid multiple queries
        all_project_entries = WorkEntry.query.filter(
            WorkEntry.project_id == project_id,
            WorkEntry.operation != 'delete'
        ).order_by(WorkEntry.logged_user, WorkEntry.date).all()
        
        if not all_project_entries:
            return jsonify({
                'project_id': project_id,
                'total_contributors': 0,
                'project_total_entries': 0,
                'project_total_days': 0,
                'project_total_duration': '0m',
                'user_stats': []
            })

        def format_date_ranges(dates):
            if not dates: return ""
            sorted_dates = sorted(list(set(dates)))
            from datetime import timedelta
            ranges = []
            if not sorted_dates: return ""
            start_date = sorted_dates[0]
            current_date = start_date
            for i in range(1, len(sorted_dates)):
                if sorted_dates[i] == current_date + timedelta(days=1):
                    current_date = sorted_dates[i]
                else:
                    if start_date == current_date:
                        ranges.append(start_date.strftime('%d/%m/%Y'))
                    else:
                        ranges.append(f"{start_date.strftime('%d/%m/%Y')} - {current_date.strftime('%d/%m/%Y')}")
                    start_date = sorted_dates[i]
                    current_date = start_date
            if start_date == current_date:
                ranges.append(start_date.strftime('%d/%m/%Y'))
            else:
                ranges.append(f"{start_date.strftime('%d/%m/%Y')} - {current_date.strftime('%d/%m/%Y')}")
            return ", ".join(ranges)

        # Group data by user in memory (extremely fast for typical project entry counts)
        user_data = {}
        for e in all_project_entries:
            uid = e.logged_user
            if uid not in user_data:
                user_data[uid] = {'dates': [], 'minutes': 0}
            user_data[uid]['dates'].append(e.date)
            user_data[uid]['minutes'] += (e.duration_minutes or 0)

        # Batch fetch Operator names
        unique_uids = list(user_data.keys())
        ops = Operator.query.filter(Operator.operator_id.in_(unique_uids)).all()
        op_names = {op.operator_id: op.name for op in ops}

        user_stats = []
        for uid, data in user_data.items():
            dates = sorted(list(set(data['dates'])))
            user_stats.append({
                'operator_id': uid,
                'user_name': op_names.get(uid, uid),
                'days_worked': len(dates),
                'work_dates_breakdown': format_date_ranges(dates),
                'total_duration': format_duration(data['minutes']) or '0m',
                'minutes': data['minutes']
            })
            
        return jsonify({
            'project_id': project_id,
            'total_contributors': len(user_stats),
            'project_total_entries': project_aggregated.total_entries or 0,
            'project_total_days': project_aggregated.total_days or 0,
            'project_total_duration': format_duration(project_aggregated.total_minutes) or '0m',
            'user_stats': user_stats
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
