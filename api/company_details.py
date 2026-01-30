

from flask import Blueprint, request, jsonify, session
from models_clean import db, CompanyDetails, now_ist

company_api = Blueprint('company_api', __name__, url_prefix='/Work_logs/api')

@company_api.route('/companies', methods=['GET'])
def get_companies():
    try:
        companies = CompanyDetails.query.filter(CompanyDetails.operation != 'delete').all()
        return jsonify([c.to_dict() for c in companies])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@company_api.route('/companies/<int:company_id>', methods=['GET'])
def get_company(company_id):
    company = CompanyDetails.query.get(company_id)
    if company:
        return jsonify(company.to_dict())
    return jsonify({'error': 'Company not found'}), 404


@company_api.route('/companies', methods=['POST'])
def add_company():
    data = request.get_json() or {}
    if not data.get('company_name'):
        return jsonify({'error': 'company_name is required'}), 400
    company = CompanyDetails(
        company_name=data.get('company_name'),
        address=data.get('address'),
        contact_no=data.get('contact_no'),
        email=data.get('email'),
        web_url=data.get('web_url'),
        city=data.get('city'),
        state=data.get('state'),
        logged_user=session.get('operator_id') or session.get('user_id') or None,
        datetime=now_ist(),
        operation=data.get('operation', 'Add')
    )
    db.session.add(company)
    db.session.commit()
    return jsonify(company.to_dict()), 201


@company_api.route('/companies/<int:company_id>', methods=['PUT'])
def update_company(company_id):
    company = CompanyDetails.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    data = request.get_json() or {}
    for field in ['company_name', 'address', 'city', 'state', 'contact_no', 'email', 'web_url']:
        if field in data:
            setattr(company, field, data[field])
    company.logged_user = session.get('operator_id') or session.get('user_id') or None
    company.datetime = now_ist()
    company.operation = data.get('operation', 'Update')
    db.session.commit()
    return jsonify(company.to_dict())


@company_api.route('/companies/<int:company_id>', methods=['DELETE'])
def delete_company(company_id):
    company = CompanyDetails.query.get(company_id)
    if not company:
        return jsonify({'error': 'Company not found'}), 404
    company.operation = 'delete'
    company.logged_user = session.get('operator_id') or session.get('user_id') or None
    company.datetime = now_ist()
    db.session.commit()
    return jsonify({'message': 'Company marked as deleted'})
