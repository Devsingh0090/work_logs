
from flask import Flask, request, jsonify, session, render_template, redirect
from flask_cors import CORS
from config import Config
from models_clean import db, Operator, StudentEmployee, WorkEntry, Project, Holiday, CompanyExpense
from sqlalchemy import func, or_
import datetime

app = Flask(__name__, static_folder='static', static_url_path='/Work_logs/static', template_folder='templates')
app.config.from_object(Config)
app.secret_key = app.config.get('SECRET_KEY', 'sports_complex_secret_key_2025')
CORS(app)
db.init_app(app)

from api.users_api import users_bp
from api.company_details import company_api
from api.projects import projects_api
from api.work_entries_api import work_entries_api
from api.work_types import work_types_api
from api.modules import modules_api
from api.meetings import bp as meetings_api
from api.issues import bp as issues_api
from api.holidays import bp as holidays_api
from api.tea_coffee import bp as tea_coffee_api
from api.tea_coffee_price import bp as tea_coffee_price_api
from api.company_expense import bp as company_expense_api
from api.reports_work_entries import reports_work_entries
from api.reports_meetings import reports_meetings
from api.reports_issues import reports_issues
from api.reports_tea_coffee import reports_tea_coffee

app.register_blueprint(users_bp)
app.register_blueprint(company_api)
app.register_blueprint(projects_api)
app.register_blueprint(work_entries_api)
app.register_blueprint(work_types_api)
app.register_blueprint(modules_api)
app.register_blueprint(meetings_api)
app.register_blueprint(issues_api)
app.register_blueprint(holidays_api)
app.register_blueprint(tea_coffee_api)
app.register_blueprint(tea_coffee_price_api)
app.register_blueprint(company_expense_api)
app.register_blueprint(reports_work_entries)
app.register_blueprint(reports_meetings)
app.register_blueprint(reports_issues)
app.register_blueprint(reports_tea_coffee)

# Try to initialize DB tables but surface any errors clearly
with app.app_context():
    try:
        db.create_all()
        # Runtime migration: ensure `duration_minutes` exists on `work_entries`.
        try:
            from sqlalchemy import inspect, text
            inspector = inspect(db.engine)
            if inspector.has_table('work_entries'):
                cols = [c['name'] for c in inspector.get_columns('work_entries')]
                if 'duration_minutes' not in cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text('ALTER TABLE work_entries ADD COLUMN duration_minutes INT NULL'))
                            conn.commit()
                        print('[MIGRATE] Added missing column `duration_minutes` to `work_entries`.')
                    except Exception:
                        import traceback as _tb
                        _tb.print_exc()
                if 'project_id' not in cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text('ALTER TABLE work_entries ADD COLUMN project_id INT NULL'))
                            conn.commit()
                        print('[MIGRATE] Added missing column `project_id` to `work_entries`.')
                    except Exception:
                        import traceback as _tb2
                        _tb2.print_exc()
                if 'module' not in cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text("ALTER TABLE work_entries ADD COLUMN module VARCHAR(255) NULL"))
                            conn.commit()
                        print('[MIGRATE] Added missing column `module` to `work_entries`.')
                    except Exception:
                        import traceback as _tb5
                        _tb5.print_exc()
            # Ensure work_types has 'modules' column and modules table exists
            if inspector.has_table('work_types'):
                wt_cols = [c['name'] for c in inspector.get_columns('work_types')]
                if 'modules' not in wt_cols:
                    try:
                        with db.engine.connect() as conn:
                            conn.execute(text('ALTER TABLE work_types ADD COLUMN modules TEXT NULL'))
                            conn.commit()
                        print('[MIGRATE] Added missing column `modules` to `work_types`.')
                    except Exception:
                        import traceback as _tb3
                        _tb3.print_exc()

            # Create normalized `modules` table if it does not exist (no FK to avoid strict dependency)
            if not inspector.has_table('modules'):
                try:
                    with db.engine.connect() as conn:
                        conn.execute(text(
                            """
                            CREATE TABLE IF NOT EXISTS modules (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              work_type_id INT NOT NULL,
                              name VARCHAR(255) NOT NULL,
                              datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
                              operation VARCHAR(50) DEFAULT 'Add',
                              INDEX (`work_type_id`)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                            """
                        ))
                        conn.commit()
                    print('[MIGRATE] Created `modules` table.')
                except Exception:
                    import traceback as _tb4
                    _tb4.print_exc()
                # create meetings table if missing
            if not inspector.has_table('meetings'):
                try:
                    with db.engine.connect() as conn:
                        conn.execute(text(
                            """
                            CREATE TABLE IF NOT EXISTS meetings (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              meeting_type VARCHAR(50) NOT NULL,
                              meeting_date DATE NOT NULL,
                              project_id INT NULL,
                              discussion_summary VARCHAR(2000) NOT NULL,
                              action_points VARCHAR(2000) NULL,
                              duration_minutes INT NULL,
                              logged_user VARCHAR(100) NULL,
                              datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
                              operation VARCHAR(50) DEFAULT 'Add',
                              INDEX (`meeting_date`)
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                            """
                        ))
                        conn.commit()
                    print('[MIGRATE] Created `meetings` table.')
                except Exception:
                    import traceback as _tb_meet
                    _tb_meet.print_exc()
            # create issues table if missing
            if not inspector.has_table('issues'):
                try:
                    with db.engine.connect() as conn:
                        conn.execute(text(
                            """
                            CREATE TABLE IF NOT EXISTS issues (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              project_id INT NULL,
                              date DATE NOT NULL,
                              problem_description VARCHAR(2000) NOT NULL,
                              responsible_persons VARCHAR(1000) NULL,
                              solved_persons VARCHAR(1000) NULL,
                              start_time VARCHAR(20) NULL,
                              deadline DATE NULL,
                              status VARCHAR(50) DEFAULT 'pending',
                              logged_user VARCHAR(100) NULL,
                              datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
                              operation VARCHAR(50) DEFAULT 'Add'
                            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
                            """
                        ))
                        conn.commit()
                    print('[MIGRATE] Created `issues` table.')
                except Exception:
                    import traceback as _tb_iss
                    _tb_iss.print_exc()
            # ensure `deadline` column is DATETIME so time component is preserved
            try:
                if inspector.has_table('issues'):
                    cols = {c['name']: c for c in inspector.get_columns('issues')}
                    if 'deadline' in cols:
                        # attempt to modify to DATETIME (no-op if already datetime)
                        try:
                            with db.engine.connect() as conn:
                                conn.execute(text('ALTER TABLE issues MODIFY COLUMN deadline DATETIME NULL'))
                                conn.commit()
                            print('[MIGRATE] Ensured `issues.deadline` is DATETIME.')
                        except Exception:
                            pass
            except Exception:
                pass
        except Exception:
            # don't block app startup for inspect/alter failures
            pass
    except Exception as e:
        import traceback, sys
        traceback.print_exc()
        print('\n[ERROR] Failed to initialize database tables.\nPlease confirm MySQL is running, credentials in config.py are correct, and required drivers are installed (pymysql).\n')
        # Do not re-raise; allow server to start so user can see errors in console and debug further


@app.route('/Work_logs/api/dashboard_summary', methods=['GET'])
def get_dashboard_summary():
    """Consolidated endpoint for dashboard data to reduce multi-request latency."""
    try:
        op_id = session.get('operator_id') or session.get('user_id')
        if not op_id:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
            
        op = Operator.query.filter((Operator.operator_id == str(op_id)) | (Operator.id == op_id)).first()
        if not op:
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        is_super = op.role in ['Admin', 'Superuser']
        
        # 1. Projects Count
        p_query = Project.query.filter(Project.operation != 'delete')
        if not is_super:
            p_query = p_query.filter(or_(
                Project.assigned_employees.like(f'%{op.operator_id}%'),
                Project.logged_user == op.operator_id
            ))
        total_projects = p_query.count()
        
        # 2. Key Metrics (DB Aggregation)
        # Base filter for work entries
        w_filters = [WorkEntry.operation != 'delete']
        if not is_super:
            w_filters.append(WorkEntry.logged_user == op.operator_id)
            
        # Total Minutes
        total_minutes = db.session.query(func.sum(WorkEntry.duration_minutes))\
            .filter(*w_filters).scalar() or 0
            
        # Total Days (Distinct Dates)
        total_days = db.session.query(func.count(func.distinct(WorkEntry.date)))\
            .filter(*w_filters).scalar() or 0
            
        # Today's Minutes
        today_val = datetime.date.today()
        today_minutes = db.session.query(func.sum(WorkEntry.duration_minutes))\
            .filter(*w_filters, WorkEntry.date == today_val).scalar() or 0
        
        # 3. Recent Activities (Fetch only 5)
        recent = WorkEntry.query.filter(*w_filters)\
            .order_by(WorkEntry.date.desc(), WorkEntry.datetime.desc())\
            .limit(5).all()
        
        # 4. Holidays (Next 30 Days)
        now = datetime.date.today()
        later = now + datetime.timedelta(days=30)
        upcoming_holidays = Holiday.query.filter(Holiday.date >= now, Holiday.date <= later).order_by(Holiday.date).all()

        # 5. Project Work Distribution (Group By)
        # Fetch relevant projects first
        assigned_projects = p_query.all()
        project_map = {p.id: p.project_name for p in assigned_projects}
        
        # Aggregate stats from DB directly
        dist_query = db.session.query(WorkEntry.project_id, func.sum(WorkEntry.duration_minutes))\
            .filter(*w_filters)\
            .group_by(WorkEntry.project_id).all()
            
        project_work = {name: 0 for name in project_map.values()}
        for pid, mins in dist_query:
            if pid in project_map:
                project_work[project_map[pid]] = (mins or 0)

        return jsonify({
            'success': True,
            'stats': {
                'projects': total_projects,
                'total_days': total_days,
                'total_minutes': int(total_minutes),
                'today_minutes': int(today_minutes)
            },
            'recent_work': [e.to_dict() for e in recent],
            'holidays': [h.to_dict() for h in upcoming_holidays],
            'project_distribution': project_work,
            'is_super': is_super
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/Work_logs/api/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email') or data.get('username')
    password = data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400

    operator = Operator.query.filter_by(email=email).first()
    if not operator:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if operator.password and operator.password.strip() == password.strip():
        session['logged_in'] = True
        session['user_id'] = operator.operator_id
        session['operator_id'] = operator.operator_id
        session['role'] = operator.role
        session['user_email'] = operator.email
        return jsonify({'success': True, 'message': 'Login successful', 'user': {
            'id': operator.id,
            'operator_id': operator.operator_id,
            'name': operator.name,
            'email': operator.email,
            'role': operator.role
        }})

    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401


@app.route('/Work_logs/api/users', methods=['POST'])
def add_user():
    data = request.get_json() or {}
    user_type = data.get('type', 'operator')

    if user_type == 'operator':
        operator_id = data.get('operator_id')
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'user')
        if not all([operator_id, name, email, password]):
            return jsonify({'success': False, 'message': 'Missing fields for operator'}), 400

        exists = Operator.query.filter((Operator.operator_id == operator_id) | (Operator.email == email)).first()
        if exists:
            return jsonify({'success': False, 'message': 'Operator already exists'}), 409

        op = Operator(operator_id=operator_id, name=name, email=email, password=password, role=role)
        db.session.add(op)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Operator added', 'operator_id': operator_id}), 201

    


@app.route('/Work_logs/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out'})

# Serve login page (frontend)
@app.route('/Work_logs/')
def serve_login_root():
    return render_template('login.html')


@app.route('/Work_logs/login')
def serve_login():
    return render_template('login.html')


@app.route('/Work_logs/login.html')
def serve_login_with_ext():
    return render_template('login.html')


@app.route('/Work_logs/index')
def serve_index():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('index.html')


@app.route('/Work_logs/index.html')
def serve_index_with_ext():
    return render_template('index.html')


@app.route('/Work_logs/admin_dashboard')
def serve_admin_dashboard():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('admin_dashboard.html')


@app.route('/Work_logs/admin_dashboard.html')
def serve_admin_dashboard_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('admin_dashboard.html')


@app.route('/Work_logs/operator_details')
def serve_operator_details():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('operator_details.html')


@app.route('/Work_logs/operator_details.html')
def serve_operator_details_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('operator_details.html')


@app.route('/Work_logs/student_employee')
def serve_student_employee():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('student_employee.html')



@app.route('/Work_logs/company_details')
def serve_company_details():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('company_details.html')


@app.route('/Work_logs/company_details.html')
def serve_company_details_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('company_details.html')


@app.route('/Work_logs/projects')
def serve_projects():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('projects.html')


@app.route('/Work_logs/projects.html')
def serve_projects_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('projects.html')


@app.route('/Work_logs/work_entries')
def serve_work_entries():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('work_entries.html')


@app.route('/Work_logs/work_entries.html')
def serve_work_entries_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('work_entries.html')


@app.route('/Work_logs/meetings')
def serve_meetings():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('meetings.html')


@app.route('/Work_logs/meetings.html')
def serve_meetings_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('meetings.html')


@app.route('/Work_logs/issues')
def serve_issues():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('issues.html')


@app.route('/Work_logs/issues.html')
def serve_issues_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('issues.html')


@app.route('/Work_logs/holidays')
def serve_holidays():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('holidays.html')


@app.route('/Work_logs/holidays.html')
def serve_holidays_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('holidays.html')


@app.route('/Work_logs/tea_coffee')
def serve_tea_coffee():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('tea_coffee.html')


@app.route('/Work_logs/tea_coffee.html')
def serve_tea_coffee_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('tea_coffee.html')


@app.route('/Work_logs/company_expense')
def serve_company_expense():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('company_expense.html')


@app.route('/Work_logs/company_expense.html')
def serve_company_expense_with_ext():
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('company_expense.html')


@app.route('/Work_logs/reports/work_entries')
def serve_reports_work_entries():
    print('[ROUTE] /Work_logs/reports/work_entries accessed')
    if not session.get('logged_in'):
        print('[ROUTE] User not logged in, redirecting to login')
        return redirect('/Work_logs/login')
    print('[ROUTE] Rendering reports_work_entries.html')
    return render_template('reports_work_entries.html')


@app.route('/Work_logs/reports/work_entries.html')
def serve_reports_work_entries_with_ext():
    print('[ROUTE] /Work_logs/reports/work_entries.html accessed')
    if not session.get('logged_in'):
        print('[ROUTE] User not logged in, redirecting to login')
        return redirect('/Work_logs/login')
    print('[ROUTE] Rendering reports_work_entries.html')
    return render_template('reports_work_entries.html')


@app.route('/Work_logs/reports/issues')
def serve_reports_issues():
    print('[ROUTE] /Work_logs/reports/issues accessed')
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('reports_issues.html')


@app.route('/Work_logs/reports/issues.html')
def serve_reports_issues_with_ext():
    print('[ROUTE] /Work_logs/reports/issues.html accessed')
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('reports_issues.html')


@app.route('/Work_logs/reports/tea_coffee')
def serve_reports_tea_coffee():
    print('[ROUTE] /Work_logs/reports/tea_coffee accessed')
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('reports_tea_coffee.html')


@app.route('/Work_logs/reports/tea_coffee.html')
def serve_reports_tea_coffee_with_ext():
    print('[ROUTE] /Work_logs/reports/tea_coffee.html accessed')
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('reports_tea_coffee.html')


@app.route('/Work_logs/reports/company_expense')
def serve_reports_company_expense():
    print('[ROUTE] /Work_logs/reports/company_expense accessed')
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('reports_company_expense.html')


@app.route('/Work_logs/reports/company_expense.html')
def serve_reports_company_expense_with_ext():
    print('[ROUTE] /Work_logs/reports/company_expense.html accessed')
    if not session.get('logged_in'):
        return redirect('/Work_logs/login')
    return render_template('reports_company_expense.html')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8305)

